import { describe, expect, it } from 'vitest';
import { reconcileText } from '../src/gitignore/reconcile.ts';

const doc = (stacks: string, body = ''): string =>
  `# region gitignore-sync\n# stacks: ${stacks}\n${body}\n# endregion\n`;

describe('reconcile', () => {
  it('rescues a hand-written line instead of dropping it', () => {
    const result = reconcileText(
      doc('core', '\n# region core@v1\n.DS_Store\n.env.local\n# endregion\n')
    );
    expect(result.rescued).toEqual(['.env.local']);
    expect(result.document.freeZone).toContain('.env.local');
  });

  it('removes an exact duplicate from the free zone', () => {
    const result = reconcileText(`${doc('core')}\nfrankenphp\nfrankenphp\n`);
    expect(result.duplicates).toEqual(['frankenphp']);
    expect(result.document.freeZone).toEqual(['frankenphp']);
  });

  it('removes a free-zone line a managed block already covers', () => {
    const result = reconcileText(`${doc('core')}\n.DS_Store\n`);
    expect(result.covered).toEqual(['.DS_Store']);
    expect(result.document.freeZone).toEqual([]);
  });

  it('reports .idea/* against a bare .idea — the directory form git needs', () => {
    const result = reconcileText(`${doc('core, intellij')}\n.idea\n`);
    expect(result.equivalences).toEqual([
      { key: '.idea', spellings: ['.idea/*', '.idea'] }
    ]);
    expect(result.document.freeZone).toEqual(['.idea']);
  });

  it('reports equivalent spellings but never merges them', () => {
    const result = reconcileText(`${doc('core')}\n.idea\n.idea/\n/.idea\n`);
    expect(result.equivalences).toEqual([
      { key: '.idea', spellings: ['.idea', '.idea/', '/.idea'] }
    ]);
    expect(result.document.freeZone).toEqual(['.idea', '.idea/', '/.idea']);
  });

  it('keeps duplicate comments — a comment is structure, not a pattern', () => {
    const result = reconcileText(`${doc('core')}\n# note\na\n\n# note\nb\n`);
    expect(result.document.freeZone.filter((l) => l === '# note')).toHaveLength(
      2
    );
  });

  it('drops a heading whose every pattern a managed block absorbed', () => {
    const result = reconcileText(
      `${doc('core, node')}\n# Node\nnode_modules\ndist\n\n# Mine\nfrankenphp\n`
    );
    expect(result.orphanedComments).toEqual(['# Node']);
    expect(result.document.freeZone).toEqual(['# Mine', 'frankenphp']);
  });

  it('keeps a heading whose block still has a pattern', () => {
    const result = reconcileText(
      `${doc('core, node')}\n# Build\ndist\nbuild/\n`
    );
    expect(result.orphanedComments).toEqual([]);
    expect(result.document.freeZone).toEqual(['# Build', 'build/']);
  });

  it('keeps a block that was only ever a note', () => {
    const result = reconcileText(`${doc('core')}\n# just a note\n`);
    expect(result.orphanedComments).toEqual([]);
    expect(result.document.freeZone).toEqual(['# just a note']);
  });

  it("warns when a bare directory line kills a block's ! exceptions", () => {
    const result = reconcileText(`${doc('core, vscode')}\n.vscode\n`);
    expect(result.smothered).toEqual([
      {
        line: '.vscode',
        exceptions: [
          '!.vscode/extensions.json',
          '!.vscode/settings.json',
          '!.vscode/mcp.json'
        ]
      }
    ]);
  });

  it('does not warn when the block carves out no exceptions', () => {
    const result = reconcileText(`${doc('core, intellij')}\n.idea\n`);
    expect(result.smothered).toEqual([]);
  });

  it('does not also report equivalence for a line it flagged as smothering', () => {
    const result = reconcileText(`${doc('core, vscode')}\n.vscode\n`);
    expect(result.smothered.map((s) => s.line)).toEqual(['.vscode']);
    expect(result.equivalences).toEqual([]);
  });

  it('flags every spelling that blocks the directory, anchored or not', () => {
    const result = reconcileText(`${doc('core, vscode')}\n.vscode\n/.vscode\n`);
    expect(result.smothered.map((s) => s.line)).toEqual([
      '.vscode',
      '/.vscode'
    ]);
    expect(result.equivalences).toEqual([]);
  });

  it("still reports the other spellings in a smothered line's group", () => {
    // `.vscode/**` matches inside the directory rather than blocking it, so it
    // is only an equivalent spelling — the smothering line beside it is not.
    const result = reconcileText(
      `${doc('core, vscode')}\n.vscode\n.vscode/**\n`
    );
    expect(result.smothered.map((s) => s.line)).toEqual(['.vscode']);
    expect(result.equivalences).toEqual([
      { key: '.vscode', spellings: ['.vscode/*', '.vscode/**'] }
    ]);
  });

  it('reports a stack the binary ships no template for', () => {
    const result = reconcileText(doc('core, deno'));
    expect(result.unknownStacks).toEqual(['deno']);
  });

  it('renders sections in the order the header declares them', () => {
    const result = reconcileText(doc('node, core'));
    expect(result.document.sections.map((s) => s.stack)).toEqual([
      'node',
      'core'
    ]);
  });

  it('drops a section the header no longer declares', () => {
    const result = reconcileText(
      doc('core', '\n# region node@v1\nnode_modules\n# endregion\n')
    );
    expect(result.document.sections.map((s) => s.stack)).toEqual(['core']);
    expect(result.document.freeZone).toEqual([]);
  });
});
