import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { committedOnly, detect, stacksOf } from '../src/detect.ts';

const fresh = (): string => mkdtempSync(join(tmpdir(), 'gis-'));
const names = (dir: string): string[] => stacksOf(detect(dir));
const platformStack = { darwin: 'macos', win32: 'windows', linux: 'linux' }[
  process.platform as string
];

describe('detect', () => {
  it('always proposes core', () => {
    expect(names(fresh())).toContain('core');
  });

  it('fingerprints node from package.json', () => {
    const dir = fresh();
    writeFileSync(join(dir, 'package.json'), '{}');
    expect(names(dir)).toContain('node');
  });

  it('fingerprints tofu from a bare *.tf file', () => {
    const dir = fresh();
    writeFileSync(join(dir, 'main.tf'), '');
    expect(names(dir)).toContain('tofu');
  });

  it('fingerprints laravel from artisan and php from composer.json', () => {
    const dir = fresh();
    writeFileSync(join(dir, 'composer.json'), '{}');
    writeFileSync(join(dir, 'artisan'), '');
    expect(names(dir)).toEqual(
      expect.arrayContaining(['core', 'php', 'laravel'])
    );
  });

  it('fingerprints dotenv from a committed .env.example', () => {
    const dir = fresh();
    writeFileSync(join(dir, '.env.example'), '');
    expect(names(dir)).toContain('dotenv');
  });

  it('proposes git only inside a repository', () => {
    const dir = fresh();
    expect(names(dir)).not.toContain('git');
    mkdirSync(join(dir, '.git'));
    expect(names(dir)).toContain('git');
  });

  it('returns stacks in a stable registry order', () => {
    const dir = fresh();
    writeFileSync(join(dir, 'go.mod'), '');
    writeFileSync(join(dir, 'package.json'), '{}');
    const found = names(dir);
    expect(found.indexOf('node')).toBeLessThan(found.indexOf('go'));
  });
});

describe('signal sources', () => {
  it('labels a committed marker as coming from the repo', () => {
    const dir = fresh();
    writeFileSync(join(dir, 'package.json'), '{}');
    expect(detect(dir)).toContainEqual({ stack: 'node', source: 'repo' });
  });

  it('labels an editor directory as coming from the machine', () => {
    const dir = fresh();
    mkdirSync(join(dir, '.vscode'));
    expect(detect(dir)).toContainEqual({ stack: 'vscode', source: 'machine' });
  });

  it('labels the platform as coming from the machine', () => {
    if (!platformStack) return;
    expect(detect(fresh())).toContainEqual({
      stack: platformStack,
      source: 'machine'
    });
  });

  it('reads vim from $EDITOR', () => {
    const before = process.env.EDITOR;
    process.env.EDITOR = '/usr/bin/nvim';
    try {
      expect(stacksOf(detect(fresh()))).toContain('vim');
    } finally {
      if (before === undefined) delete process.env.EDITOR;
      else process.env.EDITOR = before;
    }
  });

  // The header is committed. A CI runner's platform is nobody's but the
  // runner's, so it must not write itself into a claim about the whole team.
  it('committedOnly drops every machine signal', () => {
    const dir = fresh();
    writeFileSync(join(dir, 'package.json'), '{}');
    mkdirSync(join(dir, '.vscode'));
    mkdirSync(join(dir, '.idea'));

    expect(stacksOf(detect(dir))).toEqual(
      expect.arrayContaining(['vscode', 'intellij'])
    );
    const safe = stacksOf(committedOnly(detect(dir)));
    expect(safe).toEqual(['core', 'node']);
  });
});
