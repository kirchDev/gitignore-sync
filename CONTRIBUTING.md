# Contributing to gitignore-sync

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting issues

- **Questions, ideas, possible bugs:** the [Discord forum](https://discord.kirch.dev/).
- **Confirmed bugs:** a [bug report](https://github.com/kirchDev/gitignore-sync/issues/new?template=bug_report.yml), with a minimal reproduction.
- **Feature requests:** a [feature request](https://github.com/kirchDev/gitignore-sync/issues/new?template=feature_request.yml).
- **Security vulnerabilities:** never a public issue — see [SECURITY.md](SECURITY.md).

## Development setup

Node **24+**, **pnpm 12** and `git`:

```bash
git clone https://github.com/kirchDev/gitignore-sync.git
cd gitignore-sync
pnpm install   # wires the husky hooks
```

`pnpm check` is the gate CI runs; `pnpm check:fix` fixes lint and format. Every script is listed in [AGENTS.md](AGENTS.md#commands).

### Trying the CLI locally

```bash
pnpm setup            # once: puts pnpm's global bin on PATH
pnpm link             # builds, then links this work tree globally
gitignore-sync info   # should print `linked / dev build`
```

`pnpm build` updates the linked binary in place. `pnpm unlink` undoes the link.

> [!IMPORTANT]
> `pnpm link` writes an `overrides:` block into the committed `pnpm-workspace.yaml`. Never commit it — check `git status` after linking. The link also reinstalls `node_modules`; no work is lost.

## Branching & PRs

1. Branch off `dev` and open the PR against `dev`; never push to `main` or `dev` directly.
2. Conventional Commits, enforced by commitlint — e.g. `feat(templates): add the go stack`; breaking changes as `feat!:` or a `BREAKING CHANGE:` footer.
3. One concern per PR, with the docs it affects.
4. Test `parse`, `render` and `reconcile` with fixture pairs in `tests/fixtures/` (`<name>.in` / `<name>.out`), never with a temporary directory.

Husky runs `lint-staged` (oxlint + oxfmt) before a commit and commitlint on its message. If a hook fails, fix it and commit again — never `--no-verify`.

Agent rules live in [AGENTS.md](AGENTS.md). Claude Code loads it on its own from v2.1.277, as long as no `CLAUDE.md` or `CLAUDE.local.md` sits in the working directory or above.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
