# Security Policy

## Scope

`gitignore-sync` is a **CLI published to npm**. It reads and rewrites a repository's `.gitignore` on the machine it runs on, and ships no network client of its own.

The supported version is always the **latest release**. There are no maintenance branches to back-port fixes to; upgrade to the current release.

## Reporting a Vulnerability

**Please do not file a public GitHub issue for security problems.**

In the context of this CLI, a "vulnerability" typically means:

- A path traversal or write outside the repository the CLI was pointed at.
- A rendered block that silently drops or leaks lines the user wrote by hand.
- An insecure default in a shipped workflow (e.g. overly broad `permissions`).
- A dependency in `package.json` that introduces a known CVE.

Use one of the following private channels:

1. **GitHub Private Vulnerability Reporting** (preferred): open a private advisory at <https://github.com/kirchDev/gitignore-sync/security/advisories/new>.
2. **Email**: [titus.kirch@kirch.dev](mailto:titus.kirch@kirch.dev). PGP available on request.

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce.
- Any suggested fix, if you have one.

### What to expect

| Stage                        | Target timeline                                   |
| :--------------------------- | :------------------------------------------------ |
| Acknowledgement of report    | within **3 business days**                        |
| Initial assessment & triage  | within **7 business days**                        |
| Patch released (if accepted) | depends on severity — critical issues prioritised |
| Public disclosure & advisory | coordinated with reporter after the patch ships   |

## Credit

Reporters who follow this process responsibly are credited in the [CHANGELOG](CHANGELOG.md) and the corresponding GitHub Security Advisory, unless they prefer to remain anonymous.

---

Maintained by [Titus Kirch](https://github.com/TitusKirch/) / [IT-Dienstleistungen Titus Kirch](https://kirch.dev).
