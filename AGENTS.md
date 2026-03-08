# Repository Guidelines

## Project Structure & Module Organization
Praedixa is a PNPM/Turbo monorepo. Product apps live in `app-landing`, `app-webapp`, `app-admin`, `app-api-ts`, `app-api`, and `app-connectors`. Shared packages live in `packages/` (`shared-types`, `ui`, `remotion-preview`). End-to-end tests live in `testing/e2e/`. Infra and deployment scripts are in `infra/` and `scripts/`. Product, security, and release docs live in `docs/`.

## Architecture Boundary
Use `TypeScript`, `Next.js`, and `Node.js` for everything that communicates with end users or operators: landing pages, client/admin apps, BFF routes, online APIs, auth flows, and connector-facing HTTP services. Use `Python` only for the data platform: ingestion, medallion pipeline work, batch jobs, ML, forecasting, feature engineering, and other data engineering or data science workloads. Do not move client/admin-facing business flows into Python, and do not put pipeline or ML orchestration into the Next/Node apps.

## Build, Test, and Development Commands
- `pnpm dev:landing` starts the public landing app.
- `pnpm dev:webapp`, `pnpm dev:admin`, `pnpm dev:api` start the main frontend, admin, and TS API locally.
- `pnpm build` builds the full monorepo; use `pnpm build:admin` or `pnpm build:api` for targeted builds.
- `pnpm lint` runs ESLint across TS packages.
- `pnpm typecheck` runs the workspace TypeScript build.
- `pnpm test` runs Vitest unit tests.
- `pnpm test:e2e`, `pnpm test:e2e:landing`, `pnpm test:e2e:admin` run Playwright suites.
- `cd app-api && pytest -q` runs Python tests for the data/ML engine.

## Coding Style & Naming Conventions
Use TypeScript/ESM for frontend and Node services, Python 3.12 for `app-api`. Prettier and ESLint govern JS/TS formatting; Ruff and MyPy govern Python quality. Prefer 2-space indentation in TS/JS and 4 spaces in Python. Use `PascalCase` for React components, `camelCase` for functions/variables, and `snake_case` only where Python or database naming requires it.

## Development Guardrails
Keep modules small and easy to review. As a default rule, avoid source files over 500 lines and functions over 50 lines; split logic into helpers or services before crossing those limits. Strict typing is mandatory: no silent `any`, no loose payload shapes, and no bypassing TypeScript, Pyright, or MyPy errors without a documented reason. Write code that follows KISS, DRY, and SOLID: prefer simple flows, extract duplicated business logic, and keep components or services focused on one responsibility. Put reusable domain logic in `packages/shared-types` or service modules, not page components.
Each time a development mistake causes a bug, add one short prevention rule to this `AGENTS.md` so the same error is less likely to happen again.
After every code change, update the documentation in the affected directories and files within the same change so the distributed doc stays current with the codebase.
After deleting or renaming Next.js routes or pages in `app-landing`, clear `.next` before restarting Turbopack so the dev cache cannot crash on stale task data.
Before adding non-standard React DOM props, verify they are supported by typed HTML attributes or pass them explicitly as intentional lowercase custom attributes.
For Safari/WebKit media bugs, validate real playback state in WebKit before assuming DOM autoplay attributes are sufficient.
When mocking `next/image` in tests, strip Next-only props like `fill` and `priority` before rendering a native `img`.
For third-party wordmark logos, use a visually verified official asset at the actual display size instead of assuming the SVG variant will stay legible in the UI.
If a brand asset has already been visually approved, do not swap it for a recolored or reconstructed variant without rechecking the exact rendered wordmark.
Do not remove or rewrite user-approved brand or mission copy unless the user explicitly asks for that exact change.
After changing hero claim layouts, verify the real desktop browser rendering before considering the task done.
Before debugging repeated local `/api/v1/*` proxy 502s in Next apps, verify the expected backend is actually listening on `NEXT_PUBLIC_API_URL`.
Before creating or refreshing a webapp session from an OIDC access token, verify the token is compatible with the API contract instead of assuming login success implies API access.
Before shipping a cookie-authenticated JSON route in Next.js, reject browser requests whose `Origin` or `Sec-Fetch-Site` is not same-origin, even for GET handlers that can refresh or proxy session state.
Before relying on admin navigation or tab visibility for authorization, enforce the same route-level permission check server-side for direct URL access.
Before deriving OIDC redirect URLs or cookie-origin checks in a Next auth app, prefer the configured public origin (`AUTH_APP_ORIGIN` or `NEXT_PUBLIC_APP_ORIGIN`) over `request.nextUrl.origin` in production.
Before relying on admin route permissions in the UI, enforce the same pathname permission check in middleware or server code before rendering the page.
Never store a live password or API secret in repo docs; document the secret manager path and rotation procedure instead.
Before exposing mock or fixture API data, fail closed outside explicit `DEMO_MODE` instead of silently serving demo responses.
Before applying auth page middleware in a Next admin app, exempt `/api/*` routes so JSON handlers keep control of auth failures and response shape.
Before relying on Keycloak user-attribute token mappers, declare those attributes in the realm user profile contract so Keycloak persists them.
When seeding a demo tenant, align the Keycloak demo user email and JWT subject with the seeded `users.auth_user_id` record before debugging tenant data access.
When a seeded demo tenant uses a fixed UUID, keep every duplicated UUID validator compatible with that seeded format.
Before trusting `X-Forwarded-For` for rate limiting or audit logs in Node services, gate it behind an explicit trusted-proxy setting.
Before sending bearer tokens to an internal service from config, validate the base URL scheme and allowlisted host instead of trusting the raw env value.
Before aggregating Vitest projects in the monorepo root, do not mix broad top-level `include` globs with project-specific `include` patterns, or tests can leak across aliases and hang the runner.
After replacing a homepage interaction pattern, update or remove the matching E2E spec in the same change so hooks do not keep asserting deleted ARIA roles or landmarks.
Before forcing a client-side reauth redirect after a 401, navigate to the explicit `/login?reauth=1...` URL before awaiting logout side effects, or middleware races can silently drop the reauth query.
Before wiring E2E OIDC defaults into Next auth apps, keep `AUTH_SESSION_SECRET` compliant with the same 32+ character validation as production, or server routes will reject the test session before cookie checks run.
Before running repo-wide security scans from the monorepo root, exclude nested Git repositories in the workspace so unrelated external projects cannot block the main repo gate.

## Testing Guidelines
Vitest is the default unit test runner; place tests as `*.test.ts` or under `__tests__/`. Playwright covers full flows in `testing/e2e/`. Python tests live in `app-api/tests/`. Add or update tests for every behavior change, especially auth, tenant scoping, and deployment scripts. Run the smallest relevant suite before pushing, then rerun the impacted app build.

## Commit & Pull Request Guidelines
Follow the existing Conventional Commit style seen in history: `feat(scope): ...`, `fix: ...`, `chore: ...`, `content(blog): ...`. Keep commits scoped to one concern. PRs should include a short summary, impacted apps/packages, verification commands, linked issue or context, and screenshots/video for UI changes.

## Security & Configuration Tips
Do not commit secrets or `.env` overrides. Prefer local scripts in `scripts/` for dev and Scaleway workflows instead of ad hoc commands. Treat tenant scoping, auth flows, and release manifests as sensitive paths and test them explicitly after changes.
