<div align="center">

# 🧰 gitignore-sync

**Keeps your `.gitignore` maintained, not generated — curated blocks in a region the tool owns, everything else untouched**

[![npm Version](https://img.shields.io/npm/v/@kirchdev/gitignore-sync.svg?style=flat-square&color=4f46e5)](https://www.npmjs.com/package/@kirchdev/gitignore-sync)
[![Downloads](https://img.shields.io/npm/dm/@kirchdev/gitignore-sync.svg?style=flat-square&color=4f46e5)](https://www.npmjs.com/package/@kirchdev/gitignore-sync)
[![Tests](https://img.shields.io/github/actions/workflow/status/kirchDev/gitignore-sync/ci.yml?branch=main&style=flat-square&label=tests)](https://github.com/kirchDev/gitignore-sync/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/node/v/@kirchdev/gitignore-sync.svg?style=flat-square&color=8993be)](https://www.npmjs.com/package/@kirchdev/gitignore-sync)
[![License: MIT](https://img.shields.io/npm/l/@kirchdev/gitignore-sync.svg?style=flat-square&color=10b981)](LICENSE)

</div>

---

```bash
npx @kirchdev/gitignore-sync init     # fingerprint the repo, confirm, write the region
npx @kirchdev/gitignore-sync sync     # re-render it, any time, as often as you like
```

That's it. The blocks the tool owns stay current; every line you wrote yourself survives verbatim.

## 🤔 Why

`gitignore.io`, `gig` and `ignr` all _fetch and dump_: you pull a template once, paste it, and drift from there. None of them re-syncs, so a `.gitignore` grows into a few hundred lines of ballast nobody dares touch.

`gitignore-sync` keeps a **managed region** inside the file and re-renders it on demand. The rest of the file is a free zone the tool never writes to — which is what makes running it a second time safe, and a hundredth time boring.

## 📦 Installation

```bash
pnpm add -g @kirchdev/gitignore-sync   # npm i -g / yarn global add / bun add -g all work
```

Or run it without installing: `npx @kirchdev/gitignore-sync <command>`. The binary is also available as `gis`.

## 🚀 Quick start

```bash
gitignore-sync init             # detect, confirm in a prompt, write the region
gitignore-sync edit             # tick stacks on and off later
gitignore-sync add nuxt tauri   # or name them — for scripts and CI
gitignore-sync remove intellij  # drop one; your own lines are kept
gitignore-sync sync             # re-render from the header
gitignore-sync check            # CI gate: non-zero on drift
gitignore-sync list             # what this binary ships, and what you declare
gitignore-sync info             # which build is running, and what it sees
gitignore-sync audit ../*/      # how much of a whole estate the stacks cover
```

Every command takes `--help` and a directory (`--dir` for `add`/`remove`, positional elsewhere), and every writing command takes `--dry-run`.

> [!TIP]
> `init` shows everything it found — your editor and platform included — and asks once:
>
> ```
> ℹ Found 8 stacks: core, git, node, nuxt, tauri, dotenv, vscode, linux
> ? Use them? › Yes / No
> ```
>
> In CI it asks nothing — `--yes` or no terminal takes the committed fingerprints alone, says what it skipped, and writes. Your platform must not end up in a committed header because a pipeline ran.

## ✨ Features

- **🔁 Re-syncs, never re-dumps** — `sync` is idempotent, so it belongs in a habit, a hook or a cron, not in a one-off ritual.
- **🛡️ Your lines are never lost** — a hand-written line found inside a managed block is *moved* to the free zone, not deleted. That rule is what makes the second run safe.
- **🔍 Dedup that knows git** — exact duplicates go; `.idea`, `.idea/`, `/.idea` and `.idea/*` are four different patterns to git, so they are **reported**, never silently merged.
- **🧹 Orphaned headings swept** — when a managed block absorbs every pattern under a `# Comment`, the heading goes with them. A block that was only ever a note stays.
- **⚠️ Catches the mistake that breaks `!`** — a stray `.vscode` beside a `!.vscode/extensions.json` block silently disables it, because git never looks inside an ignored directory. That gets its own warning.
- **🧭 No surprise rewrites** — `init` detects, `sync` does not. Adding a `package.json` never quietly rewrites your `.gitignore`; `sync --detect` proposes and stops there.
- **🗂️ Folds in your editor** — the region uses `# region` / `# endregion`, so VSCode collapses a 40-line managed block to a single line, at both nesting levels.
- **📋 A real CI gate** — `check` reports drift and duplicates and exits non-zero, so a stale block fails the build instead of rotting.

## 🗂️ The shape

```gitignore
# region gitignore-sync
# stacks: core, node, vscode, intellij
# ─────────────────────────────────────────

# region core@v1
.DS_Store
.claude/settings.local.json
# endregion

# region node@v1
node_modules
dist
coverage
# endregion

# endregion

# ─── your rules, never touched ───
frankenphp
/bootstrap/ssr
```

Everything below the closing `# endregion` is the **free zone**: yours, preserved line for line.

## 🧩 Stacks

Twenty curated blocks, each derived from what the estate actually ignores rather than from a public template site.

| Stack      | What it covers                       | Proposed by `init` when       |
| :--------- | :----------------------------------- | :---------------------------- |
| `core`     | `.DS_Store`, agent-local settings    | always                        |
| `git`      | merge and backup droppings           | always (it is a git repo)     |
| `node`     | modules, build output, logs, caches  | `package.json`                |
| `dotenv`   | `.env*`, minus the committed example | `.env.example` or `.env`      |
| `php`      | `/vendor`, PHPUnit caches            | `composer.json`               |
| `laravel`  | build output, storage keys, SSR      | `artisan`                     |
| `go`       | test and build droppings             | `go.mod`                      |
| `tofu`     | state, tfvars, local overrides       | `*.tf` / `*.tofu`             |
| `nuxt`     | `.nuxt`, `.output`, `.nitro`         | `nuxt.config.*`               |
| `tauri`    | `src-tauri/target`, generated schemas| `src-tauri/`                  |
| `rust`     | `/target`                            | a root `Cargo.toml`           |
| `turborepo`| `.turbo`                             | `turbo.json`                  |
| `playwright` | test-results, reports              | `playwright.config.*`         |
| `storybook`| `storybook-static`                   | `.storybook/`                 |
| `vscode`   | `.vscode/*` + the shared files       | you have a `.vscode/`         |
| `intellij` | `.idea/*`                            | you have a `.idea/`           |
| `vim`      | swap and session files               | your `$EDITOR` is vim         |
| `macos`    | AppleDouble, Spotlight, Trashes      | you are on a Mac              |
| `windows`  | Thumbs.db, desktop.ini, Recycle Bin  | you are on Windows            |
| `linux`    | `*~`, trash and NFS droppings        | you are on Linux              |

`gitignore-sync list` prints this for the binary you have installed, marking the ones your repo declares.

## ⚙️ Configuration

There is no config file. The configuration is the `# stacks:` line in the `.gitignore` itself — the header is **input**, the blocks below it are **output**.

| Edit                              | Effect after `sync`                            |
| :-------------------------------- | :--------------------------------------------- |
| Add a name to `# stacks:`         | Its block is rendered into the region          |
| Remove a name from `# stacks:`    | Its block disappears; your own lines are kept  |
| Nothing                           | Nothing — `sync` is a no-op on a synced file   |

> [!IMPORTANT]
> Nothing in a repository can tell you what the **other** contributors use — `.vscode/` and `.idea/` are themselves ignored. So those stacks are proposed from your own machine and written down once, rather than re-guessed on every run. Only repository fingerprints reach the non-interactive path; a CI runner's platform must not end up in a committed header.

## 🧪 Use in CI

```yaml
- run: npx @kirchdev/gitignore-sync check
```

`check` writes nothing. It exits non-zero when the file has drifted from its header, and prints what it would have changed.

There is also an action, for a job summary on failure and a `status` output:

```yaml
- uses: kirchDev/gitignore-sync@v0.1.0
  with:
    version: '0.1.0'   # pin it, so a release cannot turn a green pipeline red
```

> [!TIP]
> Repos whose CI derives its task list from `package.json` need neither — add
> `gitignore-sync check` to your `check` script and it comes along.

## 🤝 Contributing

PRs welcome. Conventional Commits required (enforced via commitlint). Husky runs the project's linters/formatters on `git commit`.

> [!TIP]
> Run `pnpm check:fix` before pushing — CI will catch what husky missed.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## 🛣️ Versioning

[Semantic Versioning](https://semver.org/) via [release-please](https://github.com/googleapis/release-please) — see [CHANGELOG.md](CHANGELOG.md).

## 📄 License

[MIT](LICENSE) © [Titus Kirch](https://github.com/TitusKirch/) / [IT-Dienstleistungen Titus Kirch](https://kirch.dev)
