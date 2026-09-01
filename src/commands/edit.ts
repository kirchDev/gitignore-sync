import { defineCommand } from 'citty';
import consola from 'consola';
import { colors } from 'consola/utils';
import { detect } from '../detect.ts';
import { stacksLine } from '../gitignore/markers.ts';
import { parse, readStacks, withStacks } from '../gitignore/parse.ts';
import { reconcile } from '../gitignore/reconcile.ts';
import { render } from '../gitignore/render.ts';
import { gitignorePath, readGitignore, writeGitignore } from '../io.ts';
import { canPrompt, promptStacks } from './prompt.ts';
import { report } from './report.ts';

export const editCommand = defineCommand({
  meta: {
    name: 'edit',
    description: 'Tick stacks on and off in a prompt, then re-render'
  },
  args: {
    dir: {
      type: 'positional',
      description: 'Repository directory (default: the current one)',
      required: false,
      default: '.'
    },
    'dry-run': {
      type: 'boolean',
      description: 'Print the result instead of writing it',
      default: false
    }
  },
  async run({ args }) {
    const dir = args.dir;

    const text = readGitignore(dir);
    const doc = parse(text);

    // The state of the file first, the state of the terminal second: without a
    // region there is nothing to edit however you invoked this, and "run init"
    // is the useful thing to say.
    if (!doc.hasRegion) {
      consola.error(
        `${gitignorePath(dir)} has no managed region — run ${colors.cyan('gitignore-sync init')} first.`
      );
      process.exitCode = 1;
      return;
    }

    if (!canPrompt()) {
      consola.error(
        `${colors.cyan('edit')} needs an interactive terminal. Use ${colors.cyan('add')} / ${colors.cyan('remove')} in a script or CI.`
      );
      process.exitCode = 1;
      return;
    }

    const declared = new Set(readStacks(doc));
    const next = await promptStacks({
      message: 'Which stacks does this repo want?',
      initial: declared,
      found: detect(dir),
      declared
    });

    if (next === null) {
      consola.info('Cancelled — nothing written.');
      return;
    }

    const result = reconcile(withStacks(doc, next));
    const output = render(result.document);

    consola.log(`  ${colors.dim(stacksLine(next))}`);
    report(result);

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
