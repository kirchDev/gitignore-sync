---
title: Detect only at init, and gate unconfirmed writes on committed evidence
description: Fingerprinting runs at init and on sync --detect only; every signal carries a source, and only committed evidence may write the header without a human confirming it.
status: accepted
date: 2026-08-31
---

# ADR-0003 — Detect only at init, and gate unconfirmed writes on committed evidence

## Context

Detection makes the first run zero-config. Run on every `sync`, it would also
mean that adding a `composer.json` quietly rewrites someone's `.gitignore`,
which is exactly the kind of surprise that stops people re-running a tool.

The signals also differ in what they are evidence of. A `package.json` holds
for everyone who clones the repository. A `.vscode/` directory, `$EDITOR` or
the platform the tool runs on holds for one keyboard. The header that
detection writes into is committed
([ADR-0001](/adr/0001-keep-the-configuration-in-the-gitignore-itself)), so a
CI runner taking detection unfiltered would write its own platform into a file
that then claims it for the whole team.

## Decision

- Detection runs at `init`, where it proposes the header. `sync` reads the
  header and renders from it, nothing more. `sync --detect` proposes header
  changes and never applies them.
- There is one fingerprint table and one detection pass. Every detected
  signal carries a `source`: `repo` for committed markers, `machine` for
  evidence about the person running the tool. The prompt offers both kinds
  together as one proposal.
- `committedOnly()` filters a detection result down to `repo` signals. The
  only paths that may write the header without a human confirming it,
  `init --yes` and `init` without a terminal, go through it, and they say what
  they skipped and how to add it back.

## Consequences

- The tool is zero-config at the start and explicit and stable afterwards. A
  new file in the tree changes nothing until someone asks.
- An interactive `init` can still offer a person's own editor and platform as
  defaults, because a human confirms the proposal.
- Machine stacks never reach a header that CI writes from detection. A
  repository that wants them names them explicitly, with `init --stacks=` or
  `add`, or confirms them in the prompt.
- A stack the repository grows later is only proposed when someone runs
  `sync --detect` or `edit`, and only rendered once someone adds it to the
  header.

## Alternatives considered

- **Detect on every `sync`.** Rejected: it makes the `.gitignore` a function
  of whatever happens to be in the tree, so the file changes without anyone
  deciding to change it.
- **Two detectors, one for the repository and one for the machine.**
  Rejected: a `.vscode/` directory sits in the repository directory exactly
  like `package.json` does, so finding them in two different ways would be an
  invented distinction. What differs is what a signal is evidence of, and a
  field on the signal carries that.
- **Drop machine signals altogether.** Rejected: nothing in a repository can
  say what the other contributors use, but it can say what the person running
  `init` uses, and that is worth offering as a default someone confirms.
