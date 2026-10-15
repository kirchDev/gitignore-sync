#!/usr/bin/env node

/**
 * Packages the CLI as a single executable for the platform this runs on.
 *
 * The mechanism is node's own: `--experimental-sea-config` writes a
 * preparation blob, postject injects it into a copy of the node binary, and
 * the result is a file with no runtime to install next to it.
 *
 * Two details are not cosmetic, and cost a SIGSEGV each when missed:
 *
 *   - **`--macho-segment-name NODE_SEA` on darwin.** Without it the injection
 *     reports success, the binary runs, and it segfaults before reaching the
 *     entry point.
 *   - **A CommonJS entry.** Node's embedder runs the main script as CJS, so an
 *     ESM bundle dies with "Cannot use import statement outside a module".
 *     `dist/sea/entry.cjs` exists for that alone — see `vite.sea.config.ts`.
 *
 * The embedded runtime is whatever node runs this script, so a release carries
 * the version CI resolved from `.nvmrc` instead of a second pin that could
 * drift from it.
 *
 * There is no cross-compilation to be had: a single executable *is* the target
 * platform's node binary with a blob inside it. The release workflow runs this
 * once per platform, on a runner of that platform.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seaDir = join(root, 'dist', 'sea');
const outDir = join(root, 'dist', 'release');
const binName = 'gitignore-sync';

/** postject's default, and the string node looks for inside the binary. */
const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

const run = (file: string, args: string[]): void => {
  execFileSync(file, args, { stdio: 'inherit' });
};

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  version: string;
};

const { platform, arch } = process;
if (platform !== 'darwin' && platform !== 'linux') {
  console.error(`No single executable is built for ${platform}.`);
  process.exit(1);
}
if (arch !== 'arm64' && arch !== 'x64') {
  console.error(`No single executable is built for ${arch}.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const config = join(seaDir, 'sea-config.json');
const blob = join(seaDir, 'prep.blob');
writeFileSync(
  config,
  `${JSON.stringify(
    {
      main: join(seaDir, 'entry.cjs'),
      output: blob,
      disableExperimentalSEAWarning: true
    },
    null,
    2
  )}\n`,
  'utf8'
);
run(process.execPath, ['--experimental-sea-config', config]);

const binary = join(outDir, binName);
copyFileSync(process.execPath, binary);

const inject = [binary, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', FUSE];
if (platform === 'darwin') inject.push('--macho-segment-name', 'NODE_SEA');
run(join(root, 'node_modules', '.bin', 'postject'), inject);

// Injecting bytes invalidates the signature the node binary shipped with, and
// macOS refuses to run an arm64 binary whose signature no longer matches.
// Ad-hoc is enough for a tarball: nothing here is notarised or distributed
// through the App Store.
if (platform === 'darwin') {
  run('codesign', ['--remove-signature', binary]);
  run('codesign', ['--sign', '-', binary]);
}

// The binary has to answer before it is packaged. This is the check that would
// have caught both mistakes in the comment at the top.
const reported = execFileSync(binary, ['--version'], {
  encoding: 'utf8'
}).trim();
if (reported !== pkg.version) {
  console.error(`The binary reports ${reported}, expected ${pkg.version}.`);
  process.exit(1);
}

const archive = `${binName}_${pkg.version}_${platform}_${arch}.tar.gz`;
run('tar', ['-czf', join(outDir, archive), '-C', outDir, binName]);

const sha = createHash('sha256')
  .update(readFileSync(join(outDir, archive)))
  .digest('hex');
writeFileSync(
  join(outDir, `${archive}.sha256`),
  `${sha}  ${archive}\n`,
  'utf8'
);

console.log(`Wrote ${archive}`);
console.log(`sha256 ${sha}`);
