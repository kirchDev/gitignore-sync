import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { templateAt } from '../src/templates/index.ts';

const lock = JSON.parse(
  readFileSync(join(import.meta.dirname, 'templates.lock.json'), 'utf8')
) as Record<string, string[]>;

/**
 * A shipped template version is immutable. Once a `.gitignore` out there
 * carries `# region node@v1`, that marker is a claim about which lines the tool
 * wrote — and reconcile trusts it to tell its own output from a human's. Change
 * v1's lines and the claim becomes false: an upgrade would either delete
 * hand-written lines or rescue its own discards into the free zone.
 *
 * So: to change a template, add a version. Editing one in place fails here.
 */
describe('templates.lock.json', () => {
  it('locks at least one version', () => {
    expect(Object.keys(lock).length).toBeGreaterThan(0);
  });

  for (const [key, lines] of Object.entries(lock)) {
    const [stack, v] = key.split('@v');
    it(`${key} is unchanged since it was locked`, () => {
      const template = templateAt(stack ?? '', Number(v));
      expect(
        template,
        `${key} is in the lock but no longer defined`
      ).toBeDefined();
      expect(template?.lines).toEqual(lines);
    });
  }
});
