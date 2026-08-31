import consola from 'consola';
import type { Detected } from '../detect.ts';
import { currentTemplate, stackOrder } from '../templates/index.ts';

/**
 * The one multiselect both `init` and `edit` show, so the two read the same
 * however you got there. Returns `null` when the prompt was cancelled — the
 * caller writes nothing in that case.
 */
export async function promptStacks(options: {
  message: string;
  /** Pre-ticked. `init` seeds this from detection, `edit` from the header. */
  initial: Set<string>;
  /** What detection found, with where each signal came from. */
  found: Detected[];
  declared: Set<string>;
  /** Restrict the list — `init` uses it to offer only what it did not find. */
  choices?: string[];
}): Promise<string[] | null> {
  const offered = options.choices ?? stackOrder();
  const source = new Map(options.found.map((d) => [d.stack, d.source]));
  const choices = offered.map((stack) => {
    const template = currentTemplate(stack);
    const marks: string[] = [];
    if (source.has(stack)) marks.push('detected');
    if (options.declared.has(stack)) marks.push('declared');
    return {
      value: stack,
      label: stack,
      hint: `${template?.lines.length ?? 0} lines${marks.length > 0 ? ` · ${marks.join(', ')}` : ''}`
    };
  });

  const answer = await consola.prompt(options.message, {
    type: 'multiselect',
    options: choices,
    initial: offered.filter((s) => options.initial.has(s)),
    // "None of these" is a real answer — most repos want no extra stack at all.
    required: false,
    cancel: 'null'
  });

  if (answer === null || answer === undefined) return null;
  const chosen = new Set((answer as unknown as string[]).map(String));
  const picked = offered.filter((stack) => chosen.has(stack));

  // A declared stack this binary ships no template for is kept: neither verb
  // may quietly drop something it simply cannot render.
  for (const stack of options.declared) {
    if (!picked.includes(stack) && !stackOrder().includes(stack)) {
      picked.push(stack);
    }
  }
  return picked;
}

/** A prompt with no terminal to read from would hang or take its defaults. */
export const canPrompt = (): boolean => Boolean(process.stdin.isTTY);
