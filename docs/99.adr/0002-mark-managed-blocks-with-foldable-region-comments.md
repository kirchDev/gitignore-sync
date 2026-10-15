---
title: Mark managed blocks with foldable region comments
description: The managed region and each stack block are delimited by "# region" / "# endregion" comments, and each block carries its template version in its marker.
status: accepted
date: 2026-08-31
---

# ADR-0002 — Mark managed blocks with foldable region comments

## Context

The tool owns part of a file that people also read and edit by hand, so the
part it owns has to be delimited by markers that git ignores as comments.
Rendered blocks run to dozens of lines, so the markers also decide how much of
the file a reader has to scroll past. Each block also needs to say which
template produced it, so that a later run can tell a block that is out of date
from one that is current.

## Decision

We delimit the whole managed region with `# region gitignore-sync` /
`# endregion`, and each stack block inside it with `# region <stack>@v<n>` /
`# endregion`. The marker names the template version that rendered the block.

## Consequences

- Editors that fold `#region` comments, VS Code among them when this was
  decided, collapse the managed region to one line. The nested form folds at
  both levels.
- `check` can report a stale block from its marker alone, and reconciliation
  can read the exact template version a block came from
  ([ADR-0005](/adr/0005-version-templates-append-only-behind-a-lock)).
- A hand edit to a marker line breaks the structure the parser relies on.
  The markers are part of the file format and have to be treated that way.

## Alternatives considered

- **`# start` / `# end` markers.** Rejected: they delimit the region just as
  well, but no editor folds them, so the managed block keeps its full length
  in front of every reader.
- **A version kept outside the markers** (in the header, or nowhere). Rejected:
  one global version cannot express that some blocks are newer than others,
  and leaving it out would leave an upgrade unable to tell its own old lines
  from the user's.
