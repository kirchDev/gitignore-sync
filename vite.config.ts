import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
// From vitest/config, not vite: vitest 4 no longer augments vite's UserConfig
// with the `test` key, so vite's own defineConfig rejects it.
import { defineConfig } from 'vitest/config';

const root = dirname(new URL(import.meta.url).pathname);

const nodeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`)
]);

const runtimeDeps = ['citty', 'consola', 'pathe'];

// Read the version straight from package.json at build time and inline it via
// `define` below, so `--version` never drifts from the published release.
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  version: string;
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    target: 'node24',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        'bin/gitignore-sync': resolve(root, 'src/bin/gitignore-sync.ts')
      },
      formats: ['es']
    },
    rollupOptions: {
      external: (id) => {
        if (nodeBuiltins.has(id)) return true;
        return runtimeDeps.some(
          (dep) => id === dep || id.startsWith(`${dep}/`)
        );
      },
      output: {
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
        banner: (chunk) =>
          chunk.name === 'bin/gitignore-sync' ? '#!/usr/bin/env node' : ''
      }
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/bin/**', 'src/cli.ts'],
      reporter: ['text', 'html', 'json', 'json-summary'],
      reportsDirectory: 'coverage'
    }
  }
});
