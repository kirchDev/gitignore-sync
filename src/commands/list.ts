import { defineCommand } from 'citty';
import consola from 'consola';
import { colors } from 'consola/utils';
import { parse, readStacks } from '../gitignore/parse.ts';
import { readGitignore } from '../io.ts';
import { currentTemplate, knownStacks } from '../templates/index.ts';

export const listCommand = defineCommand({
  meta: {
    name: 'list',
    alias: 'ls',
    description: 'List the stacks this binary ships and which the repo declares'
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
    const declared = new Set(readStacks(parse(readGitignore(args.dir))));
    for (const stack of knownStacks()) {
      const template = currentTemplate(stack);
      const mark = declared.has(stack) ? colors.green('●') : colors.dim('○');
      consola.log(
        `  ${mark} ${colors.cyan(stack)}@v${template?.version ?? '?'}  ${colors.dim(`${template?.lines.length ?? 0} ${template?.lines.length === 1 ? 'line' : 'lines'}`)}`
      );
    }
    for (const stack of declared) {
      if (!currentTemplate(stack)) {
        consola.log(
          `  ${colors.yellow('?')} ${colors.cyan(stack)}  ${colors.dim('declared, no template')}`
        );
      }
    }
  }
});
