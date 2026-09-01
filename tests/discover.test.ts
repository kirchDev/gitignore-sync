import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findGitignores,
  ignoredDirectories,
  isDirectoryKeeper,
  skipDirectories
} from '../src/discover.ts';

const fresh = (): string => mkdtempSync(join(tmpdir(), 'gis-'));

const write = (root: string, rel: string, text: string): void => {
  const dir = join(root, rel);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '.gitignore'), text);
};

const kinds = (root: string, recursive = true): Record<string, string> =>
  Object.fromEntries(
    findGitignores(root, { recursive }).map((f) => [f.relative, f.kind])
  );

describe('isDirectoryKeeper', () => {
  it('recognises the ignore-all-but-myself idiom', () => {
    expect(isDirectoryKeeper('*\n!.gitignore\n')).toBe(true);
  });

  it('recognises it with extra exceptions beside it', () => {
    expect(isDirectoryKeeper('*\n!.gitignore\n!logo.png\n')).toBe(true);
  });

  it('is not fooled by a file that only ignores everything', () => {
    expect(isDirectoryKeeper('*\n')).toBe(false);
  });

  it('is not fooled by an ordinary .gitignore', () => {
    expect(isDirectoryKeeper('node_modules\n*.log\n')).toBe(false);
  });

  it('ignores comments and blank lines when deciding', () => {
    expect(isDirectoryKeeper('# keep this dir\n\n*\n\n!.gitignore\n')).toBe(
      true
    );
  });

  it('says no to an empty file', () => {
    expect(isDirectoryKeeper('')).toBe(false);
  });
});

describe('skipDirectories', () => {
  it('derives the dependency and build directories from the templates', () => {
    const skip = skipDirectories();
    for (const dir of ['node_modules', 'vendor', 'dist', 'coverage', '.git']) {
      expect(skip).toContain(dir);
    }
  });

  // Taking the last segment of `/public/build` would skip every `build/`, and
  // of `/public/storage` every `storage/` — including the stubs a scan should
  // find and label.
  it('never turns a path pattern into a bare directory name', () => {
    const skip = skipDirectories();
    for (const dir of ['storage', 'build', 'hot', 'ssr', 'schemas']) {
      expect(skip).not.toContain(dir);
    }
  });
});

describe('ignoredDirectories', () => {
  it('reads plain directory names out of a .gitignore', () => {
    const skip = ignoredDirectories('node_modules\n/.stryker-tmp/\ndist\n');
    expect([...skip].sort()).toEqual(['.stryker-tmp', 'dist', 'node_modules']);
  });

  it('leaves globs, negations, comments and paths alone', () => {
    const skip = ignoredDirectories(
      '# a note\n*.log\n!keep\n/public/build\n[Dd]esktop.ini\n'
    );
    expect([...skip]).toEqual([]);
  });
});

describe('findGitignores', () => {
  it('returns only the root file when not recursive', () => {
    const root = fresh();
    write(root, '.', 'node_modules\n');
    write(root, 'apps/web', 'dist\n');
    expect(kinds(root, false)).toEqual({ '.gitignore': 'plain' });
  });

  it('labels a managed region', () => {
    const root = fresh();
    write(root, '.', '# region gitignore-sync\n# stacks: core\n# endregion\n');
    expect(kinds(root)['.gitignore']).toBe('managed');
  });

  it('labels a directory keeper by its content, wherever it sits', () => {
    const root = fresh();
    write(root, '.', 'node_modules\n');
    write(root, 'some/deep/place', '*\n!.gitignore\n');
    expect(kinds(root)['some/deep/place/.gitignore']).toBe('keeper');
  });

  it('labels a framework stub by its path, nested or not', () => {
    const root = fresh();
    write(root, '.', 'node_modules\n');
    write(root, 'storage/framework', 'compiled.php\nconfig.php\n');
    write(root, 'services/core/storage/framework', 'compiled.php\n');
    const found = kinds(root);
    expect(found['storage/framework/.gitignore']).toBe('framework');
    expect(found['services/core/storage/framework/.gitignore']).toBe(
      'framework'
    );
  });

  it('never descends into dependency or build output', () => {
    const root = fresh();
    write(root, '.', 'node_modules\n');
    write(root, 'node_modules/pkg', 'whatever\n');
    write(root, 'dist', 'whatever\n');
    write(root, 'vendor/lib', 'whatever\n');
    expect(Object.keys(kinds(root))).toEqual(['.gitignore']);
  });

  // A worktree or submodule is a separate repository; its file is not ours.
  it('never descends into a nested repository', () => {
    const root = fresh();
    write(root, '.', 'node_modules\n');
    write(root, 'worktrees/copy', 'node_modules\n');
    mkdirSync(join(root, 'worktrees', 'copy', '.git'), { recursive: true });
    expect(Object.keys(kinds(root))).toEqual(['.gitignore']);
  });

  // A mutation-testing sandbox or any other generated copy: no template knows
  // it, but the repository's own .gitignore does, and that is enough.
  it('never descends into a directory the repo itself ignores', () => {
    const root = fresh();
    write(root, '.', 'node_modules\n/.stryker-tmp/\n');
    write(root, '.stryker-tmp/sandbox-1', 'node_modules\n');
    expect(Object.keys(kinds(root))).toEqual(['.gitignore']);
  });

  it("carries a subdirectory's own ignores down with it", () => {
    const root = fresh();
    write(root, '.', 'node_modules\n');
    write(root, 'apps/web', 'dist\n.generated\n');
    write(root, 'apps/web/.generated/x', 'whatever\n');
    expect(Object.keys(kinds(root))).toEqual([
      '.gitignore',
      'apps/web/.gitignore'
    ]);
  });

  it('finds an ordinary package file in a monorepo', () => {
    const root = fresh();
    write(root, '.', 'node_modules\n');
    write(root, 'apps/web', '.nuxt\n.output\n');
    expect(kinds(root)['apps/web/.gitignore']).toBe('plain');
  });
});
