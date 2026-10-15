import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

// The entry for the single executable, and nothing else. The npm artifact is
// still `vite.config.ts`'s job; this one exists because a SEA needs two things
// that bundle cannot give it:
//
//   - **CommonJS.** Node's embedder runs a single executable's main script as
//     CJS. An ESM entry fails at startup with "Cannot use import statement
//     outside a module", which is why `dist/bin/gitignore-sync.mjs` cannot be
//     injected directly.
//   - **No externals but node's builtins.** A single executable carries no
//     `node_modules`, so citty, consola and pathe have to be inlined rather
//     than resolved at runtime.
//
// Everything else is deliberately identical to the npm build, the inlined
// version included, so `--version` reads the same out of either artifact.

const root = dirname(new URL(import.meta.url).pathname);

const nodeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`)
]);

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  version: string;
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    target: 'node24',
    outDir: 'dist/sea',
    // `vite.config.ts` writes `dist/bin` and empties `dist` to do it. Emptying
    // again here would delete the npm artifact, and the release builds both.
    emptyOutDir: false,
    sourcemap: false,
    minify: false,
    lib: {
      entry: {
        entry: resolve(root, 'src/bin/gitignore-sync.ts')
      },
      formats: ['cjs']
    },
    rollupOptions: {
      external: (id) => nodeBuiltins.has(id),
      output: {
        entryFileNames: '[name].cjs',
        chunkFileNames: 'chunks/[name]-[hash].cjs'
      }
    }
  }
});
