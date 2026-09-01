#!/usr/bin/env node
/**
 * Writes `tests/templates.lock.json` — every stack version this binary defines,
 * with its lines.
 *
 * The lock is what makes "a template version is immutable" a check rather than
 * a promise. `tests/templates.lock.test.ts` fails when a version already in the
 * lock has changed, so editing `node@v1` in place cannot pass CI unless someone
 * also re-runs this script — and that shows up as a diff on the lock, which is
 * exactly the thing a reviewer should be asked about.
 *
 * Adding a *new* version needs no re-run: the test only guards versions the
 * lock already knows. Run this when you add one, so the next change is guarded
 * too.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { currentTemplate, stackOrder } from '../src/templates/index.ts';

const lock: Record<string, string[]> = {};
for (const stack of stackOrder()) {
  const template = currentTemplate(stack);
  if (template) lock[`${stack}@v${template.version}`] = template.lines;
}

const path = join(import.meta.dirname, '..', 'tests', 'templates.lock.json');
writeFileSync(path, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
console.log(`Wrote ${Object.keys(lock).length} versions to ${path}`);
