import { existsSync, statSync } from 'node:fs';
import { defineCommand } from 'citty';
import consola from 'consola';
import { colors } from 'consola/utils';
import { basename } from 'pathe';
import { DIVIDER, stacksLine } from '../gitignore/markers.ts';
import { parse } from '../gitignore/parse.ts';
import { reconcile } from '../gitignore/reconcile.ts';
import { gitignorePath, readGitignore } from '../io.ts';
import { stackOrder } from '../templates/index.ts';

type Row = {
  name: string;
  file: string;
  /** Patterns in the file before reconciling: no blanks, no comments. */
  before: number;
  /** Patterns still in the free zone after every stack was applied. */
  after: number;
  leftovers: string[];
};

type Report = {
  files: Row[];
  totals: { before: number; after: number; covered: number; percent: number };
  /** Every leftover pattern with the files that carry it, most common first. */
  leftovers: { pattern: string; files: string[] }[];
};

const isPattern = (line: string): boolean => {
  const t = line.trim();
  return t !== '' && !t.startsWith('#');
};

/**
 * Measure one file against every stack this binary ships.
 *
 * The point is not to rewrite anything — it is to answer "what would still be
 * left over if this repo declared everything?", because that remainder is what
 * decides whether a stack is missing or the lines are genuinely project rules.
 */
function auditFile(dir: string): Row {
  const file = gitignorePath(dir);
  const text = readGitignore(dir);
  const before = text.split('\n').filter(isPattern).length;

  const doc = parse(text);
  const all = stackOrder();
  const result = reconcile({
    ...doc,
    header: [stacksLine(all), DIVIDER],
    hasRegion: true
  });
  const leftovers = result.document.freeZone
    .filter(isPattern)
    .map((l) => l.trim());

  return {
    name: basename(dir),
    file,
    before,
    after: leftovers.length,
    leftovers
  };
}

export const auditCommand = defineCommand({
  meta: {
    name: 'audit',
    description:
      'Measure how much of one or more repos the shipped stacks already cover'
  },
  args: {
    dirs: {
      type: 'positional',
      description: 'Repository directories (default: the current one)',
      required: false,
      default: '.'
    },
    'min-files': {
      type: 'string',
      description: 'Only list leftovers carried by at least this many files',
      default: '1'
    },
    json: {
      type: 'boolean',
      description: 'Emit a machine-readable JSON report',
      default: false
    }
  },
  run({ args }) {
    const raw = args._ && args._.length > 0 ? args._ : [args.dirs];
    const dirs = [
      ...new Set(
        raw.filter((d): d is string => typeof d === 'string' && d !== '')
      )
    ].filter((dir) => {
      if (!existsSync(dir) || !statSync(dir).isDirectory()) {
        consola.warn(`Not a directory, skipped: ${dir}`);
        return false;
      }
      if (!existsSync(gitignorePath(dir))) {
        consola.warn(`No .gitignore, skipped: ${dir}`);
        return false;
      }
      return true;
    });

    if (dirs.length === 0) {
      consola.error('Nothing to audit.');
      process.exitCode = 1;
      return;
    }

    const files = dirs.map(auditFile).sort((a, b) => b.before - a.before);
    const before = files.reduce((n, f) => n + f.before, 0);
    const after = files.reduce((n, f) => n + f.after, 0);

    const carriers = new Map<string, string[]>();
    for (const row of files) {
      for (const line of row.leftovers) {
        const seen = carriers.get(line);
        if (seen) seen.push(row.name);
        else carriers.set(line, [row.name]);
      }
    }
    const minFiles = Math.max(1, Number(args['min-files']) || 1);
    const leftovers = [...carriers]
      .map(([pattern, names]) => ({ pattern, files: names }))
      .filter((l) => l.files.length >= minFiles)
      .sort(
        (a, b) =>
          b.files.length - a.files.length || a.pattern.localeCompare(b.pattern)
      );

    const report: Report = {
      files,
      totals: {
        before,
        after,
        covered: before - after,
        percent:
          before === 0
            ? 100
            : Math.round(((before - after) / before) * 1000) / 10
      },
      leftovers
    };

    if (args.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return;
    }

    const width = Math.max(...files.map((f) => f.name.length), 4);
    consola.log(
      `  ${colors.dim('repo'.padEnd(width))} ${colors.dim('before')}  ${colors.dim('left')}`
    );
    for (const row of files) {
      consola.log(
        `  ${row.name.padEnd(width)} ${String(row.before).padStart(6)}  ${String(row.after).padStart(4)}`
      );
    }
    consola.log(
      `\n  ${colors.bold(`${report.totals.before} patterns → ${report.totals.after} left`)} ${colors.dim(`(${report.totals.percent}% covered by the shipped stacks)`)}`
    );

    if (leftovers.length > 0) {
      consola.log(
        `\n  ${colors.dim(`leftovers carried by ${minFiles}+ file(s), most common first`)}`
      );
      for (const { pattern, files: names } of leftovers) {
        consola.log(
          `  ${String(names.length).padStart(3)}x  ${pattern}  ${colors.dim(names.slice(0, 4).join(', ') + (names.length > 4 ? ', …' : ''))}`
        );
      }
    }
  }
});
