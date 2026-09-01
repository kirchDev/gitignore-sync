/** One managed block inside the region, e.g. `# region node@v1` … `# endregion`. */
export type Section = {
  /** Stack name as written in the marker, e.g. `node`. */
  stack: string;
  /** Version from the marker (`node@v1` → 1), so `check` can spot a stale block. */
  version: number;
  /** Body lines, verbatim, markers excluded. */
  lines: string[];
};

/**
 * A parsed `.gitignore`.
 *
 * The header is **input** — it declares which stacks the repo wants. The
 * sections are **output** — what was last rendered. A difference between the
 * two is not an error, it is the pending change.
 */
export type Document = {
  /** Raw header lines of the region, up to the first section marker. */
  header: string[];
  sections: Section[];
  /** Everything outside the region. Never rendered from a template. */
  freeZone: string[];
  /** Whether the source text carried a managed region at all. */
  hasRegion: boolean;
};

/** A curated block shipped with the binary. Data, not code. */
export type Template = {
  stack: string;
  version: number;
  lines: string[];
};

export class GitignoreParseError extends Error {
  readonly line: number;

  constructor(message: string, line: number) {
    super(`${message} (line ${line})`);
    this.name = 'GitignoreParseError';
    this.line = line;
  }
}
