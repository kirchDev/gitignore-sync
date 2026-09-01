import { existsSync, readdirSync, type Dirent } from 'node:fs';
import { join } from 'pathe';
import { stackOrder } from './templates/index.ts';

/**
 * Where a signal comes from, and therefore how much it may decide on its own.
 *
 * - `repo` — a committed marker (`package.json`, `go.mod`, a `*.tf` file). It
 *   describes the project, so it holds for everyone who clones.
 * - `machine` — the checkout or the machine running the command: a `.vscode/`
 *   directory (itself usually gitignored), `$EDITOR`, `process.platform`. It
 *   describes one keyboard.
 *
 * Both are real evidence and both are detected the same way — one table, one
 * pass. The distinction only decides one thing: whether a signal may write the
 * header **without a human confirming it**. The header is committed, so a CI
 * runner's platform must not end up claiming something for the whole team.
 */
export type Source = 'repo' | 'machine';

export type Detected = { stack: string; source: Source };

type Fingerprint = {
  source: Source;
  /** Always found; `core` alone uses this. */
  always?: boolean;
  /** Any of these existing in the directory is enough. */
  files?: string[];
  /** Or any entry matching one of these, searched to `PATTERN_DEPTH`. */
  patterns?: RegExp[];
  /** Or the platform running the command. */
  platform?: string;
  /** Or `$VISUAL` / `$EDITOR`. */
  editor?: RegExp;
};

/**
 * How deep a pattern fingerprint looks. One level below the root, because a
 * Terraform repo keeps its stacks in `tofu/` or `terraform/` rather than
 * scattered across the root — and because going deeper starts finding other
 * people's examples.
 */
const PATTERN_DEPTH = 2;

/**
 * Never descended into. `examples/` is here on purpose: a `.tf` file shown as
 * documentation is not a workspace that produces state, and treating it as one
 * makes every provider repo look like an infrastructure repo.
 */
const SKIP = new Set([
  '.git',
  'node_modules',
  'vendor',
  'dist',
  'coverage',
  'examples',
  'testdata',
  'fixtures'
]);

const fingerprints: Record<string, Fingerprint> = {
  core: { source: 'repo', always: true },
  // Any repo an agent has ever run in has the directory; proposing the stack
  // there is what keeps settings.local.json out of a branch.
  agents: { source: 'repo', files: ['.claude', '.codex', '.opencode'] },
  // Every repository this runs in is one.
  git: { source: 'repo', files: ['.git'] },
  node: { source: 'repo', files: ['package.json'] },
  turborepo: { source: 'repo', files: ['turbo.json'] },
  // Root `Cargo.toml` only — see the comment on the template.
  rust: { source: 'repo', files: ['Cargo.toml'] },
  playwright: {
    source: 'repo',
    patterns: [/^playwright\.config\.[cm]?[jt]s$/]
  },
  storybook: { source: 'repo', files: ['.storybook'] },
  php: { source: 'repo', files: ['composer.json'] },
  laravel: { source: 'repo', files: ['artisan'] },
  go: { source: 'repo', files: ['go.mod'] },
  tofu: {
    source: 'repo',
    patterns: [/\.tf$/, /\.tofu$/, /^\.terraform\.lock\.hcl$/]
  },
  nuxt: { source: 'repo', patterns: [/^nuxt\.config\.[cm]?[jt]s$/] },
  tauri: { source: 'repo', files: ['src-tauri'] },
  // A committed `.env.example` is the marker, not `.env` — the latter is the
  // very file the stack exists to keep out, so it is often absent on a fresh
  // clone and present on a machine that already ran the setup.
  dotenv: { source: 'repo', files: ['.env.example', '.env'] },
  vscode: { source: 'machine', files: ['.vscode'] },
  intellij: { source: 'machine', files: ['.idea'] },
  vim: { source: 'machine', editor: /\b(?:vi|vim|nvim)\b/ },
  macos: { source: 'machine', platform: 'darwin' },
  windows: { source: 'machine', platform: 'win32' },
  linux: { source: 'machine', platform: 'linux' }
};

/** Always proposed; removing it is then a visible act. */
export const BASE_STACK = 'core';

function matchesPatterns(
  dir: string,
  patterns: RegExp[],
  depth: number
): boolean {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    if (patterns.some((pattern) => pattern.test(entry.name))) return true;
  }
  if (depth <= 1) return false;
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    if (SKIP.has(entry.name)) continue;
    if (matchesPatterns(join(dir, entry.name), patterns, depth - 1))
      return true;
  }
  return false;
}

function matches(dir: string, print: Fingerprint): boolean {
  if (print.always) return true;
  if (print.files?.some((file) => existsSync(join(dir, file)))) return true;
  if (print.platform && process.platform === print.platform) return true;
  if (print.editor) {
    const editor = process.env.VISUAL ?? process.env.EDITOR ?? '';
    if (print.editor.test(editor)) return true;
  }
  if (print.patterns)
    return matchesPatterns(dir, print.patterns, PATTERN_DEPTH);
  return false;
}

/**
 * The only filesystem contact in the tool. `parse`, `render` and `reconcile`
 * stay string-in/string-out so the hard part is testable with fixture pairs.
 *
 * Returns registry order, so the header reads the same on every run.
 */
export function detect(dir: string): Detected[] {
  const found: Detected[] = [];
  for (const stack of stackOrder()) {
    const print = fingerprints[stack];
    if (print && matches(dir, print)) {
      found.push({ stack, source: print.source });
    }
  }
  return found;
}

/** Just the names, for callers that do not care where a signal came from. */
export const stacksOf = (found: Detected[]): string[] =>
  found.map((d) => d.stack);

/**
 * What may be written without asking. Only committed evidence: `init --yes`
 * and the no-TTY path run in CI, where the platform is the runner's and the
 * editor directory is nobody's.
 */
export const committedOnly = (found: Detected[]): Detected[] =>
  found.filter((d) => d.source === 'repo');
