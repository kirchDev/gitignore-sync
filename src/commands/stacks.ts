import { defineCommand } from 'citty';
import consola from 'consola';
import { colors } from 'consola/utils';
import { parse, readStacks, withStacks } from '../gitignore/parse.ts';
import { reconcile } from '../gitignore/reconcile.ts';
import { render } from '../gitignore/render.ts';
import { gitignorePath, readGitignore, writeGitignore } from '../io.ts';
import { isKnownStack, knownStacks, stackOrder } from '../templates/index.ts';
import { report } from './report.ts';

const args = {
  stacks: {
    type: 'positional' as const,
    description: 'One or more stack names',
    required: true
  },
  dir: {
    type: 'string' as const,
    description: 'Repository directory (default: the current one)',
    default: '.'
  },
  'dry-run': {
    type: 'boolean' as const,
    description: 'Print the result instead of writing it',
    default: false
  }
};

/**
 * `add` and `remove` edit one line: the `# stacks:` declaration. Everything
 * below it is re-rendered from that line, so the two verbs stay a convenience
 * over an edit you could also make by hand — never a second source of truth.
 */
function edit(mode: 'add' | 'remove') {
  return (context: {
    args: {
      stacks?: string;
      dir?: string;
      'dry-run'?: boolean;
      _?: string[];
    };
  }) => {
    const a = context.args;
    const dir = a.dir ?? '.';
    // citty puts every positional in `_` and the first one *also* in `stacks`,
    // so reading both would count the first name twice.
    const raw = a._ && a._.length > 0 ? a._ : [a.stacks];
    const names = [
      ...new Set(
        raw.filter((n): n is string => typeof n === 'string' && n !== '')
      )
    ];

    if (names.length === 0) {
      consola.error('Name at least one stack.');
      consola.info(`Available: ${knownStacks().join(', ')}`);
      process.exitCode = 1;
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

    if (mode === 'add') {
      const unknown = names.filter((n) => !isKnownStack(n));
      if (unknown.length > 0) {
        consola.error(
          `Unknown stack: ${unknown.map((u) => colors.yellow(u)).join(', ')}`
        );
        consola.info(`Available: ${knownStacks().join(', ')}`);
        process.exitCode = 1;
        return;
      }
    }

    const before = readStacks(doc);
    const set = new Set(before);
    const changed: string[] = [];

    for (const name of names) {
      if (mode === 'add') {
        if (set.has(name)) continue;
        set.add(name);
      } else {
        if (!set.has(name)) continue;
        set.delete(name);
      }
      changed.push(name);
    }

    if (changed.length === 0) {
      consola.info(
        mode === 'add'
          ? 'Already declared — nothing to add.'
          : 'Not declared — nothing to remove.'
      );
      return;
    }

    // Registry order, so the header reads the same however the stacks arrived.
    const order = stackOrder();
    const next = [...set].sort((x, y) => {
      const ix = order.indexOf(x);
      const iy = order.indexOf(y);
      if (ix === -1 && iy === -1) return x.localeCompare(y);
      if (ix === -1) return 1;
      if (iy === -1) return -1;
      return ix - iy;
    });

    const result = reconcile(withStacks(doc, next));
    const output = render(result.document);

    consola.info(
      `${mode === 'add' ? 'Added' : 'Removed'} ${changed.map((c) => colors.cyan(c)).join(', ')}`
    );
    consola.log(`  ${colors.dim(`# stacks: ${next.join(', ')}`)}`);
    report(result);

    if (a['dry-run']) {
      consola.log(output);
      return;
    }
    writeGitignore(dir, output);
    consola.success(`Wrote ${gitignorePath(dir)}`);
  };
}

export const addCommand = defineCommand({
  meta: {
    name: 'add',
    description: 'Add stacks to the header and re-render'
  },
  args,
  run: edit('add')
});

export const removeCommand = defineCommand({
  meta: {
    name: 'remove',
    alias: 'rm',
    description: 'Remove stacks from the header and re-render'
  },
  args,
  run: edit('remove')
});
