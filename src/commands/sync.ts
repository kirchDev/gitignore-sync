import { defineCommand } from 'citty';
import consola from 'consola';
import { colors } from 'consola/utils';
import { detect, stacksOf } from '../detect.ts';
import { parse, readStacks } from '../gitignore/parse.ts';
import { reconcile } from '../gitignore/reconcile.ts';
import { render } from '../gitignore/render.ts';
import { gitignorePath, readGitignore, writeGitignore } from '../io.ts';
import { report } from './report.ts';

export const syncCommand = defineCommand({
  meta: {
    name: 'sync',
    description:
      'Read the header, re-render the managed blocks from it. Detects nothing.'
  },
  args: {
    dir: {
      type: 'positional',
      description: 'Repository directory (default: the current one)',
      required: false,
      default: '.'
    },
    detect: {
      type: 'boolean',
      description:
        'Additionally propose header changes from the tree — never applies them',
      default: false
    },
    'dry-run': {
      type: 'boolean',
      description: 'Print the result instead of writing it',
      default: false
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
    const output = render(result.document);

    report(result);

    // Detection changes its moment, it does not disappear: adding a
    // package.json must not quietly rewrite someone's .gitignore, so this only
    // ever prints a suggestion.
    if (args.detect) {
      const declared = new Set(readStacks(doc));
      const missing = stacksOf(detect(dir)).filter((s) => !declared.has(s));
      if (missing.length === 0) {
        consola.info('Detection proposes no header change.');
      } else {
        consola.info(
          `Detection suggests adding ${missing.map((s) => colors.cyan(s)).join(', ')} to the ${colors.cyan('# stacks:')} line. Not applied.`
        );
      }
    }

    if (args['dry-run']) {
      consola.log(output);
      return;
    }
    if (output === text) {
      consola.success(`${gitignorePath(dir)} is already in sync.`);
      return;
    }
    writeGitignore(dir, output);
    consola.success(`Wrote ${gitignorePath(dir)}`);
  }
});
