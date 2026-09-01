import { defineCommand } from 'citty';
import consola from 'consola';
import { colors } from 'consola/utils';
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
    }
  },
  run({ args }) {
    const dir = args.dir;
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
