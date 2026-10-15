---
title: Architecture decisions
description: The decision log — every architecture decision recorded for gitignore-sync.
icon: lucide:scale
---

A decision earns an ADR when it constrains work that comes later and its
reasoning would otherwise be lost: a choice between real alternatives, a
convention every part of the project has to follow, a trade-off that looks like
a mistake until the reason is known. Records are append-only — a reversed
decision is written as a new ADR that supersedes the old one, never as an edit
to it.

| ADR                                                                                         | Decision                                                                           | Status   | Date       |
| :------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------- | :------- | :--------- |
| [ADR-0001](/adr/0001-keep-the-configuration-in-the-gitignore-itself)                        | Keep the configuration in the .gitignore itself                                    | accepted | 2026-08-31 |
| [ADR-0002](/adr/0002-mark-managed-blocks-with-foldable-region-comments)                     | Mark managed blocks with foldable region comments                                  | accepted | 2026-08-31 |
| [ADR-0003](/adr/0003-detect-only-at-init-and-gate-unconfirmed-writes-on-committed-evidence) | Detect only at init, and gate unconfirmed writes on committed evidence             | accepted | 2026-08-31 |
| [ADR-0004](/adr/0004-rescue-hand-written-lines-and-report-equivalent-spellings)             | Rescue hand-written lines, and report equivalent spellings instead of merging them | accepted | 2026-08-31 |
| [ADR-0005](/adr/0005-version-templates-append-only-behind-a-lock)                           | Version templates append-only, behind a lock                                       | accepted | 2026-08-31 |
| [ADR-0006](/adr/0006-give-each-line-one-stack-and-keep-core-to-ds-store)                    | Give each line one stack, and keep core to .DS_Store                               | accepted | 2026-09-01 |
| [ADR-0007](/adr/0007-classify-nested-gitignores-before-acting-on-them)                      | Classify nested .gitignore files before acting on them                             | accepted | 2026-09-01 |
| [ADR-0008](/adr/0008-ship-the-ci-gate-as-a-composite-action)                                | Ship the CI gate as a composite action                                             | accepted | 2026-09-01 |
