import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'pathe';

export const gitignorePath = (dir: string): string =>
  join(isAbsolute(dir) ? dir : resolve(dir), '.gitignore');

/** A missing `.gitignore` reads as empty — that is `init`'s first-run case. */
export function readGitignore(dir: string): string {
  try {
    return readFileSync(gitignorePath(dir), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw error;
  }
}

export function writeGitignore(dir: string, text: string): void {
  writeFileSync(gitignorePath(dir), text, 'utf8');
}
