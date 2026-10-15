---
title: Give each line one stack, and keep core to .DS_Store
description: No ignore line may appear in two stacks, and the explicitly declared core stack holds .DS_Store alone; tool-specific lines live in stacks someone can drop.
status: accepted
date: 2026-09-01
---

# ADR-0006 — Give each line one stack, and keep core to .DS_Store

## Context

Stacks are combined freely in one header. If two stacks shipped the same line,
a repository declaring both would render it twice, and the equivalence report
would then complain about a collision the tool had created itself.

Some stack has to act as the anchor that nearly every repository declares.
Whatever goes into it is rendered into files that never asked for it, and
cannot be dropped without dropping the anchor. `core` first shipped with
`.claude/settings.local.json` alongside `.DS_Store`, which made the anchor
specific to one tool. That line was removed by editing `core@v1` in place and
re-locking it, rather than by adding a `core@v2`, a day after the append-only
rule of [ADR-0005](/adr/0005-version-templates-append-only-behind-a-lock) was
decided.

## Decision

- A line may live in exactly one stack. `tests/templates.test.ts` enforces
  it.
- `core` holds `.DS_Store` and nothing else. A mixed-OS team collects that file
  whoever commits it, which is why it sits in `core` rather than in `macos`.
  Anything tool-specific belongs in a stack of its own. The agent settings
  moved to `agents`.
- `core` is declared in the header like any other stack, not rendered
  implicitly. `init` writes it in, so removing it is a visible act.

## Consequences

- Any combination of stacks renders without duplicates or self-made
  equivalence notes.
- Where two stacks both want a line, one of them has to own it, and the other
  goes without. That is a deliberate cost of the rule.
- A repository can drop every tool-specific block while keeping the anchor.
- A repository that removes `core` from its header loses `.DS_Store`, and
  does so knowingly.

## Alternatives considered

- **Allow shared lines and deduplicate at render time.** Rejected: it hides
  which stack owns a rule, and dropping one of the two stacks would then
  silently keep or lose the line depending on render order.
- **An always-on `core`, rendered without being declared.** Rejected: a repo
  could not forget it, but a block would appear that nothing in the file asked
  for.
- **A catch-all `core`** holding every widely used line. Rejected: lines that
  belong to one tool cannot be dropped by a repository that does not use it.
