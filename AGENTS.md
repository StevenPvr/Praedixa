# Repository Guidelines

## Project Structure & Modules

This monorepo uses Turborepo + pnpm workspaces.

- `app-landing/`: Next.js marketing site (`3000`)
- `app-webapp/`: Next.js product UI (`3001`)
- `app-admin/`: Next.js admin UI (`3002`)
- `app-api/`: FastAPI backend + Alembic + pytest (`8000`)
- `packages/ui`, `packages/shared-types`: shared frontend code
- `testing/e2e/`: Playwright suites (`landing`, `webapp`, `admin`)
- `infra/`: local infrastructure (Postgres via Docker Compose)
- `scripts/`: deployment and verification orchestration
- `docs/security/compliance-pack/`: compliance templates and evidence trackers

## Canonical Verification Model

Security and quality enforcement is local and blocking via the exhaustive gate.

- Canonical command: `pnpm gate:exhaustive`
- Report verification: `pnpm gate:verify`
- Pre-push enforcement: `pnpm gate:prepush`
- Hook installation: `./scripts/install-prek.sh`

The hook chain is:

1. `pre-commit` -> `./scripts/gate-exhaustive-local.sh --mode pre-commit`
2. `pre-push` -> `./scripts/verify-gate-report.sh --mode pre-push --run-if-missing --max-age-seconds 21600`

The signed report contract and policy are documented in:

- `docs/runbooks/local-gate-exhaustive.md`
- `scripts/gate.config.yaml`

## Build, Test, and Development Commands

Run from repo root unless noted.

- `pnpm install`: install JS workspace dependencies
- `pnpm dev:landing|dev:webapp|dev:admin`: run frontend apps locally
- `pnpm dev:api`: run backend and apply migrations
- `docker compose -f infra/docker-compose.yml up -d postgres`: local Postgres on `5433`
- `pnpm build`: build frontend workspaces
- `pnpm lint`, `pnpm typecheck`: frontend static quality checks
- `pnpm test`, `pnpm test:coverage`: Vitest unit tests
- `cd app-api && uv run pytest`: backend test suite
- `pnpm test:e2e:landing|webapp|admin`: scoped Playwright runs

## Required Tooling for Full Gate

In addition to Node/pnpm/Python/uv:

- `semgrep`
- `checkov`
- `trivy`
- `codeql`
- `osv-scanner`
- `k6`
- `terraform` and `tflint` (when Terraform is present)

If required tooling is missing, the exhaustive gate fails by default.

## Coding Style & Naming Conventions

TypeScript follows ESLint + Prettier (2 spaces, no `any`, no `console` outside tests).
Python follows Ruff + mypy strict (4 spaces, max line length 88).

- Files/components: kebab-case (example: `forecast-timeline-chart.tsx`)
- React symbols: PascalCase
- Unit tests: `*.test.ts(x)` under `__tests__/`
- E2E tests: `testing/e2e/**/**.spec.ts`
- Python tests: `app-api/tests/**/test_*.py`

## Testing Guidance

Update tests in the same change as behavior updates.
Prefer targeted runs first, then full runs:

- `pnpm vitest run <path>`
- `cd app-api && uv run pytest <path>`
- E2E auth fixtures rely on signed OIDC cookies (`testing/e2e/fixtures/oidc-auth.ts`), not Supabase session interception.

Final verification before merge is always the exhaustive gate.

## Commit & Pull Request Guidelines

Use Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`), optionally scoped.

PRs should include:

- clear **What / Why / How**
- linked issue/context
- screenshots for UI changes
- confirmation that `pnpm gate:exhaustive` passes

## Security & Configuration Tips

Never commit secrets. Use local `.env` files from examples.
Treat `coverage/`, `playwright-report/`, `test-results/`, `.next/` as generated artifacts.
GitHub-hosted verification workflows are not the blocking gate; local signed gate evidence is the source of truth.
