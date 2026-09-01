import { describe, expect, it } from 'vitest';
import { parse, readStacks, withStacks } from '../src/gitignore/parse.ts';
import { GitignoreParseError, type Document } from '../src/gitignore/types.ts';

const region = (body: string): string =>
  `# region gitignore-sync\n# stacks: core\n${body}\n# endregion\n`;

describe('parse', () => {
  it('reads a file with no region as pure free zone', () => {
    const doc = parse('node_modules\n.DS_Store\n');
    expect(doc.hasRegion).toBe(false);
    expect(doc.header).toEqual([]);
    expect(doc.sections).toEqual([]);
    expect(doc.freeZone).toEqual(['node_modules', '.DS_Store']);
  });

  it('reads the header up to the first section marker', () => {
    const doc = parse(region('\n# region core@v1\n.DS_Store\n# endregion\n'));
    expect(doc.header).toEqual(['# stacks: core']);
    expect(readStacks(doc)).toEqual(['core']);
  });

  it('reads a section with its stack and version', () => {
    const doc = parse(
      region('\n# region node@v1\nnode_modules\n# endregion\n')
    );
    expect(doc.sections).toEqual([
      { stack: 'node', version: 1, lines: ['node_modules'] }
    ]);
  });

  it('keeps free-zone lines before and after the region', () => {
    const doc = parse(`before\n\n${region('')}\nafter\n`);
    expect(doc.freeZone).toEqual(['before', 'after']);
  });

  it('collects a stray line between two sections', () => {
    const doc = parse(
      region(
        '\n# region core@v1\n.DS_Store\n# endregion\n\n.env.local\n\n# region node@v1\nnode_modules\n# endregion\n'
      )
    );
    expect(doc.sections.map((s) => s.stack)).toEqual(['core', 'node']);
    expect(doc.freeZone).toEqual(['.env.local']);
  });

  it('does not mistake a nested foreign region for its own', () => {
    const doc = parse(
      region(
        '\n# region core@v1\n# region other\nx\n# endregion\n# endregion\n'
      )
    );
    expect(doc.sections[0]?.lines).toEqual([
      '# region other',
      'x',
      '# endregion'
    ]);
  });

  it('refuses an unterminated region rather than guess', () => {
    expect(() => parse('# region gitignore-sync\n# stacks: core\n')).toThrow(
      GitignoreParseError
    );
  });

  it('reads an empty stacks declaration as no stacks', () => {
    expect(
      readStacks(parse('# region gitignore-sync\n# stacks:\n# endregion\n'))
    ).toEqual([]);
  });

  it('strips CRLF line endings', () => {
    expect(parse('a\r\nb\r\n').freeZone).toEqual(['a', 'b']);
  });
});

describe('withStacks', () => {
  const doc = (header: string): Document =>
    parse(`# region gitignore-sync\n${header}\n# endregion\n`);

  it('replaces the declaration in place', () => {
    const next = withStacks(doc('# stacks: core'), ['core', 'node']);
    expect(next.header).toEqual(['# stacks: core, node']);
    expect(readStacks(next)).toEqual(['core', 'node']);
  });

  it('adds a declaration to a header that has none', () => {
    const next = withStacks(doc('# just a note'), ['core']);
    expect(next.header).toEqual(['# stacks: core', '# just a note']);
  });

  it('keeps the rest of the header untouched', () => {
    const next = withStacks(doc('# stacks: core\n# ───'), ['node']);
    expect(next.header).toEqual(['# stacks: node', '# ───']);
  });

  it('replaces only the first declaration', () => {
    const next = withStacks(doc('# stacks: core\n# stacks: node'), ['php']);
    expect(next.header).toEqual(['# stacks: php', '# stacks: node']);
  });

  it('writes an empty declaration for no stacks', () => {
    expect(withStacks(doc('# stacks: core'), []).header).toEqual([
      '# stacks: '
    ]);
  });
});
