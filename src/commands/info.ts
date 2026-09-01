import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { defineCommand } from 'citty';
import { colors } from 'consola/utils';
import { dirname, join, resolve } from 'pathe';
import { parse, readStacks } from '../gitignore/parse.ts';
import { reconcile } from '../gitignore/reconcile.ts';
import { render } from '../gitignore/render.ts';
import { gitignorePath, readGitignore } from '../io.ts';
import { currentTemplate, stackOrder } from '../templates/index.ts';

// Injected at build time by vite's `define`, sourced from package.json's
// version. Read it the same way `cli.ts` does rather than re-inventing a
// drift-prone literal.
declare const __APP_VERSION__: string;

/** The package.json `name` this build is identified by. */
const PACKAGE_NAME = '@kirchdev/gitignore-sync';
/** What a person types, and what the report is headed with. */
const BIN_NAME = 'gitignore-sync';

/** `linked` = runs from a git work tree; `release` = an installed package. */
type BuildKind = 'linked' | 'release' | 'unknown';

type Info = {
  version: string;
  build: { kind: BuildKind; packageRoot: string | null; reason: string };
  binary: { invoked: string | null; resolved: string | null };
  node: string;
  templates: { stacks: number; patterns: number };
  repository: {
    file: string;
    exists: boolean;
    hasRegion: boolean;
    stacks: string[];
    /** `in sync`, `drifted`, `no region`, or the parse error. */
    status: string;
  };
};

/** Resolve the real executed file behind any shim or symlink. */
function resolveBinary(entry: string | undefined): Info['binary'] {
  if (!entry) return { invoked: null, resolved: null };
  try {
    return { invoked: entry, resolved: realpathSync(entry) };
  } catch {
    // The file vanished or is unreadable — report the invoked path as-is
    // rather than failing. `info` describes, it never judges.
    return { invoked: entry, resolved: entry };
  }
}

/** Walk up from `start` to the nearest package.json, returning its dir + name. */
function findPackageRoot(
  start: string
): { dir: string; name: string | undefined } | null {
  let dir = resolve(start);
  for (;;) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
          name?: string;
        };
        return { dir, name: pkg.name };
      } catch {
        return { dir, name: undefined };
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Tell a linked dev build from an installed release: the resolved binary lives
 * inside a git work tree whose package.json carries this package's name. When
 * neither can be established, report `unknown` rather than guessing.
 */
function detectBuild(resolved: string | null): Info['build'] {
  if (!resolved) {
    return {
      kind: 'unknown',
      packageRoot: null,
      reason: 'binary path could not be resolved'
    };
  }
  const pkg = findPackageRoot(dirname(resolved));
  if (!pkg) {
    return {
      kind: 'unknown',
      packageRoot: null,
      reason: 'no package.json found above the binary'
    };
  }
  if (pkg.name !== PACKAGE_NAME) {
    return {
      kind: 'unknown',
      packageRoot: pkg.dir,
      reason: `nearest package.json is "${pkg.name ?? 'unnamed'}", not ${PACKAGE_NAME}`
    };
  }
  // Check `.git` at the package root only, never above it: an installed copy
  // under a consumer's node_modules would otherwise inherit that repo's .git
  // and be mislabelled as linked.
  const inGitTree = existsSync(join(pkg.dir, '.git'));
  return {
    kind: inGitTree ? 'linked' : 'release',
    packageRoot: pkg.dir,
    reason: inGitTree
      ? `runs from a git work tree named ${PACKAGE_NAME}`
      : `installed ${PACKAGE_NAME} package (no git work tree beside it)`
  };
}

function inspectRepository(dir: string): Info['repository'] {
  const file = gitignorePath(dir);
  const exists = existsSync(file);
  if (!exists) {
    return { file, exists, hasRegion: false, stacks: [], status: 'no file' };
  }
  const text = readGitignore(dir);
  try {
    const doc = parse(text);
    if (!doc.hasRegion) {
      return {
        file,
        exists,
        hasRegion: false,
        stacks: [],
        status: 'no region'
      };
    }
    const result = reconcile(doc);
    return {
      file,
      exists,
      hasRegion: true,
      stacks: readStacks(doc),
      status: render(result.document) === text ? 'in sync' : 'drifted'
    };
  } catch (error) {
    // A file this binary cannot parse is still worth describing.
    return {
      file,
      exists,
      hasRegion: false,
      stacks: [],
      status: (error as Error).message
    };
  }
}

const BUILD_LABELS: Record<BuildKind, string> = {
  linked: 'linked / dev build',
  release: 'installed release',
  unknown: 'unknown'
};

const row = (label: string, value: string): string =>
  `  ${colors.dim(label.padEnd(9))} ${value}\n`;

function renderPretty(info: Info): string {
  let out = `${colors.bold(BIN_NAME)} ${colors.cyan(`v${info.version}`)} ${colors.dim(`(${BUILD_LABELS[info.build.kind]})`)}\n`;
  out += row('build', colors.dim(info.build.reason));
  if (info.build.packageRoot) out += row('package', info.build.packageRoot);
  out += row('binary', info.binary.resolved ?? colors.dim('unknown'));
  if (info.binary.invoked && info.binary.invoked !== info.binary.resolved) {
    out += row('', colors.dim(`via ${info.binary.invoked}`));
  }
  out += row('node', info.node);

  out += `\n${colors.bold('templates')}\n`;
  out += row(
    'ships',
    `${info.templates.stacks} stacks, ${info.templates.patterns} patterns`
  );

  out += `\n${colors.bold('repository')}\n`;
  out += row('file', info.repository.file);
  const status =
    info.repository.status === 'in sync'
      ? colors.green(info.repository.status)
      : info.repository.status === 'drifted'
        ? colors.yellow(info.repository.status)
        : colors.dim(info.repository.status);
  out += row('status', status);
  if (info.repository.stacks.length > 0) {
    out += row(
      'stacks',
      info.repository.stacks.map((s) => colors.cyan(s)).join(', ')
    );
  }
  return out;
}

export const infoCommand = defineCommand({
  meta: {
    name: 'info',
    description:
      'Describe this installation: version, how it was installed, and the repo it sees'
  },
  args: {
    dir: {
      type: 'positional',
      description: 'Repository directory (default: the current one)',
      required: false,
      default: '.'
    },
    json: {
      type: 'boolean',
      description: 'Emit a machine-readable JSON report',
      default: false
    }
  },
  run({ args }) {
    const binary = resolveBinary(process.argv[1]);
    const info: Info = {
      version: __APP_VERSION__,
      build: detectBuild(binary.resolved),
      binary,
      node: process.version,
      templates: {
        stacks: stackOrder().length,
        patterns: stackOrder().reduce(
          (n, s) => n + (currentTemplate(s)?.lines.length ?? 0),
          0
        )
      },
      repository: inspectRepository(args.dir)
    };

    if (args.json) {
      process.stdout.write(`${JSON.stringify(info, null, 2)}\n`);
      return;
    }
    process.stdout.write(renderPretty(info));
  }
});

export const __test = { resolveBinary, findPackageRoot, detectBuild };
