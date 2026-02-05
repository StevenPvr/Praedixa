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

Pre-commit hooks enforce formatting, lint, typecheck, tests and build:

```bash
pre-commit install --install-hooks
pnpm pre-commit
```

## Deployment

GitHub Actions runs pre-commit on PRs and deploys on push to `main`
to Cloudflare Workers.
