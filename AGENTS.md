# Repository Guidelines

## Project Structure & Module Organization

This monorepo uses Turborepo + pnpm workspaces.

- `app-landing/`: marketing site (Next.js, port `3000`)
- `app-webapp/`: client product UI (Next.js, port `3001`)
- `app-admin/`: super-admin UI (Next.js, port `3002`)
- `app-api/`: FastAPI backend + Alembic + pytest (port `8000`)
- `packages/ui`, `packages/shared-types`: shared frontend code
- `testing/e2e`: Playwright suites (`landing`, `webapp`, `admin`)
- `infra/`: local infra definitions (Postgres via Docker Compose)
- `docs/security/compliance-pack/`: lean SOC 2 / ISO 27001 templates and evidence trackers

## Build, Test, and Development Commands

Run from repo root unless noted.

- `pnpm install`: install JS dependencies
- `pnpm dev:landing|dev:webapp|dev:admin`: run Next.js apps
- `pnpm dev:api`: run API (applies migrations first)
- `docker compose -f infra/docker-compose.yml up -d postgres`: local Postgres on `5433`
- `pnpm build`: build all frontend workspaces
- `pnpm lint`, `pnpm typecheck`: frontend quality gates
- `pnpm test`, `pnpm test:coverage`: Vitest tests
- `cd app-api && uv run pytest`: backend tests
- `pnpm test:e2e:landing|webapp|admin`: scoped Playwright runs
- `pnpm pre-commit`: run full local CI gate (includes strict security checks)
- `prek run audit-ultra-strict-local --all-files`: run local "rayon X" security audit only
- `pnpm mvp:gate`: full release gate (`pre-commit` + E2E landing/webapp/admin)

## Coding Style & Naming Conventions

TypeScript: ESLint + Prettier, 2 spaces, no `any`, no `console` (except tests).
Python: Ruff + mypy strict, 4 spaces, max line length `88`.

Naming patterns:

- Components/files: kebab-case (example: `forecast-timeline-chart.tsx`)
- React component symbols: PascalCase
- Unit tests: `*.test.ts(x)` under `__tests__/`
- E2E tests: `testing/e2e/**/**.spec.ts`
- Python tests: `app-api/tests/**/test_*.py`

## Clean Code Rules (Required)

- One responsibility per function/module; avoid hidden side effects.
- Prefer guard clauses and flat control flow.
- Use explicit naming (`isActive`, `getUserById`, `MAX_RETRY_COUNT`).
- Apply DRY, KISS, YAGNI; remove dead code instead of abstracting early.
- For shared files, update dependents and related tests in the same PR.

## React & Next.js Best Practices

- Eliminate waterfalls: parallelize independent async work with `Promise.all`.
- Defer `await` until data is actually needed in the branch being executed.
- Avoid heavy barrel imports; prefer direct module imports.
- Lazy-load non-critical features with dynamic import and use Suspense strategically.
- Reduce re-renders: memoize expensive subtrees and narrow effect dependencies.
- Measure before/after with React Profiler and Web Vitals (LCP, TTI, CLS).

## Testing Guidelines

Coverage gates are strict: Vitest and pytest are configured with `100%` thresholds.
Add/adjust tests in the same change as behavior updates. Prefer targeted runs first (for example, `pnpm vitest run app-webapp/components/...`) before full-suite runs.

## CI & Security Gates (Ultra-Strict)

- Local commit gate: pre-commit hooks are blocking by default. Any failing security finding blocks `git commit` (unless `--no-verify` is explicitly used).
- Local security scanners include: `gitleaks`, `pip-audit`, `pnpm audit --audit-level=low`, plus `audit-ultra-strict-local` (`semgrep`, `trivy`, `checkov`, and Terraform checks when `.tf` files exist).
- Remote CI gate: `.github/workflows/audit.yml` runs on `pull_request`, `push` to `main`, `merge_group`, and daily schedule.
- CI uploads SARIF and artifacts for: secrets, SAST, dependency vulnerabilities, IaC/misconfig, and SBOM.
- SonarQube checks auto-skip unless `SONAR_TOKEN` and `SONAR_HOST_URL` are configured.

## Code Review Checklist (Required)

- Run `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, and `cd app-api && uv run pytest`.
- For UI or flow changes, run relevant Playwright scope (`pnpm test:e2e:landing|webapp|admin`).
- Validate security basics: input validation, auth, tenant isolation, no secret leakage.
- Check for performance regressions: waterfalls, oversized bundles, unnecessary client rendering.
- Document trade-offs when architecture or behavior changes.

## Architecture & Engineering Governance

- Record major decisions as short ADR notes in `docs/runbooks/` (context, options, decision, consequences).
- Plan tech debt explicitly in sprint scope.
- Track engineering health with DORA metrics (deployment frequency, lead time, change failure rate, MTTR).
- Prefer small, reversible changes with rollback plans for risky releases.

## Commit & Pull Request Guidelines

Follow Conventional Commit style seen in history: `feat:`, `fix:`, `ci:`, `test:`, `chore:` with optional scope (`fix(admin-e2e): ...`).

Use `.github/pull_request_template.md`:

- explain **What / Why / How**
- link issue/context
- confirm `pnpm pre-commit` passes
- confirm no new `any`
- include UI screenshots when relevant and verify mobile + keyboard accessibility.

## Security & Configuration Tips

Never commit secrets. Use `.env.local` / `.env` from examples and keep credentials local.
Treat generated outputs (`coverage/`, `playwright-report/`, `test-results/`, `.next/`) as build artifacts, not source.

- Production objective: infrastructure and production data residency are France-only (storage, processing, logs, backups, exports). Any exception must be explicitly approved and documented.
