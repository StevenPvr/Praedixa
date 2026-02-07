# CLAUDE.md

Guidelines for working in this repo.

## Scope

This repository contains only the **Praedixa landing page**.

## Structure

```
apps/landing/          # Next.js landing
packages/ui/           # Shared UI components
packages/shared-types/ # Shared TS types
```

## Development

```bash
pnpm install
pnpm dev
```

## Quality Gates

[prek](https://github.com/j178/prek) (Rust drop-in replacement for pre-commit) enforces formatting, lint, typecheck, tests and build:

```bash
prek install --install-hooks
pnpm pre-commit
```

## Deployment

GitHub Actions runs prek on PRs and deploys on push to `main`
to Cloudflare Workers.
