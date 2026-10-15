---
title: Ship the CI gate as a composite action
description: The GitHub Action is a composite wrapper that runs the published CLI's check through npx, not a bundled JavaScript action.
status: accepted
date: 2026-09-01
---

# ADR-0008 — Ship the CI gate as a composite action

## Context

`gitignore-sync check` is already a complete CI gate: it writes nothing and
exits non-zero on drift. A GitHub Action around it only has to install Node,
run the command and surface the result. The sibling `kirchDev/coverage-report`
action bundles its CLI into `dist/index.js`, which made that shape the obvious
one to copy.

## Decision

We ship `action.yml` as a composite action that runs the published
`@kirchdev/gitignore-sync` through `npx` and adds a `status` output and a job
summary, nothing more. The version it runs is an input.

## Consequences

- The action and the CLI are the same code, released once, so there is nothing
  to keep in step between them.
- The action fetches the CLI from the registry on every run, so a pipeline
  depends on the registry being reachable. Pinning the version input keeps a new
  release from turning a green pipeline red on its own.
- Repositories whose CI already runs a `check` script from `package.json` need
  no action at all: adding `gitignore-sync check` to that script is enough.

## Alternatives considered

- **A bundled JavaScript action, like `coverage-report`.** Rejected for this
  tool: it would ship the CLI twice and leave two artifacts to release in step.
  Bundling earns its keep in `coverage-report` because that action writes
  comments and check runs of its own. Here the exit code is the whole result.
