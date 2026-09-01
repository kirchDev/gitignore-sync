import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIVIDER, stacksLine } from '../src/gitignore/markers.ts';
import { parse } from '../src/gitignore/parse.ts';
import { reconcile } from '../src/gitignore/reconcile.ts';
import { stackOrder } from '../src/templates/index.ts';

/**
 * `audit` is a thin command over this composition; testing the composition
 * pins the number it reports without shelling out to the binary.
 */
const leftovers = (text: string): string[] => {
  const doc = parse(text);
  const result = reconcile({
    ...doc,
    header: [stacksLine(stackOrder()), DIVIDER],
    hasRegion: true
  });
  return result.document.freeZone
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));
};

describe('audit', () => {
  it('reports nothing left for a file the stacks fully cover', () => {
    expect(leftovers('node_modules\ndist\n.DS_Store\n')).toEqual([]);
  });

  it('leaves a project rule standing', () => {
    expect(leftovers('node_modules\nsrc/generated/prisma/\n')).toEqual([
      'src/generated/prisma/'
    ]);
  });

  it('leaves a differently spelled pattern standing, never merged', () => {
    expect(leftovers('.idea\n')).toEqual(['.idea']);
  });

  it('counts an empty file as fully covered', () => {
    expect(leftovers('')).toEqual([]);
  });

  it('does not count comments as patterns', () => {
    expect(leftovers('# a note\nnode_modules\n')).toEqual([]);
  });
});

describe('audit fixture directory', () => {
  it('reads a .gitignore from disk unchanged', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gis-'));
    writeFileSync(join(dir, '.gitignore'), 'node_modules\nmine\n');
    // Audit never writes: the file is untouched afterwards.
    expect(leftovers('node_modules\nmine\n')).toEqual(['mine']);
  });
});
