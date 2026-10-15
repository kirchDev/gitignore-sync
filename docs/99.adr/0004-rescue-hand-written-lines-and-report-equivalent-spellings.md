---
title: Rescue hand-written lines, and report equivalent spellings instead of merging them
description: A line inside a managed block that no template put there is moved to the free zone rather than dropped, and git-equivalent spellings are reported, never merged.
status: accepted
date: 2026-08-31
---

# ADR-0004 — Rescue hand-written lines, and report equivalent spellings instead of merging them

## Context

A tool that re-renders part of a file on every run will sooner or later meet a
line someone typed into the part it owns. If re-rendering drops that line, the
tool loses data, and nobody runs a tool like that a second time.

Deduplication has a similar trap. To a reader, `.idea`, `.idea/`, `/.idea` and
`.idea/*` look like the same rule. To git they are not: they differ in anchoring,
in whether they match files, and in whether git still descends into the
directory, which decides whether a `!` exception beneath it can work at all.

## Decision

- During reconciliation, a line found inside a managed section that the
  section's template version did not put there is moved to the free zone,
  never dropped.
- Exact duplicates are removed. Spellings that are equivalent only in a
  reader's eyes are reported and never merged.
- A bare directory pattern in the free zone that disables a managed block's
  `!` exceptions is reported as `smothered`, separately from and louder than
  an equivalent spelling, because the file then does something other than what
  it appears to say.
- The free zone is filtered block by block, blank lines separating blocks. A
  comment heading whose patterns the managed region has absorbed entirely is
  dropped as an orphan. Every other non-blank line survives verbatim and in
  order.

## Consequences

- Running `sync` twice is safe, and a second run is a no-op, which is what
  makes `check` usable as a CI gate.
- Adopting a grown file shrinks it by what the templates cover, without the
  tool guessing which of two spellings the author meant.
- Reports can be noisy on a file full of near-duplicates. Settling them is
  left to a human, by design.
- Reconciliation needs to know exactly what each template version contained,
  which [ADR-0005](/adr/0005-version-templates-append-only-behind-a-lock)
  provides.

## Alternatives considered

- **Re-render the block and drop anything else in it.** Rejected: it is the
  data-loss risk that would stop anyone running the tool twice.
- **Normalise equivalent spellings and merge them.** Rejected: the spellings
  mean different things to git, so merging them would silently change what the
  file ignores.
- **Filter the free zone line by line.** Rejected: a comment is a heading for
  the patterns beneath it, so judging lines alone either leaves orphaned
  headings behind or removes notes that were never headings.
