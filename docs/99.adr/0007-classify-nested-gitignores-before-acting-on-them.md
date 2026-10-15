---
title: Classify nested .gitignore files before acting on them
description: A recursive scan sorts every .gitignore it finds into managed, keeper, framework or plain, and only managed and plain files are checked or measured.
status: accepted
date: 2026-09-01
---

# ADR-0007 — Classify nested .gitignore files before acting on them

## Context

git reads a `.gitignore` in every directory, so a repository holds more than
one. Measuring all of them alike buried the real findings: many nested files
are not the repository's to decide. Some exist only to keep an otherwise empty
directory in git. Others are stubs a framework generates and owns. A scan also
walked into generated output and nested repositories, and once counted the same
files several times over.

## Decision

`src/discover.ts` classifies every `.gitignore` a recursive scan finds into
one of four kinds:

- **managed** — it carries a `# region gitignore-sync`. It is the only kind
  checked by `check --recursive`, and `audit --recursive` measures it as
  well.
- **keeper** — recognised by its **content**, a `*` plus `!.gitignore`, and
  skipped.
- **framework** — recognised by its **path**, a directory a framework owns,
  matched at any depth, with content added to the test where a path alone
  would claim a repository's own file. Skipped.
- **plain** — everything else. `audit --recursive` measures it alongside the
  managed files.

`audit --recursive` skips only keepers and framework stubs, and a flag
measures those anyway. The scan does not descend into
directories a template ignores by bare name, into directories the repository's
own `.gitignore` ignores, or into a directory holding its own `.git`.

## Consequences

- Reports contain only files someone can act on, and the counts reflect each
  file once.
- The keeper idiom is recognised for any framework that uses it, without a
  list to maintain.
- Framework stubs depend on known paths, so a framework with a new stub
  location shows up as `plain` until the classification learns it.
- Neither `init` nor `sync` walks the tree. A package that needs its own region
  is pointed at explicitly.

## Alternatives considered

- **Treat every nested `.gitignore` the same.** Rejected: keepers and
  framework stubs dominated the report and are not the repository's decision.
- **Recognise keepers by path as well.** Rejected: the idiom is the same
  wherever it appears, so recognising it by content covers every framework at
  once.
- **A hand-kept list of directories to skip.** Rejected: the templates already
  name the build output they ignore, and the repository's own `.gitignore`
  names the rest, so both maintain themselves.
