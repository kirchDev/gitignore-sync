import {
  isAnyStart,
  isEnd,
  isOuterStart,
  matchSectionStart,
  matchStacks,
  stacksLine
} from './markers.ts';
import { GitignoreParseError, type Document, type Section } from './types.ts';

const isBlank = (line: string): boolean => line.trim() === '';

/**
 * Split text into lines, dropping the single trailing empty string a
 * newline-terminated file produces. Touches no filesystem: string in, Document
 * out.
 */
function toLines(text: string): string[] {
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines.map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && isBlank(lines[start] ?? '')) start++;
  while (end > start && isBlank(lines[end - 1] ?? '')) end--;
  return lines.slice(start, end);
}

/**
 * Recognise the header, the sections and the free zone.
 *
 * A file with no managed region parses as pure free zone — that is what `init`
 * sees on its first run.
 */
export function parse(text: string): Document {
  const lines = toLines(text);
  const outerStart = lines.findIndex(isOuterStart);

  if (outerStart === -1) {
    return {
      header: [],
      sections: [],
      freeZone: trimBlankEdges(lines),
      hasRegion: false
    };
  }

  const header: string[] = [];
  const sections: Section[] = [];
  /** Non-marker lines found at region level after the first section: strays. */
  const strays: string[] = [];

  let depth = 1;
  let index = outerStart + 1;
  let outerEnd = -1;
  let open: Section | undefined;

  /** A line the region holds but no marker of ours claims. */
  const keep = (line: string): void => {
    if (open) open.lines.push(line);
    else if (sections.length === 0) header.push(line);
    else if (!isBlank(line)) strays.push(line);
  };

  for (; index < lines.length; index++) {
    const line = lines[index] ?? '';

    if (isEnd(line)) {
      const next = depth - 1;
      if (next === 0) {
        outerEnd = index;
        break;
      }
      depth = next;
      if (next === 1 && open) {
        sections.push(open);
        open = undefined;
        continue;
      }
      // Closes a region we do not own, so it is content, not a marker.
      keep(line);
      continue;
    }

    if (isAnyStart(line)) {
      const section = matchSectionStart(line);
      depth++;
      if (depth === 2 && section && !open) {
        open = { stack: section.stack, version: section.version, lines: [] };
        continue;
      }
      // A foreign opener still nests, so its `# endregion` cannot be mistaken
      // for one of ours.
      keep(line);
      continue;
    }

    keep(line);
  }

  if (outerEnd === -1) {
    throw new GitignoreParseError(
      `unterminated '# region ${'gitignore-sync'}' — no matching '# endregion'`,
      outerStart + 1
    );
  }

  const before = lines.slice(0, outerStart);
  const after = lines.slice(outerEnd + 1);

  for (const section of sections) {
    section.lines = trimBlankEdges(section.lines);
  }

  return {
    header: trimBlankEdges(header),
    sections,
    freeZone: [...trimBlankEdges(before), ...trimBlankEdges(after), ...strays],
    hasRegion: true
  };
}

/** The stacks the header declares — the input side of the document. */
export function readStacks(doc: Document): string[] {
  for (const line of doc.header) {
    const stacks = matchStacks(line);
    // Deduplicated, first mention winning: a header that names a stack twice
    // must not render its block twice.
    if (stacks) return [...new Set(stacks)];
  }
  return [];
}

/**
 * A copy of the document with a new `# stacks:` declaration. The header is the
 * only thing `add` and `remove` touch — the sections follow from it on the next
 * reconcile, which is the whole point of the header being input.
 */
export function withStacks(doc: Document, stacks: string[]): Document {
  const line = stacksLine(stacks);
  let replaced = false;
  const header = doc.header.map((l) => {
    if (replaced || matchStacks(l) === undefined) return l;
    replaced = true;
    return line;
  });
  return { ...doc, header: replaced ? header : [line, ...header] };
}
