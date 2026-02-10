# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Praedixa** — Capacity forecasting platform for logistics sites (absence + workload). Multi-tenant SaaS with super-admin back-office.

## Monorepo Structure

```
app-landing/    # Marketing site (Next.js 15, Cloudflare Workers)
app-webapp/     # Client dashboard (Next.js 15, Cloudflare Workers) — port 3001
app-admin/      # Super-admin back-office (Next.js 15, Cloudflare Workers) — port 3002
app-api/        # Backend (FastAPI + SQLAlchemy 2.0 async + PostgreSQL) — port 8000
packages/
  ui/           # Shared React component library (Button, Card, DataTable, StatCard, etc.)
  shared-types/ # TypeScript domain types shared across all frontends
infra/          # docker-compose.yml, render.yaml
testing/        # vitest.setup.ts, e2e tests, shared test utils
scripts/        # Dev setup, migrations, seed scripts
docs/           # Architecture docs, security reports, UX specs
```

## Commands

### Install & Dev

```bash
pnpm install                              # Install all JS dependencies
cd app-api && uv sync --extra dev         # Install Python dependencies

pnpm dev:landing     # Landing — port 3000
pnpm dev:webapp      # Webapp — port 3001
pnpm dev:admin       # Admin — port 3002
pnpm dev:api         # API — port 8000 (runs alembic upgrade head first)
```

### Tests

```bash
# Frontend (Vitest) — all workspaces
pnpm test                          # Run all tests
pnpm vitest run path/to/file.test.ts  # Single file
pnpm vitest run -t "test name"     # Single test by name

# Backend (Pytest) — from app-api
cd app-api && uv run pytest                          # All tests (100% coverage enforced)
cd app-api && uv run pytest tests/unit/test_file.py  # Single file
cd app-api && uv run pytest --no-cov                 # Skip coverage (faster)
cd app-api && uv run pytest tests/security/          # Security tests only
```

### Lint, Format, Typecheck, Build

```bash
pnpm lint                    # ESLint all workspaces
pnpm format:check            # Prettier check
pnpm typecheck               # tsc --build (build packages first!)
pnpm build                   # Build all (shared-types -> ui -> apps, sequential)

cd app-api && uv run ruff check .     # Python lint
cd app-api && uv run ruff format --check .  # Python format
```

### Pre-commit (full quality gate)

```bash
pnpm pre-commit   # Runs: formatting, lint, typecheck, vitest, pytest, build, ruff, bandit, gitleaks, pip-audit
```

### Database

```bash
docker compose -f infra/docker-compose.yml up -d postgres   # Start PG 16 on port 5433
cd app-api && uv run alembic upgrade head                   # Apply migrations
cd app-api && uv run alembic revision --autogenerate -m "description"  # New migration
```

## Architecture

### API Layer (FastAPI)

**Auth flow**: Supabase JWT → `extract_token()` → `verify_jwt()` → `JWTPayload(user_id, email, organization_id, role)`. Algorithms: RS256/ES256/EdDSA in production, HS256 allowed in dev only.

**Multi-tenancy**: Every tenant-scoped query MUST use `TenantFilter.apply(query, Model)` which adds `WHERE organization_id = ?`. Dependencies: `get_tenant_filter` (regular users), `get_admin_tenant_filter` (super_admin cross-org access).

**Roles**: `super_admin`, `org_admin`, `hr_manager`, `manager`, `employee`, `viewer`. Use `require_role("role_name")` as a FastAPI dependency.

**Schema convention**: All Pydantic schemas inherit from `CamelModel` (snake_case Python → camelCase JSON). Input schemas use `extra="forbid"`.

**Error handling**: Custom `PraedixaError` hierarchy (`NotFoundError`, `ForbiddenError`, `ConflictError`). All errors return `{ success: false, error: { code, message }, timestamp }`.

**Router structure**: Regular routers under `/api/v1/`, admin back-office composed under `/api/v1/admin/` via `admin_backoffice` APIRouter.

**ORM**: SQLAlchemy 2.0 async. Models use `TenantMixin` (organization_id + timestamps) or `TimestampMixin`. Use `sa_enum()` helper for PostgreSQL enums (stores `.value` lowercase, not `.name`).

### Frontend (Next.js 15)

**Auth**: Supabase SSR (`@supabase/ssr`). Middleware validates session via `getUser()` (server-validated, not `getSession()`). Super_admins are rejected from webapp and redirected to admin app.

**API client**: `lib/api/client.ts` provides `apiGet`, `apiPost`, `apiPatch` with typed wrappers. All endpoint functions in `lib/api/endpoints.ts` accept a `GetAccessToken` callback.

**Shared packages**: Import from `@praedixa/ui` (components) and `@praedixa/shared-types` (types). Build order matters: shared-types → ui → apps.

**Design system**: OKLCH color space in all Tailwind configs. Fonts: Plus Jakarta Sans (sans), DM Serif Display (serif). Don't use `@apply` with oklch opacity modifiers — use raw CSS instead.

### Testing Patterns

**Vitest**: 100% coverage thresholds enforced. `testing/vitest.setup.ts` mocks `matchMedia`, `ResizeObserver`, `IntersectionObserver`, `crypto.randomUUID`. Admin app has its own vitest workspace config.

**Pytest**: 100% coverage enforced (`--cov-fail-under=100`). `asyncio_mode = "auto"`. Use `SimpleNamespace` (not `MagicMock`) for ORM mocks — required for Pydantic `model_validate` compatibility. Mock helpers: `make_mock_session()`, `make_scalar_result()`, `make_scalars_result()` in `tests/unit/conftest.py`.

## Key Gotchas

- **Build before typecheck**: `pnpm build` must succeed before `pnpm typecheck` because apps import from compiled package outputs
- **SQLAlchemy `default=uuid.uuid4`**: UUID not assigned at init, only after INSERT RETURNING — mock `session.flush` to auto-assign in tests
- **Alembic PG ENUM**: `sa.Enum(create_type=False)` is silently ignored. Use `PG_ENUM(name=..., create_type=False)` from `sqlalchemy.dialects.postgresql` and create enums via raw SQL with `EXCEPTION WHEN duplicate_object`
- **slowapi in tests**: Set `limiter.enabled = False` in fixtures to avoid rate-limit errors
- **DataTable component**: Uses `label` (not `header`) for column definitions, has no `onRowClick` prop
- **StatCard**: `.value` must be `String()`, `.icon` must be a JSX element (not a component reference)
- **Tremor peer deps**: `@tremor/react@3.18.7` warns about React 18 but works fine with React 19
