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
Before adding a new nested Next.js route page, verify the relative import depth from the route file to shared modules with `tsc` before considering the route done.
Before adding non-standard React DOM props, verify they are supported by typed HTML attributes or pass them explicitly as intentional lowercase custom attributes.
For Safari/WebKit media bugs, validate real playback state in WebKit before assuming DOM autoplay attributes are sufficient.
When mocking `next/image` in tests, strip Next-only props like `fill` and `priority` before rendering a native `img`.
For third-party wordmark logos, use a visually verified official asset at the actual display size instead of assuming the SVG variant will stay legible in the UI.
If a brand asset has already been visually approved, do not swap it for a recolored or reconstructed variant without rechecking the exact rendered wordmark.
Do not remove or rewrite user-approved brand or mission copy unless the user explicitly asks for that exact change.
After changing hero claim layouts, verify the real desktop browser rendering before considering the task done.
When updating landing hero positioning copy, verify the combined headline length (`headline` + `headlineHighlight`) stays short enough before trying to solve the issue with layout tweaks.
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
Before letting a requested `site_id` narrow persistent SQL reads, verify it belongs to the caller's `accessibleSiteIds` or fail closed.
Before trusting `X-Forwarded-For` for rate limiting or audit logs in Node services, gate it behind an explicit trusted-proxy setting.
Before sending bearer tokens to an internal service from config, validate the base URL scheme and allowlisted host instead of trusting the raw env value.
Before relying on commit message conventions in a repo, declare and install a real `commit-msg` hook in the versioned hook config instead of assuming an old local hook is still present.
Before pointing monorepo SAST tools at repo root, exclude nested repositories and generated report folders so scans stay limited to in-scope source code.
Before enforcing strict complexity grades on a legacy service, version an explicit baseline and block regressions; a permanently failing gate is not a real guardrail.
Before documenting bootstrap or admin credentials, use placeholders plus the secret-manager path, never a realistic example password.
Before aggregating Vitest projects in the monorepo root, do not mix broad top-level `include` globs with project-specific `include` patterns, or tests can leak across aliases and hang the runner.
After replacing a homepage interaction pattern, update or remove the matching E2E spec in the same change so hooks do not keep asserting deleted ARIA roles or landmarks.
Before forcing a client-side reauth redirect after a 401, navigate to the explicit `/login?reauth=1...` URL before awaiting logout side effects, or middleware races can silently drop the reauth query.
Before wiring E2E OIDC defaults into Next auth apps, keep `AUTH_SESSION_SECRET` compliant with the same 32+ character validation as production, or server routes will reject the test session before cookie checks run.
Before running repo-wide security scans from the monorepo root, exclude nested Git repositories in the workspace so unrelated external projects cannot block the main repo gate.
Before building or deploying with Dockerfiles that run `pnpm install --frozen-lockfile`, sync `pnpm-lock.yaml` with every changed workspace `package.json`, or release builds will fail on the runner.
Before shipping a Next.js frontend image for `linux/amd64`, validate the full Docker build under the target platform and prefer a glibc-based base image over Alpine when native build binaries fail.
Before running recursive security scans on a monorepo, exclude nested build artifact directories like `app-*/.next` and `app-*/.open-next`, not just root-level caches.
Before starting a local dynamic API audit or smoke server, bind it to a freshly allocated free port instead of assuming `8000` is available.
Before adding a global skip-link in a Next.js app shell, verify that every route branch, including auth pages outside the main shell, exposes the target anchor.
Before shipping a decorative hero video on the landing page, let a static poster carry the initial paint and defer video loading so Lighthouse LCP stays tied to the real content, not the media upgrade.
Before adding a global webfont to the landing layout, verify it is needed above the fold; every extra high-priority font on `/fr` must justify its LCP cost.
Before rebaselining a Lighthouse budget, first remove avoidable bottlenecks on a fresh production build and only then version the new threshold as an explicit measured baseline.
Before running `pa11y-ci` from a transient `pnpm dlx` install, point it to the repo's Playwright Chromium instead of relying on a Puppeteer postinstall download.
Before trusting a versioned manual gate report in `pre-push`, allow the verifier to regenerate a same-SHA report when the existing one is stale or failed, or the hook can stay falsely red after fixes.
After replacing the homepage sector navigation, update the matching landing E2E spec in the same diff so hooks do not keep asserting removed links or counts.
Before adding a blocking dynamic audit to Git hooks, enforce explicit network and process timeouts so a degraded local service cannot hang `pre-push` indefinitely.
Before relying on a background server inside a blocking hook script, force-stop it after a short grace period during cleanup so `wait` cannot hang the whole Git hook.
Before spawning `pnpm`-managed background servers in hook scripts, stop the full child process tree, not just the top-level wrapper PID, or the hook can leak `tsx/node` children and stay stuck.

## Testing Guidelines

Vitest is the default unit test runner; place tests as `*.test.ts` or under `__tests__/`. Playwright covers full flows in `testing/e2e/`. Python tests live in `app-api/tests/`. Add or update tests for every behavior change, especially auth, tenant scoping, and deployment scripts. Run the smallest relevant suite before pushing, then rerun the impacted app build.

## Commit & Pull Request Guidelines

Follow the existing Conventional Commit style seen in history: `feat(scope): ...`, `fix: ...`, `chore: ...`, `content(blog): ...`. Keep commits scoped to one concern. PRs should include a short summary, impacted apps/packages, verification commands, linked issue or context, and screenshots/video for UI changes.

## Security & Configuration Tips

Do not commit secrets or `.env` overrides. Prefer local scripts in `scripts/` for dev and Scaleway workflows instead of ad hoc commands. Treat tenant scoping, auth flows, and release manifests as sensitive paths and test them explicitly after changes.
