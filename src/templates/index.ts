import type { Template } from '../gitignore/types.ts';

/**
 * Curated blocks, versioned with the binary. Data, not code.
 *
 * Every version a stack has ever shipped is kept, ascending. Reconciling reads
 * the version the section marker names, so upgrading `node@v1` to `node@v2`
 * knows which of the block's lines it put there itself and which the user
 * added — without that history an upgrade would "rescue" its own dropped lines
 * into the free zone.
 *
 * **No line may appear in two stacks.** A repo declaring both would otherwise
 * render it twice, and the equivalence report would nag about a collision the
 * tool created itself. `tests/templates.test.ts` enforces this.
 */
const registry: Record<string, Template[]> = {
  // The one file every repo in the estate ignores (26 of 26): a mixed-OS team
  // collects it whoever commits, which is why it sits here rather than in
  // `macos`. The rest of the macOS noise is rare and does live there.
  //
  // Nothing tool-specific belongs in `core` — the agent settings moved to
  // `agents` for exactly that reason.
  core: [
    {
      stack: 'core',
      version: 1,
      lines: ['.DS_Store']
    }
  ],
  // Agent working files, not agent configuration. The distinction is the whole
  // point: across the estate 126 files under `.claude/`, `.codex/` and
  // `.opencode/` are committed — settings.json, skills, rules, agent
  // definitions. Only these two describe one machine.
  //
  // `.claude/worktrees/` is included because it accumulates for real, and today
  // the only repo that ignores it does so in `.git/info/exclude` — private
  // knowledge that belongs in a file the whole team can see.
  agents: [
    {
      stack: 'agents',
      version: 1,
      lines: ['.claude/settings.local.json', '.claude/worktrees/']
    }
  ],
  // Conflict and backup droppings every git repo can produce. Fingerprinted on
  // `.git` itself, so `init` proposes it everywhere — but it stays a stack you
  // can drop, which is why it is not folded into `core`.
  git: [
    {
      stack: 'git',
      version: 1,
      lines: [
        '*.orig',
        '*.rej',
        '*.BACKUP.*',
        '*.BASE.*',
        '*.LOCAL.*',
        '*.REMOTE.*',
        '*_BACKUP_*.txt',
        '*_BASE_*.txt',
        '*_LOCAL_*.txt',
        '*_REMOTE_*.txt'
      ]
    }
  ],
  // `node_modules` lives here, not in `core`: a pure Go repo then correctly
  // does not get it. That it lands almost everywhere in practice (26 of 28
  // local repos carry a package.json) is a consequence of the estate, not a
  // reason to blur the model.
  node: [
    {
      stack: 'node',
      version: 1,
      lines: [
        'node_modules',
        'dist',
        'coverage',
        // Anchored: a bare `logs` matches every directory of that name at any
        // depth, including Laravel's `storage/logs` and the keeper it commits
        // there. Nothing in the estate has a root `logs/`, so the anchor costs
        // nothing. Found by running the rollout against `gildstone`.
        '/logs',
        '*.log',
        '*.tsbuildinfo',
        '.eslintcache',
        '.npm',
        '*.tgz'
      ]
    }
  ],
  // Build and test droppings only. `dist` is deliberately absent — goreleaser
  // writes there, but so does every bundler, and the line belongs to whichever
  // stack claims it once. `node` claims it.
  go: [
    {
      stack: 'go',
      version: 1,
      lines: ['*.exe', '*.test', '*.out', '*.prof']
    }
  ],
  // State and local overrides. `.terraform.lock.hcl` is deliberately **not**
  // ignored — it is meant to be committed. `*.tfvars` usually carries
  // credentials, so it is ignored with the example carved back out.
  tofu: [
    {
      stack: 'tofu',
      version: 1,
      lines: [
        '.terraform/',
        '*.tfstate',
        '*.tfstate.*',
        '*.tfvars',
        '!*.tfvars.example',
        'override.tf',
        'override.tf.json',
        '.terraformrc',
        'terraform.rc',
        'crash.log',
        'crash.*.log'
      ]
    }
  ],
  // `composer.lock` is not here on purpose: a library ignores it, an
  // application commits it. That is a project decision, so it belongs in the
  // free zone rather than in a block the tool re-renders.
  php: [
    {
      stack: 'php',
      version: 1,
      lines: ['/vendor', '/.phpunit.cache', '/.phpunit.result.cache']
    }
  ],
  // `/storage/pail` is deliberately absent, and so is every other `storage/`
  // subdirectory: Laravel commits a directory keeper in each of them (`*` plus
  // `!.gitignore`), which already ignores their contents. Repeating the path
  // here would ignore the keeper itself — the same defect a bare `.vscode`
  // causes, only self-inflicted. Found by running the rollout against `app`.
  laravel: [
    {
      stack: 'laravel',
      version: 1,
      lines: [
        '/public/build',
        '/public/hot',
        '/public/storage',
        '/storage/*.key',
        '/bootstrap/ssr',
        '_ide_helper.php',
        '_ide_helper_models.php',
        '.phpstorm.meta.php'
      ]
    }
  ],
  // Three repos in the estate run turbo (`oggsbreinig`, `gildstone`, and the
  // campus monorepo); all three ignore its cache.
  turborepo: [
    {
      stack: 'turborepo',
      version: 1,
      lines: ['.turbo']
    }
  ],
  // The crate target dir. Fingerprinted on a **root** `Cargo.toml` only: a
  // Tauri app keeps one under `src-tauri/`, and that build output is already
  // the `tauri` stack's, so matching it here would render a `/target` line
  // pointing at nothing.
  rust: [
    {
      stack: 'rust',
      version: 1,
      lines: ['/target', '**/*.rs.bk']
    }
  ],
  playwright: [
    {
      stack: 'playwright',
      version: 1,
      lines: [
        'test-results/',
        'playwright-report/',
        'blob-report/',
        '.last-run.json'
      ]
    }
  ],
  storybook: [
    {
      stack: 'storybook',
      version: 1,
      lines: ['storybook-static']
    }
  ],
  nuxt: [
    {
      stack: 'nuxt',
      version: 1,
      lines: ['.nuxt', '.output', '.nitro', '.data']
    }
  ],
  tauri: [
    {
      stack: 'tauri',
      version: 1,
      lines: ['src-tauri/target', 'src-tauri/gen/schemas']
    }
  ],
  // Language-agnostic: the three Go providers carry `.env` just as the Laravel
  // app does. The `!` exceptions matter — six local repos track a committed
  // `.env.example`, and a bare `.env.*` would swallow it.
  dotenv: [
    {
      stack: 'dotenv',
      version: 1,
      lines: [
        '.env',
        '.env.*',
        '!.env.example',
        '!.env.*.example',
        // Laravel commits this one alongside the example: it holds the test
        // suite's settings, not credentials.
        '!.env.testing'
      ]
    }
  ],
  // `.vscode/*` plus targeted `!` exceptions, never a bare `.vscode/`: git does
  // not descend into an ignored directory, which makes exceptions under it
  // technically impossible.
  //
  // The three exceptions are the ones actually tracked across the estate —
  // `extensions.json` in every repo that shares anything, `settings.json` in
  // seven, `mcp.json` in two. `tasks.json` and `*.code-snippets`, which the
  // toptal block unignores, are tracked by no repo at all and are left out.
  vscode: [
    {
      stack: 'vscode',
      version: 1,
      lines: [
        '.vscode/*',
        '!.vscode/extensions.json',
        '!.vscode/settings.json',
        '!.vscode/mcp.json'
      ]
    }
  ],
  // `.idea/*` and no exceptions: no repo in the estate tracks any `.idea`
  // content, so sharing it is so far theoretical. The `/*` form is kept anyway
  // so an exception can be added later without a breaking reshape.
  intellij: [
    {
      stack: 'intellij',
      version: 1,
      lines: ['.idea/*']
    }
  ],
  // `.DS_Store` is in `core`, not here — see the comment there.
  macos: [
    {
      stack: 'macos',
      version: 1,
      // `Icon` is deliberately absent: toptal writes it with a trailing CR, and
      // without that byte the pattern matches every file named "Icon".
      lines: [
        '.AppleDouble',
        '.LSOverride',
        '._*',
        '.Spotlight-V100',
        '.Trashes',
        '.DocumentRevisions-V100',
        '.fseventsd',
        '.TemporaryItems',
        '.VolumeIcon.icns',
        '.com.apple.timemachine.donotpresent',
        '.AppleDB',
        '.AppleDesktop',
        'Network Trash Folder',
        'Temporary Items',
        '.apdisk',
        '*.icloud'
      ]
    }
  ],
  windows: [
    {
      stack: 'windows',
      version: 1,
      lines: [
        'Thumbs.db',
        'Thumbs.db:encryptable',
        'ehthumbs.db',
        'ehthumbs_vista.db',
        '[Dd]esktop.ini',
        '$RECYCLE.BIN/',
        '*.stackdump',
        '*.cab',
        '*.msi',
        '*.msix',
        '*.msm',
        '*.msp',
        '*.lnk'
      ]
    }
  ],
  // Swap and session files. A person-level stack like the two editors above —
  // nothing in a repo says who edits it with vim.
  vim: [
    {
      stack: 'vim',
      version: 1,
      lines: ['*.swp', '*.swo', '*.swn', 'Session.vim', '.netrwhist']
    }
  ],
  linux: [
    {
      stack: 'linux',
      version: 1,
      lines: ['*~', '.fuse_hidden*', '.directory', '.Trash-*', '.nfs*']
    }
  ]
};

/**
 * Registry insertion order, which is the order `init` writes into the header:
 * `core` first, then repository stacks, then the person-level ones. Stable, so
 * the `# stacks:` line does not churn between runs.
 */
export const stackOrder = (): string[] => Object.keys(registry);

export const knownStacks = (): string[] => Object.keys(registry).sort();

export const isKnownStack = (stack: string): boolean => stack in registry;

/** The version a fresh render of this stack produces. */
export function currentTemplate(stack: string): Template | undefined {
  return registry[stack]?.at(-1);
}

/** A specific past version, for working out what a section put there itself. */
export function templateAt(
  stack: string,
  version: number
): Template | undefined {
  return registry[stack]?.find((t) => t.version === version);
}
