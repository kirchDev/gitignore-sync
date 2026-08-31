import consola from 'consola';
import { colors } from 'consola/utils';
import type { Reconciliation } from '../gitignore/reconcile.ts';

/** Everything a run wants to say about a reconciliation, in one place. */
export function report(result: Reconciliation): void {
  for (const stack of result.unknownStacks) {
    consola.warn(
      `Header declares unknown stack ${colors.cyan(stack)} — no template ships for it, its block is left untouched.`
    );
  }
  for (const stale of result.staleSections) {
    consola.info(
      `${colors.cyan(stale.stack)} block is at v${stale.from}, this binary ships v${stale.to}.`
    );
  }
  if (result.rescued.length > 0) {
    consola.info(
      `Rescued ${result.rescued.length} hand-written line(s) from managed blocks into the free zone:`
    );
    for (const line of result.rescued) consola.log(`    ${colors.green(line)}`);
  }
  if (result.covered.length > 0) {
    consola.info(
      `Removed ${result.covered.length} free-zone line(s) a managed block already covers:`
    );
    for (const line of result.covered) consola.log(`    ${colors.dim(line)}`);
  }
  if (result.orphanedComments.length > 0) {
    consola.info(
      `Removed ${result.orphanedComments.length} heading(s) left pointing at nothing:`
    );
    for (const line of result.orphanedComments) {
      consola.log(`    ${colors.dim(line)}`);
    }
  }
  if (result.duplicates.length > 0) {
    consola.info(`Removed ${result.duplicates.length} exact duplicate(s):`);
    for (const line of result.duplicates)
      consola.log(`    ${colors.dim(line)}`);
  }
  for (const s of result.smothered) {
    // Not a style note: git never descends into an ignored directory.
    consola.warn(
      `${colors.yellow(s.line)} ignores the whole directory, which disables ${s.exceptions.map((e) => colors.cyan(e)).join(', ')}. Remove it — the managed block already covers it.`
    );
  }
  for (const eq of result.equivalences) {
    // Reported, never merged: these are different patterns to git.
    consola.warn(
      `${eq.spellings.map((s) => colors.yellow(s)).join(' / ')} mean different things to git — reported, not merged.`
    );
  }
}
