---
title: Ship standalone binaries as Node single executables
description: Every stable release carries a Node single executable per platform, built from the npm bundle on a runner of that platform, so the CLI runs on a machine without Node on the same runtime the tests use.
status: accepted
date: 2026-10-15
---

# ADR-0010 — Ship standalone binaries as Node single executables

## Context

The CLI shipped as an npm package and as a composite GitHub Action, and both
need Node on the machine. A request came in to run it where neither Node nor a
package manager is installed. The bundle was already one file with three
small runtime dependencies, so nothing in the code stood in the way of
packaging it with a runtime.

Two ways to do that were tried. `bun build --compile` produced a working
binary in one command and could target every platform from one machine.
Node's own single executable applications (SEA) needed more: a preparation
blob, `postject` to inject it into a copy of the node binary, a CommonJS
entry, and a re-sign on macOS. At the time of this decision, SEA on Node 24
was still behind `--experimental-sea-config`.

The project had settled on Node rather than Bun as its runtime: the tests,
the npm package and the action all run on Node 24.

## Decision

- Every stable release carries a single executable per platform — `darwin`
  and `linux`, `arm64` and `x64` — built with Node SEA, not with Bun.
- Each one is built on a runner of its own platform, after the npm build, and
  embeds the node that ran the build, which `.nvmrc` pins. One workflow does
  it for two callers: a pull request touching the build runs it for every
  platform, and the release calls it with the tag to attach the archives.
  After packaging, it installs the archive the way the README tells people to
  and runs it with no node on the `PATH`.
- The SEA bundle is a separate vite build: CommonJS, everything but node's
  builtins inlined, one file. `scripts/sea-build.ts` refuses a bundle that
  split, re-signs ad hoc on macOS, and runs `--version` and `list` out of the
  binary before packaging it.
- Archives carry no version in their name, so
  `releases/latest/download/<name>` always resolves; a SHA-256 checksum file
  sits beside each one.
- `info` reports a single executable as its own build kind, so a downloaded
  binary is never mistaken for an installed package or an unknown one.
- Windows gets no binary; the npm package covers it.

## Consequences

- The CLI runs on a machine without Node, on the same runtime the test suite
  exercises, so a binary cannot behave differently from the npm package
  because of the runtime underneath it.
- Each binary is about the size of node itself, and the release takes four
  extra runner jobs.
- `postject` joins the dev dependencies; nothing of it ships.
- macOS binaries are signed ad hoc only, not notarised, so a browser download
  may still need clearing from quarantine.
- Code that reaches for `node_modules` at runtime, or a dynamic import that
  splits the bundle, breaks the binary; the build script catches the split,
  and the inlined dependencies keep the rest honest.

## Alternatives considered

- **`bun build --compile`.** Rejected: one command and cross-compiled, but
  the binary would run on a runtime the test suite never runs on, against a
  project that had chosen Node for exactly that reason.
- **`deno compile`.** Rejected for the same reason, with a less complete Node
  compatibility layer on top.
- **`pkg` or `nexe`.** Rejected: both had stopped being maintained, and Node's
  own mechanism had replaced them.
- **No binaries, npm only.** Rejected: it leaves the request unanswered for
  machines where installing Node is the thing someone wants to avoid.
