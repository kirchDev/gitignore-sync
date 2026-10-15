---
title: Version templates append-only, behind a lock
description: Every template version a stack ever shipped stays in the registry, a changed template is a new version, and a committed lock file makes an in-place edit fail the tests.
status: accepted
date: 2026-08-31
---

# ADR-0005 — Version templates append-only, behind a lock

## Context

Reconciliation decides which lines in a managed block are the template's and
which are a person's
([ADR-0004](/adr/0004-rescue-hand-written-lines-and-report-equivalent-spellings)).
When a template changes, the block on disk was rendered by the old one. If
only the new template is known, an upgrade mistakes every line the old version
shipped and the new one dropped for a hand-written line, and rescues its own
leftovers into the free zone.

A rule like "never edit a shipped template" is easy to break by accident, and
nothing in an ordinary diff shows that it was broken.

## Decision

- `src/templates/index.ts` keeps every version a stack has shipped, in
  ascending order. Reconciliation reads the version the section marker names.
  Changing a template means adding a version, never editing one.
- `tests/templates.lock.json` records every version still in the registry
  with its lines, and a test fails when a locked version changes. Changing the
  lock takes an explicit `pnpm templates:lock`, which shows up as a diff on the
  lock for a reviewer to question.

## Consequences

- Upgrading a block from one version to the next knows which lines it put
  there itself, so an upgrade rescues only what a person added.
- An in-place edit cannot reach the main branch unnoticed. It either fails the
  test or shows up as a lock diff.
- The registry only grows. Dropping a very old version is possible and
  degrades safely: reconciliation falls back to the current template, so it
  rescues more than necessary rather than deleting anything.

## Alternatives considered

- **Keep only the current template.** Rejected: an upgrade would then rescue
  its own dropped lines into the free zone.
- **Rely on review alone to keep versions immutable.** Rejected: an edited
  line inside an old version looks like any other change in a diff. The lock
  turns the rule into a test failure.
