import { runMain } from 'citty';
import { rootCommand } from '../cli.ts';

// `gitignore-sync list | head` closes stdout while consola is still writing to
// it. Node turns that into an unhandled 'error' event and a stack trace; every
// other CLI in a pipe just stops. Swallow it and exit quietly.
process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') process.exit(0);
  throw error;
});

runMain(rootCommand);
