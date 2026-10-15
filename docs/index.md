---
title: gitignore-sync documentation
description: How gitignore-sync keeps a .gitignore maintained rather than generated, and how to adopt, gate and extend it.
icon: lucide:book-open-text
navigation: false
---

gitignore-sync owns one managed region inside a repository's `.gitignore`,
re-renders it from a declaration in the same file, and never writes outside it.
These pages explain why it is shaped that way and how to put it to work.

::page-cards
::

Two things are deliberately not here. Installation, the command overview and the
stack table live in the
[README](https://github.com/kirchDev/gitignore-sync#readme), and every command
documents its own flags through `--help`. How to develop on the repository is in
[`CONTRIBUTING.md`](https://github.com/kirchDev/gitignore-sync/blob/main/CONTRIBUTING.md).
