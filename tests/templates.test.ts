import { describe, expect, it } from 'vitest';
import {
  currentTemplate,
  knownStacks,
  stackOrder
} from '../src/templates/index.ts';

describe('templates', () => {
  it('ships core and node', () => {
    expect(knownStacks()).toContain('core');
    expect(knownStacks()).toContain('node');
  });

  it('puts node_modules in the node stack, not in core', () => {
    expect(currentTemplate('node')?.lines).toContain('node_modules');
    expect(currentTemplate('core')?.lines).not.toContain('node_modules');
  });

  it('unignores only the .vscode files the estate actually tracks', () => {
    expect(currentTemplate('vscode')?.lines).toEqual([
      '.vscode/*',
      '!.vscode/extensions.json',
      '!.vscode/settings.json',
      '!.vscode/mcp.json'
    ]);
  });

  it('never uses a bare .vscode/ or .idea/ — git cannot descend into it', () => {
    for (const stack of ['vscode', 'intellij']) {
      const lines = currentTemplate(stack)?.lines ?? [];
      expect(lines.some((l) => l.endsWith('/*'))).toBe(true);
      expect(lines).not.toContain('.vscode/');
      expect(lines).not.toContain('.idea/');
    }
  });

  it('has no duplicate lines within a block', () => {
    for (const stack of knownStacks()) {
      const lines = currentTemplate(stack)?.lines ?? [];
      expect(new Set(lines).size).toBe(lines.length);
    }
  });

  // A repo declaring both stacks would otherwise render the line twice, and the
  // equivalence report would nag about a collision the tool created itself.
  it('never puts the same line in two stacks', () => {
    const owner = new Map<string, string>();
    const collisions: string[] = [];
    for (const stack of knownStacks()) {
      for (const line of currentTemplate(stack)?.lines ?? []) {
        const first = owner.get(line);
        if (first) collisions.push(`${line} in ${first} and ${stack}`);
        else owner.set(line, stack);
      }
    }
    expect(collisions).toEqual([]);
  });

  it('ships a template for every stack detection can propose', () => {
    for (const stack of stackOrder()) {
      expect(currentTemplate(stack)).toBeDefined();
    }
  });
});
