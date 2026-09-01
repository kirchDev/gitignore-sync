/**
 * `# region` / `# endregion` rather than `# start` / `# end` for one concrete
 * reader: VSCode folds `#region`, so a 40-line managed block collapses to a
 * single line — and the nested form folds at both levels.
 */
export const REGION_NAME = 'gitignore-sync';

/** `# region gitignore-sync` — the outer marker, matched leniently on spacing. */
const OUTER_START = new RegExp(`^#\\s*region\\s+${REGION_NAME}\\s*$`);

/** `# region node@v1` — a section marker. */
const SECTION_START = /^#\s*region\s+([A-Za-z0-9][\w.-]*)@v(\d+)\s*$/;

/** Any region opener, whichever level it belongs to. */
const ANY_START = /^#\s*region\b/;

const ANY_END = /^#\s*endregion\s*$/;

export const isOuterStart = (line: string): boolean => OUTER_START.test(line);
export const isAnyStart = (line: string): boolean => ANY_START.test(line);
export const isEnd = (line: string): boolean => ANY_END.test(line);

export function matchSectionStart(
  line: string
): { stack: string; version: number } | undefined {
  const m = SECTION_START.exec(line);
  if (!m?.[1] || !m[2]) return undefined;
  return { stack: m[1], version: Number(m[2]) };
}

export const outerStartLine = (): string => `# region ${REGION_NAME}`;
export const sectionStartLine = (stack: string, version: number): string =>
  `# region ${stack}@v${version}`;
export const endLine = (): string => '# endregion';

/** `# stacks: core, node` — the declaration the whole tool reads. */
const STACKS = /^#\s*stacks:\s*(.*)$/;

export function matchStacks(line: string): string[] | undefined {
  const m = STACKS.exec(line);
  if (!m) return undefined;
  return m[1]
    ? m[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

export const stacksLine = (stacks: string[]): string =>
  `# stacks: ${stacks.join(', ')}`;

/** Cosmetic rule under the header; regenerated on every render. */
export const DIVIDER = `# ${'─'.repeat(41)}`;
