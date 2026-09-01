import { readFileSync } from 'node:fs';
import { defineCommand } from 'citty';
import consola from 'consola';
import { colors } from 'consola/utils';
import { findGitignores } from '../discover.ts';
import { parse } from '../gitignore/parse.ts';
import { reconcile } from '../gitignore/reconcile.ts';
import { render } from '../gitignore/render.ts';
import { gitignorePath, readGitignore } from '../io.ts';
import { report } from './report.ts';

export const checkCommand = defineCommand({
  meta: {
    name: 'check',
    description:
      'Dry run for CI: report drift and duplicates, exit non-zero on deviation'
  },
  args: {
    dir: {
      type: 'positional',
      description: 'Repository directory (default: the current one)',
      required: false,
      default: '.'
    },
    recursive: {
      type: 'boolean',
      description:
        'Also check managed regions below this directory, skipping build and dependency output',
      alias: 'r',
      default: false
    }
  },
  run({ args }) {
    const dir = args.dir;

    // Recursive checks only what is already managed. A file without a region
    // is not drift — nobody asked for one there, and a gate that fails on
    // every unmanaged sub-directory would be unusable.
    if (args.recursive) {
      const managed = findGitignores(dir, { recursive: true }).filter(
        (f) => f.kind === 'managed'
      );
      if (managed.length === 0) {
        consola.error(
          `No managed region under ${dir} — run ${colors.cyan('gitignore-sync init')} first.`
        );
        process.exitCode = 1;
        return;
      }
      let drifted = 0;
      for (const found of managed) {
        const text = readFileSync(found.file, 'utf8');
        const result = reconcile(parse(text));
        report(result);
        if (render(result.document) === text) {
          consola.success(`${found.relative} is in sync.`);
        } else {
          consola.error(
            `${found.relative} is out of sync — run ${colors.cyan(`gitignore-sync sync ${found.file.slice(0, -'/.gitignore'.length)}`)}.`
          );
          drifted++;
        }
      }
      if (drifted > 0) process.exitCode = 1;
      return;
    }

    const text = readGitignore(dir);
    const doc = parse(text);

    if (!doc.hasRegion) {
      consola.error(
        `${gitignorePath(dir)} has no managed region — run ${colors.cyan('gitignore-sync init')} first.`
      );
      process.exitCode = 1;
      return;
    }

    const result = reconcile(doc);
    report(result);

    if (render(result.document) !== text) {
      consola.error(
        `${gitignorePath(dir)} is out of sync — run ${colors.cyan('gitignore-sync sync')}.`
      );
      process.exitCode = 1;
      return;
    }
    consola.success(`${gitignorePath(dir)} is in sync.`);
  }
});
