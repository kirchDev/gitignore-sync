import { defineCommand } from 'citty';
import consola from 'consola';
import { colors } from 'consola/utils';
import { committedOnly, detect, stacksOf } from '../detect.ts';
import { DIVIDER, stacksLine } from '../gitignore/markers.ts';
import { parse } from '../gitignore/parse.ts';
import { reconcile } from '../gitignore/reconcile.ts';
import { render } from '../gitignore/render.ts';
import { gitignorePath, readGitignore, writeGitignore } from '../io.ts';
import { stackOrder } from '../templates/index.ts';
import { canPrompt, promptStacks } from './prompt.ts';
import { report } from './report.ts';

export const initCommand = defineCommand({
  meta: {
    name: 'init',
    description:
      'Fingerprint the repo, confirm the stacks in a prompt and write the managed region'
  },
  args: {
    dir: {
      type: 'positional',
      description: 'Repository directory (default: the current one)',
      required: false,
      default: '.'
    },
    stacks: {
      type: 'string',
      description: 'Comma-separated stacks; skips the prompt'
    },
    yes: {
      type: 'boolean',
      description: 'Take what detection proposes without asking',
      alias: 'y',
      default: false
    },
    'dry-run': {
      type: 'boolean',
      description: 'Print the result instead of writing it',
      default: false
    },
    force: {
      type: 'boolean',
      description: 'Replace an existing header instead of refusing',
      default: false
    }
  },
  async run({ args }) {
    const dir = args.dir;
    const text = readGitignore(dir);
    const existing = parse(text);

    if (existing.hasRegion && !args.force) {
      consola.error(
        `${gitignorePath(dir)} already carries a managed region. Use ${colors.cyan('gitignore-sync edit')} to change it, ${colors.cyan('sync')} to re-render, or pass --force to start over.`
      );
      process.exitCode = 1;
      return;
    }

    const found = detect(dir);
    const detected = new Set(stacksOf(found));
    let stacks: string[];

    if (args.stacks) {
      stacks = args.stacks
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (args.yes || !canPrompt()) {
      // No terminal, or told not to ask: only committed evidence writes. This
      // is the path CI takes, so it must never wait for input — and a runner's
      // platform must not end up claiming something for the whole team.
      stacks = stacksOf(committedOnly(found));
      consola.info(`Detected ${stacks.map((s) => colors.cyan(s)).join(', ')}`);
      const skipped = stacksOf(found).filter((s) => !stacks.includes(s));
      if (skipped.length > 0) {
        consola.log(
          `  ${colors.dim(`Skipped ${skipped.join(', ')} — editor and platform need a human to confirm them. Add with \`gitignore-sync add\`.`)}`
        );
      }
    } else {
      // Two steps rather than one long multiselect: confirm what was found,
      // then offer the rest.
      consola.info(
        `Found ${detected.size} stack${detected.size === 1 ? '' : 's'}: ${[...detected].map((s) => colors.cyan(s)).join(', ')}`
      );

      const takeProposal = await consola.prompt('Use them?', {
        type: 'confirm',
        initial: true,
        cancel: 'null'
      });

      if (takeProposal === null || takeProposal === undefined) {
        consola.info('Cancelled — nothing written.');
        return;
      }

      if (takeProposal) {
        const rest = stackOrder().filter((s) => !detected.has(s));
        const extra = await promptStacks({
          message: 'Anything else?',
          initial: new Set(),
          found,
          declared: new Set(),
          choices: rest
        });
        if (extra === null) {
          consola.info('Cancelled — nothing written.');
          return;
        }
        stacks = stackOrder().filter(
          (s) => detected.has(s) || extra.includes(s)
        );
      } else {
        // Nothing pre-ticked: "no" rejected the proposal, so re-offering it as
        // the default would just be something to un-tick. Each row still says
        // where its signal came from.
        const picked = await promptStacks({
          message: 'Pick the stacks yourself:',
          initial: new Set(),
          found,
          declared: new Set()
        });
        if (picked === null) {
          consola.info('Cancelled — nothing written.');
          return;
        }
        stacks = picked;
      }
    }

    // The header is input, the sections are output: init only ever writes the
    // declaration, and reconcile renders the blocks from it.
    const seeded = {
      ...existing,
      header: [stacksLine(stacks), DIVIDER],
      hasRegion: true
    };
    const result = reconcile(seeded);
    const output = render(result.document);

    consola.log(`  ${colors.dim(stacksLine(stacks))}`);
    report(result);

    if (args['dry-run']) {
      consola.log(output);
      return;
    }
    writeGitignore(dir, output);
    consola.success(`Wrote ${gitignorePath(dir)}`);
  }
});
