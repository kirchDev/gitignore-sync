import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { __test } from '../src/commands/info.ts';

const { detectBuild, findPackageRoot, resolveBinary } = __test;

const pkg = (dir: string, name?: string): void => {
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(name === undefined ? {} : { name })
  );
};

describe('info', () => {
  it('reports an unresolvable binary rather than throwing', () => {
    expect(resolveBinary(undefined)).toEqual({ invoked: null, resolved: null });
    const gone = join(tmpdir(), 'gis-not-here', 'bin.mjs');
    expect(resolveBinary(gone)).toEqual({ invoked: gone, resolved: gone });
  });

  it('walks up to the nearest package.json', () => {
    const root = mkdtempSync(join(tmpdir(), 'gis-'));
    pkg(root, 'gitignore-sync');
    const deep = join(root, 'dist', 'bin');
    mkdirSync(deep, { recursive: true });
    expect(findPackageRoot(deep)).toEqual({
      dir: root,
      name: 'gitignore-sync'
    });
  });

  it('calls a git work tree a linked build', () => {
    const root = mkdtempSync(join(tmpdir(), 'gis-'));
    pkg(root, 'gitignore-sync');
    mkdirSync(join(root, '.git'));
    expect(detectBuild(join(root, 'dist', 'bin.mjs')).kind).toBe('linked');
  });

  it('calls the same package without a work tree a release', () => {
    const root = mkdtempSync(join(tmpdir(), 'gis-'));
    pkg(root, 'gitignore-sync');
    expect(detectBuild(join(root, 'dist', 'bin.mjs')).kind).toBe('release');
  });

  // An installed copy under a consumer's node_modules sits inside that repo's
  // git tree. Checking `.git` only at the package root keeps it a release.
  it("does not inherit a consumer repo's .git", () => {
    const consumer = mkdtempSync(join(tmpdir(), 'gis-'));
    mkdirSync(join(consumer, '.git'));
    const installed = join(consumer, 'node_modules', 'gitignore-sync');
    mkdirSync(installed, { recursive: true });
    pkg(installed, 'gitignore-sync');
    expect(detectBuild(join(installed, 'dist', 'bin.mjs')).kind).toBe(
      'release'
    );
  });

  it('reports unknown for a foreign package', () => {
    const root = mkdtempSync(join(tmpdir(), 'gis-'));
    pkg(root, 'something-else');
    const build = detectBuild(join(root, 'bin.mjs'));
    expect(build.kind).toBe('unknown');
    expect(build.reason).toContain('something-else');
  });

  it('reports unknown when nothing can be resolved', () => {
    expect(detectBuild(null).kind).toBe('unknown');
  });
});
