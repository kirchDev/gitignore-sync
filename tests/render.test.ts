import { describe, expect, it } from 'vitest';
import { parse } from '../src/gitignore/parse.ts';
import { render } from '../src/gitignore/render.ts';

describe('render', () => {
  it('emits nothing for an empty document', () => {
    expect(render(parse(''))).toBe('');
  });

  it('emits only the free zone when there is no region', () => {
    expect(render(parse('node_modules\n'))).toBe('node_modules\n');
  });

  it('round-trips a document parse produced', () => {
    const text =
      '# region gitignore-sync\n# stacks: core\n\n# region core@v1\n.DS_Store\n# endregion\n\n# endregion\n\nfrankenphp\n';
    expect(render(parse(text))).toBe(text);
  });

  it('always terminates with a newline', () => {
    expect(render(parse('a'))).toBe('a\n');
  });
});
