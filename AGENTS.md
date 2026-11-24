# gitignore-sync

`gitignore-sync` is a CLI that **keeps** a repo's `.gitignore` maintained: curated blocks (`core` plus one per declared stack) inside a managed region it owns, re-rendered idempotently, nothing outside the region touched. `gitignore.io`, `gig` and `ignr` fetch and dump once; re-syncing is the whole point, hence `-sync`.

The settled decisions and their reasons are in [`docs/99.adr/`](docs/99.adr/index.md). Change a decision only against its reason, and record the change as a new ADR.

## Commands

| Command               | What it does                                                                       |
| :-------------------- | :--------------------------------------------------------------------------------- |
| `pnpm install`        | Install deps; `prepare` wires the husky hooks                                      |
| `pnpm build`          | `vite build` → `dist/bin/gitignore-sync.mjs`                                       |
| `pnpm dev`            | `vite build --watch`                                                               |
| `pnpm link`           | Build, then register this work tree as the global command                          |
| `pnpm test`           | `vitest run`                                                                       |
| `pnpm lint`           | `oxlint . --deny-warnings`                                                         |
| `pnpm format`         | `oxfmt --check .` — the **check**, not the fix                                     |
| `pnpm typecheck`      | `tsc --noEmit`                                                                     |
| `pnpm check:policy`   | Proves the Claude and Codex policy files ban the same commands                     |
| `pnpm check`          | `lint` + `format` + `typecheck` + `check:policy` + `test` + `build` — the CI gate  |
| `pnpm check:fix`      | Auto-fix lint + format                                                             |
| `pnpm templates:lock` | Rewrite `tests/templates.lock.json`                                                |
| `pnpm sea:build`      | After `pnpm build`: a single executable for this platform → `dist/release/`        |
| `pnpm skills:update`  | Update project-scoped agent skills via the skills.sh CLI                           |
| `pnpm taze`           | Interactive dependency upgrade check                                               |

## The file format

```gitignore
# region gitignore-sync
# stacks: core, node, vscode, intellij
# ─────────────────────────────────────────

# region core@v1
.DS_Store
# endregion

# region node@v1
node_modules
dist
coverage
# endregion

# endregion

frankenphp
/bootstrap/ssr
```

- **Configuration lives in the `.gitignore` itself** — no second config file ([ADR-0001](docs/99.adr/0001-keep-the-configuration-in-the-gitignore-itself.md)).
- **The `stacks:` header is input, the sections are output.** A difference between them is the pending change, not an error. Dropping a stack = delete it from the header and run `sync`.
- **Markers are `# region` … `# endregion`** (VSCode folds them), and the version sits in the section marker (`node@v1`) so `check` can spot a stale block ([ADR-0002](docs/99.adr/0002-mark-managed-blocks-with-foldable-region-comments.md)).
- **`core` is listed explicitly, never rendered implicitly**, and holds `.DS_Store` and nothing else. Anything tool-specific belongs in a droppable stack ([ADR-0006](docs/99.adr/0006-give-each-line-one-stack-and-keep-core-to-ds-store.md)).

### Detection

| Command         | Detection                                               |
| :-------------- | :------------------------------------------------------ |
| `init`          | **yes** — fingerprint the repo, propose the header      |
| `sync`          | **no** — render from the header, nothing else           |
| `sync --detect` | **proposes** header changes, never applies them         |

Adding a `composer.json` must never quietly rewrite a `.gitignore` ([ADR-0003](docs/99.adr/0003-detect-only-at-init-and-gate-unconfirmed-writes-on-committed-evidence.md)).

### Reconciliation — what makes a second run safe

- A hand-written line found **inside** a managed section is **moved to the free zone**, never dropped.
- Dedup removes only exact string duplicates. `.idea`, `.idea/`, `/.idea` and `.idea/*` differ to git: equivalence is **reported, never merged** ([ADR-0004](docs/99.adr/0004-rescue-hand-written-lines-and-report-equivalent-spellings.md)).
- A bare `.idea` / `.vscode` beside a managed block disables every `!` exception the block renders; `reconcile` reports it as `smothered`, louder than an equivalence.
- The free zone is filtered **block by block** (blank lines separate blocks): a comment heading whose patterns were all absorbed is dropped as an orphan; a pure note, or a heading over a surviving pattern, stays.
- Every non-blank free-zone line survives verbatim and in order; only blank padding at its edges is normalised. That is what makes a second `sync` a no-op and `check` usable as a gate.

## Module shape — keep the core pure

```
parse(text)      → Document { header, sections, freeZone, hasRegion }
render(Document) → text
reconcile(doc)   → Reconciliation { document, rescued, duplicates, covered, equivalences, … }
detect(dir)      → Detected[] { stack, source }
templates        → Record<stack, Template[]>   // data, versioned with the binary
```

- **`parse`, `render` and `reconcile` (`src/gitignore/`) touch no filesystem.** Test them with fixture pairs under `tests/fixtures/` (`<name>.in` / `<name>.out`), **never with temporary directories**. `tests/fixtures.test.ts` picks a new pair up and asserts idempotency on top.
- Filesystem contact is limited to `src/io.ts`, `src/detect.ts`, `src/discover.ts` and the `check`, `audit` and `info` commands. Keep the commands (`init`, `edit`, `add`, `remove`, `sync`, `check`, `list`, `audit`, `info`) thin over the pure parts.
- `check` is the CI gate: dry run, reports drift and duplicates, exits non-zero on deviation.
- `info` describes the installation, not the file: `linked / dev build`, `installed release` or `single executable`.
- `edit`, `add` and `remove` only rewrite the `# stacks:` line and re-render.
- **`init` and `edit` are interactive; `add` and `remove` are their scriptable form.** `init` asks in two steps: confirm the whole proposal, then a multiselect over the rest; answering "no" falls back to picking by hand with nothing pre-ticked. `edit` is the same multiselect over an existing header.
- **Never hang or guess without a TTY.** `init` without a TTY (or with `--yes` / `--stacks=`) takes committed detection and writes. `edit` refuses and names `add` / `remove`.

## Detection sources

There is one fingerprint table and one `detect(dir)` pass (`src/detect.ts`). Each signal carries a `source`:

| `source`  | Reads                                                                    | Holds for           |
| :-------- | :----------------------------------------------------------------------- | :------------------ |
| `repo`    | committed markers — `package.json`, `go.mod`, `*.tf`, `.env.example` …   | everyone who clones |
| `machine` | `.vscode/`, `.idea/`, `$EDITOR`/`$VISUAL`, `process.platform`            | one keyboard        |

- Both are proposed together, unsorted, in the prompt.
- `source` decides only whether a signal may write the committed header **unconfirmed**: `committedOnly()` filters to `repo`, and `init --yes` and the no-TTY path are its only callers. They must say what they skipped and how to add it back. `tests/detect.test.ts` pins that `.vscode/` and `.idea/` never pass `committedOnly`.
- Pattern fingerprints search below the root to `PATTERN_DEPTH`; `examples/` is never descended into. A fingerprint may narrow itself with `skip` (`python` ignores `docs/`) or `beside` (`vite.config.*` counts only next to an `index.html`).

## Stacks

Templates live in `src/templates/index.ts`. A stack ships on evidence from the 28 locally cloned `kirchDev` / `TitusKirch` repos, **or** on the word of the tool that writes the files (its scaffold's `.gitignore` or documented output) — never on a public template site's guess ([ADR-0009](docs/99.adr/0009-accept-stacks-on-the-word-of-the-tool-that-writes-the-files.md)). The provenance comment above each template names its source; the count below stays honest, `0` included.

| Stack        | Fingerprint                                                         | Repos |
| :----------- | :------------------------------------------------------------------ | ----: |
| `core`       | always proposed                                                     |    27 |
| `agents`     | `.claude/`, `.codex/`, `.opencode/`                                 |    26 |
| `git`        | `.git`                                                              |    27 |
| `node`       | `package.json`                                                      |    26 |
| `dotenv`     | `.env.example` / `.env`                                             |     7 |
| `php`        | `composer.json`                                                     |     3 |
| `go`         | `go.mod`                                                            |     3 |
| `python`     | `pyproject.toml` / `requirements.txt` / `setup.py`, not in `docs/`  |     0 |
| `turborepo`  | `turbo.json`                                                        |     3 |
| `tofu`       | `*.tf` / `*.tofu` / lock file                                       |     1 |
| `laravel`    | `artisan`                                                           |     1 |
| `octane`     | `config/octane.php`                                                 |     3 |
| `helm`       | `Chart.yaml`                                                        |     0 |
| `nuxt`       | `nuxt.config.*`                                                     |     1 |
| `vite`       | `vite.config.*` beside an `index.html`                              |     1 |
| `tauri`      | `src-tauri/`                                                        |     1 |
| `storybook`  | `.storybook/`                                                       |     1 |
| `gradle`     | `build.gradle*` / `settings.gradle*`                                |     1 |
| `rust`       | a **root** `Cargo.toml`                                             |     0 |
| `playwright` | `playwright.config.*`                                               |     0 |
| `vscode`     | a `.vscode/` here _(machine)_                                       |     — |
| `intellij`   | a `.idea/` here _(machine)_                                         |     — |
| `vim`        | `$EDITOR` / `$VISUAL` _(machine)_                                   |     — |
| `macos`      | `process.platform` _(machine)_                                      |     — |
| `windows`    | `process.platform` _(machine)_                                      |     — |
| `linux`      | `process.platform` _(machine)_                                      |     — |

Why the zeros: `rust` matches a root `Cargo.toml` only (the Tauri crate under `src-tauri/` belongs to `tauri`); `playwright` and `python` are in the estate but nothing there triggers the fingerprint, so they are declared by hand (`python` was contributed for three `kirch-ostendorf` Ansible repos); `helm` and `vite` ship on their tool's word.

### Template rules

- **Add a version, never edit one in place.** `src/templates/index.ts` keeps every shipped version, ascending, because `reconcile` reads the version the marker names. `tests/templates.lock.test.ts` fails when a locked version changes. After adding a version run `pnpm templates:lock`, then `oxfmt` over the lock; a diff on an existing entry is a reviewer question. Dropping a very old version is allowed — `reconcile` falls back to the current one ([ADR-0005](docs/99.adr/0005-version-templates-append-only-behind-a-lock.md)).
- **No line in two stacks** — enforced by `tests/templates.test.ts` ([ADR-0006](docs/99.adr/0006-give-each-line-one-stack-and-keep-core-to-ds-store.md)).
- **Never a bare `.vscode/` or `.idea/`.** Always `.vscode/*` plus targeted `!` exceptions — and only for files the estate actually tracks (`extensions.json`, `settings.json`, `mcp.json`). `intellij` ships no exceptions.
- **`agents` holds machine-local files only** (`settings.local.json`, `.claude/worktrees/`, `.codex/config.toml` from v2) — the rest of `.claude/`, `.codex/`, `.opencode/` is committed. Ignore the file, never the directory.
- **`node_modules` and `dist` belong to `node`**, not `core` or `go`; `dist/` and `build/` stay out of `python`.
- **`octane` and `php@v2` / `laravel@v2` use their installer's or skeleton's exact spelling**, so a fresh install is absorbed rather than reported as an equivalence. `/auth.json`, `.phpactor.json` and `/.phpstan.cache` are `php`'s; `/storage/pail` is the only `storage/` path a template may name. The skeleton's editor and agent lines (`/.codex`, `/.cursor/`, `/.nova`, `/.zed`) are in neither.
- **Deliberately absent:** `composer.lock`, `.terraform.lock.hcl`, `Chart.lock`, a bare `charts/` (`helm` names `**/charts/*.tgz` only), `*.jar`, `*.py[cod]`, a `java` or `maven` stack (the JVM stack is `gradle`), a `prisma` stack. See [`docs/1.concepts/4.templates.md`](docs/1.concepts/4.templates.md).
- **Measure before adding a stack:** `gitignore-sync audit <dirs…>` runs the real `reconcile` with every stack declared and reports what is left (`--json` available). Use it rather than reimplementing the semantics. A stack that moves the number by one line ships only on its tool's word; otherwise it is a free-zone rule. Steps: [`docs/2.guides/3.add-a-stack.md`](docs/2.guides/3.add-a-stack.md).

## Nested `.gitignore`s

`src/discover.ts` classifies every file it finds ([ADR-0007](docs/99.adr/0007-classify-nested-gitignores-before-acting-on-them.md)):

| Kind        | Recognised by                                                                                                     | Treatment                       |
| :---------- | :---------------------------------------------------------------------------------------------------------------- | :------------------------------ |
| `managed`   | carries `# region gitignore-sync`                                                                                 | checked by `check --recursive`  |
| `keeper`    | **content**: `*` plus `!.gitignore`                                                                               | skipped                         |
| `framework` | **path** at any depth: `storage/`, `bootstrap/cache/`, `.husky/` — or `database/.gitignore` holding exactly `*.sqlite*` | skipped                   |
| `plain`     | everything else                                                                                                   | measured by `audit --recursive` |

`--include-stubs` measures keepers and framework stubs anyway.

A recursive scan never walks into generated output. The skip list derives from the templates (only **bare** names — never the last segment of a rooted path like `/public/build`; `build/` is skipped everywhere because `gradle` ignores it bare) and from the repo's own `.gitignore`, inherited downwards. A directory with its own `.git` (submodule, worktree) is skipped too.

`init` and `sync` never walk the tree. A package that genuinely needs its own region is targeted explicitly (`gitignore-sync init apps/web --stacks=node,nuxt`); most sub-files repeat the root and should not exist.

## Distribution

- **GitHub Action:** `action.yml` is a **composite** action wrapping `npx @kirchdev/gitignore-sync check`, adding only a job summary and a `status` output. Do not bundle it like `kirchDev/coverage-report` ([ADR-0008](docs/99.adr/0008-ship-the-ci-gate-as-a-composite-action.md)). Most repos just add `gitignore-sync check` to their `check` script, which `_ci-check.yml` picks up.
- **Single executables** for `darwin`/`linux` × `arm64`/`x64`, built by `sea.yml` on pull requests touching the build and called by `release-please.yml` for stable releases ([ADR-0010](docs/99.adr/0010-ship-standalone-binaries-as-node-single-executables.md)). Traps: the entry is CommonJS (`vite.sea.config.ts`) and must stay **one file** (the embedder's `require` loads builtins only); darwin needs `--macho-segment-name NODE_SEA` plus an ad-hoc re-sign; `pnpm build` must run before `pnpm sea:build`. `scripts/sea-build.ts` runs the binary before packaging. Archive names carry no version. No Windows binary, and no `bun build --compile`.

## Conventions

- **Node 24, pnpm 12** — pinned via `.nvmrc`, `engines` and `packageManager`. Not Bun. `pnpm-workspace.yaml` sets the 3-day `minimumReleaseAge` and the isolated linker; leave `pmOnFail` unset (the file says why).
- **oxc**, not eslint/prettier: `.oxlintrc.json`, `.oxfmtrc.json`.
- **TypeScript under `erasableSyntaxOnly`** — no enums, no parameter properties — so the scripts and `*.config.ts` run directly on Node 24. Source imports carry `.ts` extensions.
- **Published as `@kirchdev/gitignore-sync`**; the `bin` entries (`gitignore-sync`, `gis`) and release-please's `package-name` stay unscoped.
- **Never commit the `overrides:` block** `pnpm link` writes into `pnpm-workspace.yaml`; `pnpm unlink` reverts it.
- **Never hand-copy a version literal.** `--version` is injected by vite's `define` from `package.json`, which release-please owns.
- **Runtime deps stay `citty`, `consola`, `pathe`.** No `c12` / `defu` (there is no config file). `postject` is a dev dependency only.
- **Hooks:** `pre-commit` runs `lint-staged` (skips `README.md`, `AGENTS.md`, `pnpm-lock.yaml`), `commit-msg` runs commitlint with `@commitlint/config-conventional`. Never `--no-verify` unless explicitly asked.
- **release-please:** `release-type: node`, `include-v-in-tag: true` — `release-please-config.json`, `.release-please-manifest.json`.
- **Action pins:** GitHub's own actions by major version (`actions/checkout@v7`), everything else — `kirchDev/workflows` included — by commit SHA with the version as a comment. Dependabot bumps both.
- **Secrets:** workflows pass only `BWS_ACCESS_TOKEN`. If a Bitwarden secret id is ever written into a workflow here, it must be the `kirchDev` one (`df8b447a-ffd5-4009-9cc3-b49b014f6978`), never `TitusKirch`'s — a mismatch fails silently.

## Branching

Branch off `dev`, PR into `dev`. `promotion-pr.yml` keeps a draft `dev` → `main` rollup PR open; merge it with a **merge commit, never a squash**, or release-please cuts nothing. release-please releases from `main`. Worktree drains may group PRs behind an `ai/queue-*` branch (`queue-branch.yml`), which `fast-forward-queue.yml` lands by fast-forward after approval. The `pull_request` filters of `ci.yml`, `codeql.yml` and `sea.yml` name both `main` and `dev`; `ci.yml` takes no path filter, because `CI / Gate` is a required check.

## Agent config and permissions

- **`.tituskirch-skills.json`** configures the [TitusKirch skills](https://github.com/TitusKirch/skills); reconcile it with the `tituskirch-skills-config` skill. The skills are installed with `pnpm dlx skills add TitusKirch/skills`, not vendored.
- **`.claude/settings.json`** is the baseline permission policy; `.claude/settings.local.json` is gitignored.
  - **`deny` may be generous** and covers stacks the estate might grow into. It blocks what wrecks the machine or remote state, or destroys work without a recovery path (force-push, `reset --hard`, `stash drop`, `git reflog expire`, `git gc --prune=now`). Ordinary local destruction (`rm -rf node_modules`, `docker compose down -v`, deleting a remote branch) must **prompt**, not be denied.
  - **`allow` stays short**: only what runs many times per session (read-only git, `ls`/`grep`/`rg`, the project's check scripts, plain `git push`).
  - > [!IMPORTANT]
    > **Never allow a rule that runs arbitrary code** — `pnpm exec turbo run`, `find . *`, a raw `pnpm dlx`, an SQL-executing MCP tool.
  - Permissions cannot see a push's target branch (use branch protection) and miss flags placed before a subcommand.
- **`.codex/rules/default.rules`** carries the same ban list as `prefix_rule()`s, each with `match`/`not_match` cases. **Change both files together.** Check a rule with `codex execpolicy check --pretty --rules .codex/rules/default.rules -- git push --force`.
  - `pnpm check:policy` (`scripts/check-policy-parity.ts`) proves both list the same spellings. A difference the two languages cannot close must be declared in the script's `DELIBERATE` list **and** the rules file header; an undeclared difference and a stale declaration both fail.
  - Neither side normalises flag order or case — `rm -rf /` and `rm -fr /` are separate bans.

## READMEs and meta files

Follow the `/write-readme` skill: hero block in `<div align="center">`, the prescribed section emojis (✨ Features, 🚀 Setup, 🤝 Contributing, 🛣️ Versioning, 📄 License), the license footer `[MIT](LICENSE) © [Titus Kirch](https://github.com/TitusKirch/) / [IT-Dienstleistungen Titus Kirch](https://kirch.dev)`, and GitHub callouts (`> [!TIP]`) instead of plain blockquotes.
