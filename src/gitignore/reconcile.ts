import {
  currentTemplate,
  isKnownStack,
  templateAt
} from '../templates/index.ts';
import { parse, readStacks } from './parse.ts';
import type { Document, Section } from './types.ts';

/** Distinct spellings git treats as distinct, that a human reads as the same. */
export type Equivalence = { key: string; spellings: string[] };

/**
 * A free-zone line that ignores a whole directory a managed block carves `!`
 * exceptions out of. Not a style problem: git does not descend into an ignored
 * directory, so the exceptions below it stop working entirely.
 */
export type SmotheredExceptions = {
  /** The offending free-zone line, e.g. `.idea` or `.vscode`. */
  line: string;
  /** The `!` lines it silently disables. */
  exceptions: string[];
};

export type StaleSection = { stack: string; from: number; to: number };

export type Reconciliation = {
  document: Document;
  /** Hand-written lines lifted out of a managed section. Never dropped. */
  rescued: string[];
  /** Exact duplicates removed from the free zone. */
  duplicates: string[];
  /** Free-zone lines a managed section already covers, verbatim. */
  covered: string[];
  /** Headings whose every pattern a managed block absorbed. */
  orphanedComments: string[];
  /** Free-zone lines that disable a managed block's `!` exceptions. */
  smothered: SmotheredExceptions[];
  /** Reported only — `.idea`, `.idea/` and `/.idea` are not the same to git. */
  equivalences: Equivalence[];
  /** Declared in the header but shipped by no template. */
  unknownStacks: string[];
  /** Rendered at an older version than the binary ships. */
  staleSections: StaleSection[];
};

const isBlank = (line: string): boolean => line.trim() === '';
const isComment = (line: string): boolean => line.trimStart().startsWith('#');

/** Free-zone lines grouped the way a human reads them: blank lines separate. */
function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (isBlank(line)) {
      if (current.length > 0) blocks.push(current);
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

/**
 * A human-eye normalisation, used for **reporting only**. `/.idea` anchors to
 * the repo root and `.idea/` matches directories only, so collapsing them would
 * change what git ignores — hence never a merge, only a note.
 */
function equivalenceKey(line: string): string {
  let key = line.trim();
  const negated = key.startsWith('!');
  if (negated) key = key.slice(1);
  key = key
    .replace(/^\/+/, '')
    .replace(/\/\*{1,2}$/, '')
    .replace(/\/+$/, '');
  return negated ? `!${key}` : key;
}

/**
 * Bring a document in line with the templates its header declares.
 *
 * Pure: a Document in, a Document out. The rule that makes running this twice
 * safe lives here — a line inside a managed section that no template version
 * put there is moved to the free zone, never deleted.
 */
export function reconcile(doc: Document): Reconciliation {
  const declared = readStacks(doc);
  const unknownStacks = declared.filter((s) => !isKnownStack(s));
  const rescued: string[] = [];
  const staleSections: StaleSection[] = [];

  for (const section of doc.sections) {
    const shipped =
      templateAt(section.stack, section.version) ??
      currentTemplate(section.stack);
    // No template at all for this stack: this binary cannot tell a template
    // line from a hand-written one, so it rescues nothing and leaves the block
    // exactly as it found it.
    if (shipped) {
      const known = new Set(shipped.lines);
      for (const line of section.lines) {
        if (isBlank(line)) continue;
        if (!known.has(line)) rescued.push(line);
      }
    }

    const current = currentTemplate(section.stack);
    if (current && current.version !== section.version) {
      staleSections.push({
        stack: section.stack,
        from: section.version,
        to: current.version
      });
    }
  }

  const sections: Section[] = [];
  for (const stack of declared) {
    const template = currentTemplate(stack);
    if (template) {
      sections.push({
        stack: template.stack,
        version: template.version,
        lines: [...template.lines]
      });
      continue;
    }
    // Unknown stack: keep whatever is already there rather than delete a block
    // this binary simply does not understand.
    const existing = doc.sections.find((s) => s.stack === stack);
    if (existing) sections.push(existing);
  }

  const managed = new Set(sections.flatMap((s) => s.lines));
  const duplicates: string[] = [];
  const covered: string[] = [];
  const orphanedComments: string[] = [];
  const seen = new Set<string>();

  // Filtered block by block, not line by line. A comment is a heading for the
  // patterns under it: once a managed block has absorbed every one of them, the
  // heading is left pointing at nothing — which is most of what makes a
  // fetch-and-dump file long. A block that was only ever a note keeps standing.
  const freeZone: string[] = [];
  for (const block of splitBlocks([...doc.freeZone, ...rescued])) {
    const kept: string[] = [];
    let hadPattern = false;
    let keptPattern = false;

    for (const line of block) {
      if (isComment(line)) {
        kept.push(line);
        continue;
      }
      hadPattern = true;
      if (managed.has(line)) {
        covered.push(line);
        continue;
      }
      if (seen.has(line)) {
        duplicates.push(line);
        continue;
      }
      seen.add(line);
      keptPattern = true;
      kept.push(line);
    }

    if (hadPattern && !keptPattern) {
      orphanedComments.push(...kept);
      continue;
    }
    if (kept.length > 0) {
      if (freeZone.length > 0) freeZone.push('');
      freeZone.push(...kept);
    }
  }

  // A managed block that unignores `.vscode/extensions.json` is dead the moment
  // anything ignores `.vscode` outright — git never looks inside. This is the
  // single most common leftover across the estate, so it is worth its own
  // finding rather than a note about equivalent spellings.
  const smothered: SmotheredExceptions[] = [];
  const negations = [...managed].filter((line) => line.startsWith('!'));
  for (const line of freeZone) {
    if (isBlank(line) || isComment(line) || line.startsWith('!')) continue;
    const dir = line.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    if (dir === '' || dir.includes('*')) continue;
    const exceptions = negations.filter((n) =>
      n.slice(1).replace(/^\/+/, '').startsWith(`${dir}/`)
    );
    if (exceptions.length > 0) smothered.push({ line, exceptions });
  }

  const byKey = new Map<string, string[]>();
  for (const line of [...managed, ...freeZone]) {
    if (isBlank(line) || isComment(line)) continue;
    const key = equivalenceKey(line);
    const spellings = byKey.get(key);
    if (spellings) {
      if (!spellings.includes(line)) spellings.push(line);
    } else {
      byKey.set(key, [line]);
    }
  }
  // A line already reported as smothering a block's `!` exceptions does not
  // also need the general "these are different patterns to git" note — the
  // specific finding says everything the vague one would, and says what to do.
  // Other spellings in the same group still get theirs.
  const smotheredLines = new Set(smothered.map((s) => s.line));
  const equivalences = [...byKey]
    .map(([key, spellings]) => ({
      key,
      spellings: spellings.filter((s) => !smotheredLines.has(s))
    }))
    .filter(({ spellings }) => spellings.length > 1);

  return {
    document: {
      header: doc.header,
      sections,
      freeZone,
      hasRegion: doc.hasRegion
    },
    rescued,
    duplicates,
    covered,
    orphanedComments,
    smothered,
    equivalences,
    unknownStacks,
    staleSections
  };
}

/** Convenience for the commands and the tests: text in, reconciliation out. */
export const reconcileText = (text: string): Reconciliation =>
  reconcile(parse(text));
