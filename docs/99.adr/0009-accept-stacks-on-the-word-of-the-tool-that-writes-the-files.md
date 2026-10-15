---
title: Accept stacks on the word of the tool that writes the files
description: A stack may ship either because an audit across real repositories shows its lines recurring, or because the tool that writes the files lists them in its own scaffold or documentation; a public template site never qualifies.
status: accepted
date: 2026-10-15
---

# ADR-0009 — Accept stacks on the word of the tool that writes the files

## Context

The first stacks were derived from the locally cloned kirchDev and TitusKirch
repositories, and a stack was meant to ship only when an `audit` across that
estate showed it absorbing lines. The rule kept public template sites out:
their blocks are guesses about what some project might produce, and copying
them is what makes a fetched `.gitignore` long.

The rule had already bent once. `php@v2` and `laravel@v2` followed the Laravel
skeleton's own `.gitignore`, so that a fresh `laravel new` was absorbed rather
than reported as equivalent spellings, before any repository in the estate
carried those lines.

A contribution then proposed `python`, `helm` and `vite`. Measured across the
estate, `python` absorbed ten lines, while `helm` and `vite` absorbed none: no
repository held a Helm chart, and the one Vite app did not ignore the
scaffold's lines yet. Under the original wording both would have been refused,
although each names exactly what its tool writes — the tarballs
`helm dependency update` vendors into `charts/`, and the two lines the
`create-vite` scaffold adds on top of `node`.

## Decision

- A stack ships on one of two kinds of evidence: an `audit` across real
  repositories showing its lines recurring, or the tool that writes the files
  listing them itself — its scaffold's own `.gitignore`, or output it
  documents.
- A public template site's block never counts as evidence of either kind.
- The provenance comment above a template names its source: the repositories
  measured, or the scaffold or documentation followed. Lines from a scaffold
  keep the scaffold's spelling.
- The stack table in `CLAUDE.md` keeps an honest repository count, `0`
  included, and says where a stack's evidence comes from when it is not the
  estate.

## Consequences

- A repository created from a scaffold is absorbed on its first `sync`, before
  the estate has grown a copy of it.
- Stacks can ship with a count of `0`, so the table alone no longer says
  whether the estate needs a stack; the provenance note does.
- A stack that follows a scaffold tracks that scaffold. When the scaffold
  changes its lines, the stack takes a new version rather than an edit, as
  [ADR-0005](/adr/0005-version-templates-append-only-behind-a-lock) requires.
- The template rules are unchanged: one line per stack, no bare editor
  directories, measured `!` exceptions.

## Alternatives considered

- **Keep the estate as the only source.** Rejected: it refuses stacks whose
  lines are known exactly, only because nobody in the estate has used the
  tool yet, and it was already not the rule `laravel@v2` had followed.
- **Accept lines from public template sites.** Rejected: that is the
  fetch-and-dump approach the tool exists to replace, and the blocks it
  produces are what makes a generated `.gitignore` long.
- **Accept a stack on a contributor's say-so alone.** Rejected: the claim is
  not checkable by a reviewer, while a scaffold or a measured repository is.
