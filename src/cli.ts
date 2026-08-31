import { defineCommand } from 'citty';
import { checkCommand } from './commands/check.ts';
import { editCommand } from './commands/edit.ts';
import { addCommand, removeCommand } from './commands/stacks.ts';
import { initCommand } from './commands/init.ts';
import { listCommand } from './commands/list.ts';
import { syncCommand } from './commands/sync.ts';

// Injected at build time by vite's `define` (see vite.config.ts), sourced from
// package.json's `version`, which release-please owns.
declare const __APP_VERSION__: string;

export const rootCommand = defineCommand({
  meta: {
    name: 'gitignore-sync',
    version: __APP_VERSION__,
    description:
      "Keep a repo's .gitignore maintained: curated blocks in a managed region, re-rendered on demand"
  },
  subCommands: {
    init: initCommand,
    edit: editCommand,
    add: addCommand,
    remove: removeCommand,
    sync: syncCommand,
    check: checkCommand,
    list: listCommand
  }
});
