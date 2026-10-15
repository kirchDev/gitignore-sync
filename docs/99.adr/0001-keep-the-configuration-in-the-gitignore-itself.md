---
title: Keep the configuration in the .gitignore itself
description: The stacks a repository wants are declared in a header inside its own .gitignore, not in a separate config file and not left to detection alone.
status: accepted
date: 2026-08-31
---

# ADR-0001 — Keep the configuration in the .gitignore itself

## Context

gitignore-sync re-renders curated blocks on every run, so it has to know which
blocks a repository wants every time, not just once. Fingerprinting the tree
answers that for stacks the repository itself carries: a `package.json` means
Node, a `go.mod` means Go. It cannot answer it for editors and operating
systems. Those are properties of the person working on the repository, and
nothing committed fingerprints them. Some declaration was therefore
unavoidable, and the open question was where it should live.

## Decision

We declare the wanted stacks in a `# stacks:` header line inside the managed
region of the `.gitignore` itself. The header is input and the rendered
sections are output. A difference between the two is the pending change that
the next `sync` applies, not an error. Dropping a stack means deleting it from
the header and running `sync`.

## Consequences

- There is no second file that can drift from the first, and no config loader
  or merge logic. The runtime dependencies stay small because of that.
- Anyone reading the `.gitignore` sees what it was built from, and the
  declaration is reviewed in the same diff as its effect.
- The header is committed, so whatever it names applies to the whole team. A
  stack that only describes one person's machine must never reach it without
  that person confirming it ([ADR-0003](/adr/0003-detect-only-at-init-and-gate-unconfirmed-writes-on-committed-evidence)).
- The parser must keep the header and the rendered blocks apart in a file that
  people also edit by hand.

## Alternatives considered

- **A separate config file** (`.gitignore-sync.json` or similar). Rejected: it
  is one more file to keep in step with the file it configures, and it puts
  the declaration where a reader of the `.gitignore` does not look.
- **Detection alone, with no declaration.** Rejected: detection cannot see
  editors or operating systems, so it covers only half of what a `.gitignore`
  ignores. It would also let a newly added file rewrite the `.gitignore`
  unasked on the next run.
