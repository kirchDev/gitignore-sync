# CLAUDE.md

This file provides guidance to AI coding agents — Claude Code (claude.ai/code) and vendor-neutral tools such as Codex, OpenCode, Cursor, and Copilot — when working with code in this repository.

## Agent instruction files

`CLAUDE.md` and `AGENTS.md` are kept **byte-identical**. `CLAUDE.md` is what Claude Code reads; `AGENTS.md` is what vendor-neutral agent tools read — Codex, OpenCode, Cursor, Copilot, and whatever follows them. Two real files, deliberately not a symlink: not every tool resolves one.

**After editing either file, copy it over the other — don't repeat the edit by hand:**

```bash
cp CLAUDE.md AGENTS.md   # or the reverse, whichever you just edited
```

Retyping a change is exactly how the two drift; one reflowed line or reworded clause is enough. `diff CLAUDE.md AGENTS.md` must print nothing. If it ever does, treat it as a defect and fix it by letting one file win wholesale — never by merging them.

## What this repo is

`gitignore-sync` is a **CLI that keeps a repo's `.gitignore` maintained**, not one that generates it once. It holds curated blocks — `core`, plus one per declared stack — inside a managed region it owns, re-renders them idempotently on demand, and never touches anything outside that region.

**The whole differentiator is in the verb.** `gitignore.io`, `gig` and `ignr` all _fetch and dump_: you pull once, paste, and drift from there. None of them re-syncs. That gap is the reason this exists, and it is why the tool is called `-sync` and not `-generate`.

## Commands

| Command             | What it does                                                        |
| :------------------ | :------------------------------------------------------------------ |
| `pnpm install`      | Install deps and wire husky hooks via the `prepare` script          |
| `pnpm build`        | `vite build` → `dist/bin/gitignore-sync.mjs`                        |
| `pnpm link`         | Build, then register this work tree as the global command           |
| `pnpm dev`          | `vite build --watch`                                                |
| `pnpm test`         | `vitest run`                                                        |
| `pnpm lint`         | `oxlint . --deny-warnings`                                          |
| `pnpm format`       | `oxfmt --check .` (note: `format` is the check, not fix)            |
| `pnpm typecheck`    | `tsc --noEmit`                                                      |
| `pnpm check`        | `lint` + `format` + `typecheck` + `check:policy` + `test` — the CI gate |
| `pnpm check:policy` | Proves the two agent policy files ban the same commands             |
| `pnpm templates:lock`| Re-writes `tests/templates.lock.json` after adding a template version |
| `pnpm check:fix`    | Auto-fix lint + format                                              |
| `pnpm skills:update`| Update project-scoped agent skills via the skills.sh CLI            |
| `pnpm taze`         | Interactive dependency upgrade check                                |

## The design, settled

These are decisions taken before the first commit, with reasons. Change them only against the reason, never by preference.

### Configuration lives in the `.gitignore` itself

**Because detection cannot cover half the problem.** Fingerprints work for stacks — `package.json` → node, `composer.json` → laravel, `go.mod` → go. They cannot work for `vscode`, `intellij`, `macos` or `windows`: those are properties of the **person** working on the repo, not of the repo. Nothing in the tree fingerprints them.

So a declaration is unavoidable — and once one is needed, the cheapest place is the file being configured. No second file to drift from the first.

### The shape

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

frankenphp
/bootstrap/ssr
```

- **The header is input; the sections are output.** `stacks:` declares what you want; the sections are what was last rendered. A difference between them is not an error — it is the pending change, the same shape as a tofu plan. Dropping a stack means deleting it from the header and running `sync`; no CLI verb required.
- **`# region` … `# endregion`, not `# start` … `# end`.** The reason is a concrete reader: **VSCode folds `#region`**, so a 40-line managed block collapses to one line, and the nested form folds at both levels. Versions live in the section markers (`node@v1`) so `check` can spot a stale block.
- **`core` is listed explicitly, not rendered implicitly.** Always-on would stop a repo forgetting a rule, but it would also make a block appear that nothing asked for. `init` writes `core` into the header; removing it is then a visible act.
- **`core` holds `.DS_Store` and nothing else.** It is the anchor, not a catch-all: a mixed-OS team collects that file whoever commits, which is why it outranks the `macos` stack. Anything tool-specific belongs in a stack someone can drop — which is why the agent settings live in `agents`.

### Detection changes its moment, it does not disappear

| Command         | Detection                                                    |
| :-------------- | :----------------------------------------------------------- |
| `init`          | **yes** — fingerprint the repo, propose the header from it   |
| `sync`          | **no** — read the header, render from it, nothing else       |
| `sync --detect` | **proposes** header changes, never applies them silently     |

This is the property that matters: **adding a `composer.json` must not quietly rewrite someone's `.gitignore`.** Zero-config at the start, explicit and stable afterwards.

### The rule that makes it safe to run twice

A hand-written line found **inside** a managed section is recognised as not coming from the template and **moved to the free zone** — never dropped on re-render. Without it the tool is a data-loss risk and nobody runs it a second time.

Deduplication is git-semantics aware: exact string duplicates are removed; `.idea`, `.idea/`, `/.idea` and `.idea/*` are **not** the same thing to git, so equivalence is only ever **reported**, never merged.

The free zone is filtered **block by block, not line by line** (blank lines separate blocks). A comment is a heading for the patterns beneath it, so once a managed block has absorbed every one of them, the heading is dropped as an orphan — that is most of what makes a fetch-and-dump file long. A block that was only ever a note keeps standing, and a heading whose block still holds a pattern is untouched.

The free zone survives verbatim: every non-blank line is preserved, in order. Only blank padding at its edges is normalised, which is what makes a second `sync` a no-op and `check` a usable CI gate.

## Module shape — keep the core pure

```
parse(text)      → Document { header, sections, freeZone, hasRegion }
render(Document) → text
reconcile(doc)   → Reconciliation { document, rescued, duplicates, covered, equivalences, … }
detect(dir)      → string[]                  // the only filesystem contact
templates        → Record<stack, Template[]> // data, versioned with the binary
```

`parse`, `render` and `reconcile` touch **no filesystem**. That puts the whole hard part — marker parsing, free zone, rescuing stray lines, dedup — behind a string-in/string-out seam. **Test that seam with fixture pairs under `tests/fixtures/` (`<name>.in` / `<name>.out`), never with temporary directories.** Adding a pair is the cheapest way to pin a behaviour; `tests/fixtures.test.ts` picks it up automatically and asserts idempotency on top.

`src/io.ts` and `src/detect.ts` are the only modules that read or write files. The commands (`init`, `edit`, `add`, `remove`, `sync`, `check`, `list`, `info`, `audit`) stay thin and compose the pure parts. `info` is the odd one out: it describes the *installation* rather than the file, so a `linked / dev build` is never mistaken for the published release. `check` is the CI gate: dry run, reports drift and duplicates, exits non-zero on deviation.

`edit`, `add` and `remove` are thin verbs over one header edit — they rewrite the `# stacks:` line and re-render, nothing more. They exist because discovering "open the file, change one line, run sync" from an error message is not a workflow.

**`init` and `edit` are the interactive pair; `add` and `remove` are their scriptable form.** `init` asks in two steps rather than one long list: a confirm on the whole proposal as one list, then a multiselect over whatever is left. Answering "no" falls back to picking everything by hand with nothing pre-ticked, since re-offering a rejected proposal only gives someone something to un-tick. `edit` is the same multiselect over an existing header.

**Neither may hang or guess when there is no terminal.** `init` without a TTY (or with `--yes` / `--stacks=`) takes detection and writes — that is the path CI runs. `edit` refuses outright and names `add`/`remove`, because there is no sensible default for "change this to what?".

### The stacks, and where they came from

Every template was derived from the 28 locally cloned `kirchDev` / `TitusKirch` repos, not from a public template site. The count is how many of them the stack applies to.

| Stack      | Fingerprint                          | Repos |
| :--------- | :----------------------------------- | ----: |
| `core`       | always proposed                    |    27 |
| `agents`     | `.claude/`, `.codex/`, `.opencode/`|    26 |
| `git`        | `.git`                             |    27 |
| `node`       | `package.json`                     |    26 |
| `dotenv`     | `.env.example` / `.env`            |     7 |
| `php`        | `composer.json`                    |     3 |
| `go`         | `go.mod`                           |     3 |
| `turborepo`  | `turbo.json`                       |     3 |
| `tofu`       | `*.tf` / `*.tofu` / lock file      |     1 |
| `laravel`    | `artisan`                          |     1 |
| `nuxt`       | `nuxt.config.*`                    |     1 |
| `tauri`      | `src-tauri/`                       |     1 |
| `storybook`  | `.storybook/`                      |     1 |
| `rust`       | a **root** `Cargo.toml`            |     0 |
| `playwright` | `playwright.config.*`              |     0 |
| `vscode`     | a `.vscode/` here *(machine)*      |     — |
| `intellij`   | a `.idea/` here *(machine)*       |     — |
| `vim`        | `$EDITOR` / `$VISUAL` *(machine)* |     — |
| `macos`      | `process.platform` *(machine)*    |     — |
| `windows`    | `process.platform` *(machine)*    |     — |
| `linux`      | `process.platform` *(machine)*    |     — |

Two stacks show **0**, on purpose. `rust` is fingerprinted on a *root* `Cargo.toml` only — the one Tauri app keeps its crate under `src-tauri/`, and that build output already belongs to the `tauri` stack, so matching it there would render a `/target` line pointing at nothing. `playwright` ships because one repo ignores its three output dirs, but that repo has no root config, so nothing in the estate currently triggers it; it is declared by hand until one does.

### One detector, and a `source` on every signal

There is **one** fingerprint table and **one** `detect(dir)` pass. A `.vscode/` directory sits in the repo directory exactly like `package.json` does, so detecting them two different ways would be an invented distinction.

What differs is not how a signal is found but what it is evidence *of*, and that rides along as a field:

| `source`  | What it reads                                                       | Holds for                     |
| :-------- | :------------------------------------------------------------------ | :---------------------------- |
| `repo`    | committed markers — `package.json`, `go.mod`, `*.tf`, `.env.example` | everyone who clones           |
| `machine` | `.vscode/`, `.idea/` (themselves ignored), `$EDITOR`, `process.platform` | one keyboard              |

Both are proposed together, as one list, and the prompt does not sort them apart — a person confirming a proposal does not need a lecture on where each line came from. The field decides exactly one thing: **whether a signal may write the header without a human confirming it.** `committedOnly()` is that filter, and `init --yes` and the no-TTY path are its only callers — they say what they skipped and how to add it back, because there a line is missing and that does need explaining.

The reason is that the header is committed. A CI runner is Linux with no editor directory, so an unfiltered `--yes` in a pipeline would write `linux` into a file that then claims it for the whole team. `tests/detect.test.ts` pins it: `.vscode/` and `.idea/` show up in `detect`, and never in `committedOnly`.

What the brief said stays true, just narrower than the old prompt copy implied: nothing in a repo can tell you what the **other** contributors use. It can tell you what **you** use, and that is worth offering as a default someone confirms.

Deliberate omissions, each for a reason worth keeping:

- **`composer.lock` is in no template.** A library ignores it, an application commits it — a project decision, so it belongs in the free zone.
- **`dist` belongs to `node` alone**, not to `go`. goreleaser writes there too, but a line may live in only one stack (below), and `node` claims it.
- **`.terraform.lock.hcl` is not ignored** — it is meant to be committed.
- **No `prisma` stack**, even though one repo ignores `src/generated/prisma/`. The path is configurable, so it is a project rule, and the free zone is exactly where it belongs.

**Coverage is measured, not assumed.** `gitignore-sync audit <dirs…>` runs the real `reconcile` over every named repo with every stack declared, and reports what is left — per file and aggregated, `--json` included. It exists as a shipped command rather than a scratch script precisely so a later agent or skill measures with the tool's own semantics instead of reimplementing them. The numbers that justified the current set: across the 27 files, **86 patterns** survive outside the five files carrying a generated toptal block, and 33 of those are the bare `.idea` / `.vscode` spellings below. Almost everything else is genuinely project-specific — which is the free zone working as intended. Re-run it before adding a stack; a stack that moves the number by one line is a stack the estate did not ask for.

**A bare `.idea` or `.vscode` beside a managed block is a defect, not a duplicate.** git does not descend into an ignored directory, so `.vscode` sitting in the free zone silently disables every `!.vscode/…` exception the block renders. `reconcile` reports it as `smothered` — a distinct, louder finding than the equivalent-spelling note, because the file is now doing something other than what it reads like.

**Pattern fingerprints search one level below the root** (`PATTERN_DEPTH` in `src/detect.ts`), because a Terraform repo keeps its stacks in `tofu/`. `examples/` is never descended into: a `.tf` shown as documentation is not a workspace that produces state, and treating it as one makes every provider repo look like an infrastructure repo.

### Sub-`.gitignore`s: three kinds, three verdicts

git reads a `.gitignore` in every directory, so a repository has more than one. `src/discover.ts` classifies what it finds, and only one kind is a decision:

| Kind        | Recognised by                                 | What happens                       |
| :---------- | :--------------------------------------------- | :--------------------------------- |
| `managed`   | it carries a `# region gitignore-sync`        | checked by `check --recursive`     |
| `keeper`    | **content**: a `*` plus `!.gitignore`         | skipped — it holds an empty dir    |
| `framework` | **path**: under `storage/`, `bootstrap/cache/`, `.husky/` | skipped — the framework owns it |
| `plain`     | everything else                                | measured by `audit --recursive`    |

A keeper is recognised by what it says, not where it sits, so the idiom holds for any framework that uses it. A framework stub needs the path, and that path is matched at **any** position: `services/core/storage/logs` in a monorepo counts as readily as a root `storage/logs`. `--include-stubs` measures them anyway.

**A recursive scan must not walk into generated output**, and the skip list comes from two places rather than a hand-kept list:

- **the templates** — a stack that ignores a build directory is a stack whose output must not be scanned, so `node_modules`, `dist`, `.turbo` and the rest maintain themselves. Only a *bare* name qualifies: taking the last segment of `/public/build` would skip every `build/` in the tree, and of `/public/storage` every Laravel stub the scan is meant to find.
- **the repository's own `.gitignore`, inherited downwards** — a directory the repo ignores is generated, so the scan has no business there, exactly as git has none. This is what catches output no template knows: `event-management`'s `.stryker-tmp/` held two full copies of the repo and tripled every number until this rule landed.

A directory holding its own `.git` is skipped too: a submodule or an agent worktree is a separate repository, and `app`'s four worktrees otherwise multiplied the report fivefold.

**Most sub-files should not exist.** A root `.gitignore` applies recursively, so `apps/web/.gitignore` repeating `.nuxt` and `node_modules` says nothing the root does not — `gildstone`'s `apps/web` and `packages/ui` differ by a single line. A sub-file earns its place only when a pattern must apply to one subtree and not another. Neither `init` nor `sync` ever walks the tree; where a package genuinely needs its own region, point them at it (`gitignore-sync init apps/web --stacks=node,nuxt`).

### Templates carry their version history

`src/templates/index.ts` keeps **every version a stack has ever shipped**, ascending. Reconciling reads the version the section marker names, so upgrading `node@v1` to `node@v2` knows which lines it put there itself and which the user added. Without that history an upgrade would "rescue" its own dropped lines into the free zone. When you change a template, **add a version — never edit one in place.**

**That rule is checked, not trusted.** `tests/templates.lock.json` holds every locked version with its lines, and `tests/templates.lock.test.ts` fails when one of them changes. Editing `node@v1` in place therefore cannot reach `main` unless someone also runs `pnpm templates:lock` — which shows up as a diff on the lock, and that diff is the thing a reviewer has to be asked about. Adding a *new* version needs no re-run (the test only guards what the lock already knows), but run it anyway so the next change is guarded too.

The history grows, slowly. Dropping a very old version is allowed and degrades safely: `reconcile` falls back to the current template, which means it rescues more than it needs to rather than deleting something it shouldn't.

Four template rules that are not style:

- **No line may appear in two stacks.** A repo declaring both would render it twice, and the equivalence report would then nag about a collision the tool created itself. `tests/templates.test.ts` enforces it.

- **Never a bare `.vscode/` or `.idea/`.** git does not descend into an ignored directory, which makes `!` exceptions under it technically impossible. Always `.vscode/*` plus targeted exceptions.
- **The `!` exceptions are the files the estate actually tracks**, measured, not guessed: `extensions.json` (every repo that shares anything), `settings.json` (seven), `mcp.json` (two). `tasks.json` and `*.code-snippets`, which the toptal block unignores, are tracked by no repo at all. No repo tracks any `.idea` content, so `intellij` ships no exceptions.
- **`agents` carries working files, not configuration.** Across the estate **126 files** under `.claude/`, `.codex/` and `.opencode/` are committed — `settings.json`, skills, `default.rules`, agent definitions. Only `settings.local.json` and `worktrees/` describe one machine, and only those two are in the block. `.claude/worktrees/` is included because it accumulates for real and the one repo that ignores it today does so in `.git/info/exclude` — private knowledge that belongs where the team can see it.
- **`node_modules` belongs to the `node` stack, not to `core`** — a pure Go repo then correctly does not get it. That it lands almost everywhere in practice is a consequence of the estate, not a reason to blur the model.

### Two surfaces, one tool

`action.yml` in this repo is a **composite** action wrapping `npx @kirchdev/gitignore-sync check`, because the exit code is the whole result — it adds a job summary and a `status` output, nothing else. `kirchDev/coverage-report` bundles its CLI into `dist/index.js` instead, and should: that action writes sticky comments and check runs of its own. Copying its shape here would ship the same code twice and give two things to keep in step.

Most repos need neither. `kirchDev/workflows`' `_ci-check.yml` derives its task list from `package.json`, so adding `gitignore-sync check` to a repo's `check` script is picked up with no workflow change at all.

## Architecture / conventions

- **Node 24, pnpm 11.** Pinned via `.nvmrc`, `engines`, and `packageManager`. Not Bun — the sibling `forgemap` declares `engines.node >= 24` and this repo follows it. `pnpm-workspace.yaml` enforces `minimumReleaseAge=4320` (3-day cooldown), isolated node-linker. Package-manager enforcement carries no key on purpose: pnpm 11 replaced `packageManagerStrict`/`packageManagerStrictVersion` with `pmOnFail`, whose default `download` already errors on a foreign package manager and fetches the pinned pnpm version — every other value only weakens it, so leave it unset.
- **oxc, not eslint/prettier.** Linting via `oxlint`, formatting via `oxfmt`. Configs live in `.oxlintrc.json` / `.oxfmtrc.json`.
- **TypeScript, built with vite.** `tsconfig.json` is `noEmit` + `strict` + `noUncheckedIndexedAccess` + `erasableSyntaxOnly`, so only strippable syntax (no enums, no parameter properties) can be written — which also keeps the meta scripts and tool configs (`scripts/check-policy-parity.ts`, `commitlint.config.ts`, `lint-staged.config.ts`, `taze.config.ts`) directly executable on Node 24. Source imports carry `.ts` extensions.
- **Published as `@kirchdev/gitignore-sync`**, scoped like `@kirchdev/coverage-report`. The `bin` entries stay unscoped (`gitignore-sync`, `gis`) and so does release-please's `package-name` — the scope belongs to the registry, not to what a person types or what a tag is called.
- **`pnpm link --global .` edits `pnpm-workspace.yaml`**, adding an `overrides:` block pointing at the local checkout. That file is committed, so the block must never be: it would make every clone try to link a package that exists on one machine. `pnpm unlink` reverts it; `pnpm link` is only for trying the CLI locally.
- **The CLI's `--version` is injected at build time** by vite's `define` from `package.json`'s `version`, which release-please owns. Never hand-copy a version literal.
- **Runtime deps stay to the sibling handful**: `citty`, `consola`, `pathe`. `c12` and `defu` are deliberately absent — the config lives in the `.gitignore`, so there is no config file to load or merge.
- **Husky hooks** (`.husky/pre-commit`, `.husky/commit-msg`) run `lint-staged` and `commitlint`. `lint-staged.config.ts` excludes `README.md`, `CLAUDE.md`, and `AGENTS.md` (free-form prose) and `pnpm-lock.yaml`.
- **Conventional Commits enforced** via `@commitlint/config-conventional`. Don't `--no-verify` unless explicitly asked.
- **release-please** with `release-type: node`, `include-v-in-tag: true`. Files: `release-please-config.json`, `.release-please-manifest.json`, `.github/workflows/release-please.yml`.
- **Workflows** use `actions/checkout@v7`, `actions/setup-node@v7`, `pnpm/action-setup@v6`, `github/codeql-action/{init,analyze}@v4`. Keep these pinned to major versions; Dependabot bumps them monthly.
- **Bitwarden secret ids in workflows are vault references, not credentials.** The actual secret is `BWS_ACCESS_TOKEN`, a GitHub secret that never appears in a workflow file. Each owner authenticates as a different machine account and reads only its own `-ci` mirror, so this repo — a `kirchDev` repo — must carry the `kirchDev` id (`df8b447a-ffd5-4009-9cc3-b49b014f6978`), not `TitusKirch`'s. A mismatched id resolves for nobody, silently, until someone dispatches the workflow.

## AI & skills

- **`.claude/settings.json`** ships a baseline permission policy — see _Permission policy_ below for the rules it follows. `.claude/settings.local.json` (per-machine overrides) is gitignored.
- **`.tituskirch-skills.json`** configures the [TitusKirch skills](https://github.com/TitusKirch/skills) (commit, PR, issue, release, docs …) per repo. It is the runtime **config**, not an installer. Regenerate/reconcile it with the `tituskirch-skills-config` skill.
- **Installing the skills.** The bundle is installed via the skills.sh CLI (`pnpm dlx skills add TitusKirch/skills`), not vendored into the repo. `pnpm skills:update` refreshes project-scoped skills tracked in `skills-lock.json`.

## Permission policy

`.claude/settings.json` is deliberately lopsided: a **long `deny` list and a short `allow` list**. The two sides answer different questions, so they follow opposite rules.

**`deny` may be generous.** A rule for a command the repo doesn't have is a no-op, it never needs maintenance, and it is never reviewed — a too-broad block only surfaces when you actually hit it. So the list covers every stack kirchDev repos might grow into (Laravel, Prisma, Terraform/OpenTofu, AWS), not just this one. `git reflog expire` and `git gc --prune=now` are in there because they destroy the rescue path that survives a `reset --hard`.

The line to draw is **the machine or something remote, not the working copy**. Blocked: anything that wrecks the OS (`dd`, `mkfs`, `chmod -R`, `rm -rf /…`), tears down remote state or resources (`terraform destroy`, `state rm`, `aws ec2 terminate-instances`, `gh repo delete`), or throws away work with no recovery path (force-push, `reset --hard`, `stash drop`). Deliberately *not* blocked, because they are ordinary local development: `rm -rf node_modules`, `docker volume rm`, `docker compose down -v`, `docker system prune`, deleting a remote branch. Those prompt instead — a command that is sometimes wanted belongs in the middle state, never in `deny`.

**`allow` must stay short.** Its only return is fewer prompts — no safety is gained. Every line has to be read and understood by whoever copies this file, and an unreviewed allow list is more dangerous than none. Keep what occurs many times per session (read-only git, `ls`/`grep`/`rg`, the project's own check scripts) and let everything else ask.

**Three states, not two.** A command in `allow` runs unasked; one in `deny` is impossible and has to be typed by hand; one in **neither list prompts you** — and that middle state is the right default for almost everything. Reserve `deny` for what a mistaken "yes" could not undo. A normal `git push` is not that: it is reversible, visible and the ordinary way work ships, so it sits in `allow`.

> [!IMPORTANT]
> **Never allow a rule that runs arbitrary code.** `pnpm exec turbo run`, `find . *` (which covers `-delete` and `-exec rm`), a raw `pnpm dlx`, or an MCP tool that executes SQL each hand back everything the `deny` list took away. A deny list is only as strong as the weakest allow rule beside it.

Two things this file cannot do, by design: it cannot tell which branch a `git push` targets (protect release branches with **branch protection**, not permissions), and prefix rules miss flags placed before the subcommand (`docker compose -f x.yml down -v`). Treat it as lowering the odds, not as a guarantee.

**Codex gets the same policy** in `.codex/rules/default.rules` — permission config is not portable, so the block list exists twice and **both must be changed together**. Codex uses Starlark `prefix_rule()` calls matching on argument *tokens*, which handles flags and shell chains that the `Bash(…)` prefix patterns miss, and every rule carries its own `match`/`not_match` cases. Check a rule with:

```bash
codex execpolicy check --pretty --rules .codex/rules/default.rules -- git push --force
```

**Parity between the two is machine-checked, not eyeballed.** `pnpm check:policy` (`scripts/check-policy-parity.ts`, part of `pnpm check` and of CI) expands every `prefix_rule` into its concrete argv prefixes — the cartesian product over its alternation lists — and matches the two sets in both directions, so "we changed both files" becomes a number rather than a claim. Two things it encodes are worth knowing before editing either file:

- **The languages differ, so a few gaps cannot be closed.** Claude Code matches a prefix of the command _string_; a `prefix_rule` matches whole argv _tokens_. `Bash(aws iam delete-:*)` therefore bans every delete verb AWS will ever ship, and the Codex side can only enumerate the ones it ships today. Such a difference is legal but must be **declared** — in the `DELIBERATE` list in the script and in the `.codex/rules/default.rules` header — and the check fails both on an undeclared one and on a declaration that has gone stale.
- **Neither language normalises flag order or case.** `rm -rf /` and `rm -fr /` are separate bans; `rm -r -f /` and `redis-cli FlushAll` are neither, and enumerating permutations never ends. The check proves the two files list the **same spellings** — it does not claim the set of spellings is complete.

## Branching model

Branch off `dev`, PR into `dev`, roll `dev` up into `main`, and release-please releases from `main`.

`.github/workflows/dev-pr.yml` opens and updates the rolling draft `dev` → `main` PR. Mark that PR ready and **merge it with a merge commit, never a squash**: squashing collapses the individual `feat:`/`fix:` commits into the PR's own `chore:` title, and release-please then cuts nothing.

`ci.yml` and `codeql.yml` list both `main` and `dev` in their `on: branches:` filters.

## House style for READMEs and meta files

`/write-readme` skill encodes the canonical structure. Key rules: hero block wrapped in `<div align="center">`, prescribed section emojis (✨ Features, 🚀 Setup, 🤝 Contributing, 🛣️ Versioning, 📄 License), license footer always reads `[MIT](LICENSE) © [Titus Kirch](https://github.com/TitusKirch/) / [IT-Dienstleistungen Titus Kirch](https://kirch.dev)`. Use GitHub callouts (`> [!TIP]`, `> [!IMPORTANT]`), never plain blockquotes.
