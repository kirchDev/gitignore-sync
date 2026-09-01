import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '../src/gitignore/parse.ts';
import { reconcile } from '../src/gitignore/reconcile.ts';
import { render } from '../src/gitignore/render.ts';

const dir = join(import.meta.dirname, 'fixtures');
const names = readdirSync(dir)
  .filter((f) => f.endsWith('.in'))
  .map((f) => f.slice(0, -3))
  .sort();

const read = (name: string, ext: string): string =>
  readFileSync(join(dir, `${name}.${ext}`), 'utf8');

/** The whole hard part sits behind a string-in/string-out seam. No temp dirs. */
const run = (text: string): string => render(reconcile(parse(text)).document);

describe('fixture pairs', () => {
  it('has fixtures to run', () => {
    expect(names.length).toBeGreaterThan(0);
  });

  for (const name of names) {
    it(`${name}: renders the expected output`, () => {
      expect(run(read(name, 'in'))).toBe(read(name, 'out'));
    });

    it(`${name}: is idempotent`, () => {
      const once = run(read(name, 'in'));
      expect(run(once)).toBe(once);
    });
  }
});
