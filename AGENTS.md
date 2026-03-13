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
Because the repo is not in production yet, do not preserve legacy aliases, compatibility shims, or transitional fallbacks; remove or replace them with the target contract as soon as they are discovered.
When a review, audit, or implementation pass uncovers a real defect or structural risk, treat it in the same change unless the user explicitly chooses to defer it; do not leave known problems behind as "out of scope".
After deleting or renaming Next.js routes or pages in `app-landing`, clear `.next` before restarting Turbopack so the dev cache cannot crash on stale task data.
Before finalizing a hook-backed commit in a Next.js app, verify `next-env.d.ts` was not dirtied by `next dev` or Playwright web servers, or the commit can fail after the checks themselves pass.
Before adding a new nested Next.js route page, verify the relative import depth from the route file to shared modules with `tsc` before considering the route done.
Before adding non-standard React DOM props, verify they are supported by typed HTML attributes or pass them explicitly as intentional lowercase custom attributes.
For Safari/WebKit media bugs, validate real playback state in WebKit before assuming DOM autoplay attributes are sufficient.
When mocking `next/image` in tests, strip Next-only props like `fill` and `priority` before rendering a native `img`.
For third-party wordmark logos, use a visually verified official asset at the actual display size instead of assuming the SVG variant will stay legible in the UI.
If a brand asset has already been visually approved, do not swap it for a recolored or reconstructed variant without rechecking the exact rendered wordmark.
Before updating a static Praedixa business asset, reuse the current shared logo mark from `@praedixa/ui` instead of keeping a copied legacy inline SVG.
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
Before treating Keycloak required actions or app-side `amr` checks as sufficient admin MFA proof, version and verify the bound browser flow policy too.
When seeding a demo tenant, align the Keycloak demo user email and JWT subject with the seeded `users.auth_user_id` record before debugging tenant data access.
When a seeded demo tenant uses a fixed UUID, keep every duplicated UUID validator compatible with that seeded format.
Before letting a requested `site_id` narrow persistent SQL reads, verify it belongs to the caller's `accessibleSiteIds` or fail closed.
Before trusting `X-Forwarded-For` for rate limiting or audit logs in Node services, gate it behind an explicit trusted-proxy setting.
Before shipping auth rate limiting outside development, require an explicit distributed store and `AUTH_RATE_LIMIT_KEY_SALT`; never derive the salt from `AUTH_SESSION_SECRET` or silently fall back to local memory.
Before attributing a human action through an internal HTTP header, verify the user identity comes from a trusted server-side boundary; never trust a caller-supplied user-id header for audit logs.
Before sending bearer tokens to an internal service from config, validate the base URL scheme and allowlisted host instead of trusting the raw env value.
When iterating over newline-delimited shell output, handle the final line even if it has no trailing newline, or single-item deploy selectors can be skipped silently.
Before relying on commit message conventions in a repo, declare and install a real `commit-msg` hook in the versioned hook config instead of assuming an old local hook is still present.
Before pointing monorepo SAST tools at repo root, exclude nested repositories and generated report folders so scans stay limited to in-scope source code.
Before enforcing strict complexity grades on a legacy service, version an explicit baseline and block regressions; a permanently failing gate is not a real guardrail.
Before documenting bootstrap or admin credentials, use placeholders plus the secret-manager path, never a realistic example password.
Before serializing runtime config or secrets from shell into JSON, never pass secret values through CLI flags such as `jq --arg`; write them from process environment or `stdin` so they never appear in `argv`.
Before aggregating Vitest projects in the monorepo root, do not mix broad top-level `include` globs with project-specific `include` patterns, or tests can leak across aliases and hang the runner.
After replacing a homepage interaction pattern, update or remove the matching E2E spec in the same change so hooks do not keep asserting deleted ARIA roles or landmarks.
Before forcing a client-side reauth redirect after a 401, navigate to the explicit `/login?reauth=1...` URL before awaiting logout side effects, or middleware races can silently drop the reauth query.
Before wiring E2E OIDC defaults into Next auth apps, keep `AUTH_SESSION_SECRET` compliant with the same 32+ character validation as production, or server routes will reject the test session before cookie checks run.
Before running repo-wide security scans from the monorepo root, exclude nested Git repositories in the workspace so unrelated external projects cannot block the main repo gate.
Before building or deploying with Dockerfiles that run `pnpm install --frozen-lockfile`, sync `pnpm-lock.yaml` with every changed workspace `package.json`, or release builds will fail on the runner.
After adding a workspace dependency or package subpath export in the monorepo, run a real `pnpm install` before trusting TypeScript or Vitest resolution; `--lockfile-only` does not refresh workspace links.
Before wiring a frontend mutation to a typed backend endpoint, verify the submitted JSON matches the shared request contract exactly and cover that exact payload shape in at least one E2E or route-level test.
Before trusting a PNPM workspace Docker build, verify the image rebuilds workspace links inside the builder; restoring only root `node_modules` can leave internal packages unresolved even when the local build is green.
Before copying `node_modules` across Docker stages in a PNPM workspace, verify each app keeps its package-local workspace links; copying only the root install is not a safe substitute for a clean builder install.
Before trusting a Docker build of a TypeScript workspace package, exclude or purge `*.tsbuildinfo` if `dist/` is not copied too, or `tsc` can skip emit and leave the image without the built package even though the command exits green locally.
Before exporting an internal ESM package from `dist/`, keep relative imports in source files on explicit `.js` specifiers, or a clean builder can produce artifacts that compile but fail at runtime/package resolution.
Before relying on a Next.js standalone Docker image, ensure every copied runtime path actually exists in the repo or builder output, even if it is only an empty `public/` directory.
Before asserting exact accessible names for landing nav card links in tests, remember the link name can include both title and description; prefer partial label matching plus `href` checks.
Before shipping a Next.js frontend image for `linux/amd64`, validate the full Docker build under the target platform and prefer a glibc-based base image over Alpine when native build binaries fail.
Before running recursive security scans on a monorepo, exclude nested build artifact directories like `app-*/.next` and `app-*/.open-next`, not just root-level caches.
Before starting a local dynamic API audit or smoke server, bind it to a freshly allocated free port instead of assuming `8000` is available.
Before adding a global skip-link in a Next.js app shell, verify that every route branch, including auth pages outside the main shell, exposes the target anchor.
Before shipping a decorative hero video on the landing page, let a static poster carry the initial paint and defer video loading so Lighthouse LCP stays tied to the real content, not the media upgrade.
Before calling a decorative hero video "progressive", verify it can still mount automatically without a user gesture, or the homepage can look broken on first visit.
Before simplifying landing hero media to a single shipped video asset, keep an explicit poster fallback so a failed video load does not leave a blank or frozen hero.
Before adding a global webfont to the landing layout, verify it is needed above the fold; every extra high-priority font on `/fr` must justify its LCP cost.
Before rebaselining a Lighthouse budget, first remove avoidable bottlenecks on a fresh production build and only then version the new threshold as an explicit measured baseline.
Before reusing a text accent token inside the landing hero, verify it stays readable on the actual dark media background; tokens tuned for light surfaces should not be reused blindly above the fold.
Before shipping French landing copy, do one explicit pass for missing accents and natural French typography on every user-visible string you changed.
Before repositioning a persistent hero rail or proof strip, anchor it with the section layout (`flex` / `mt-auto`) instead of compensating with ad hoc margins that depend on headline height.
Before declaring a landing hero block removed, verify the exact JSX branch is gone and recheck the real desktop rendering instead of assuming adjacent cards were the only remaining element.
Before trimming a landing explanation of the DecisionOps loop, verify the full product sequence still appears explicitly: federate, predict, calculate, trigger, prove.
Before offsetting landing content blocks with decorative `translate-y` or staggered heights, verify the real desktop rendering and contrast so the composition does not create clipped or low-visibility copy.
Before relaxing fixed-height constraints in a static slide deck, recheck that peer cards on the same slide still keep a uniform visual height.
Before reusing Praedixa short-horizon messaging on a new vertical, verify the real decision lead times; sectors that must book capacity weeks ahead should not be framed as J+3/J+7/J+14 only.
Before running `pa11y-ci` from a transient `pnpm dlx` install, point it to the repo's Playwright Chromium instead of relying on a Puppeteer postinstall download.
Before trusting a versioned manual gate report in `pre-push`, allow the verifier to regenerate a same-SHA report when the existing one is stale or failed, or the hook can stay falsely red after fixes.
After replacing the homepage sector navigation, update the matching landing E2E spec in the same diff so hooks do not keep asserting removed links or counts.
Before adding a blocking dynamic audit to Git hooks, enforce explicit network and process timeouts so a degraded local service cannot hang `pre-push` indefinitely.
Before relying on a background server inside a blocking hook script, force-stop it after a short grace period during cleanup so `wait` cannot hang the whole Git hook.
Before spawning `pnpm`-managed background servers in hook scripts, stop the full child process tree, not just the top-level wrapper PID, or the hook can leak `tsx/node` children and stay stuck.
Before starting long-lived Next.js servers inside shell-based gates or audits, prefer the built standalone server entrypoint with full process-tree cleanup over `pnpm ... next start`, or the hook can finish its work and still hang in `EXIT` cleanup.
When a shell gate polls background PIDs during cleanup, treat zombie children as already exited and guard the cleanup trap against reentry, or `pre-push` can hang after the real work already finished.
When a shell helper starts a long-lived background service whose PID must be tracked, launch it in the current shell and assign `$!` directly instead of wrapping the starter in command substitution, or the service can die with the subshell before later gate steps run.
Before importing a library from shipped runtime code in a workspace package, declare it in `dependencies`, not only in `devDependencies`, or `knip` and production installs can drift apart.
Before reading versioned repo contracts from a test or Node helper, resolve them from the repo root explicitly instead of assuming `process.cwd()` sits inside the package directory tree.
When a workspace-local Vitest project needs a repo-level fixture or contract file, resolve it from `import.meta.url` (or another file-relative path), not from `process.cwd()`, because package-level test runners often change the working directory.
Before wiring Schemathesis into a blocking gate, pin the CLI version through the repo helper and keep `--continue-on-failure` plus a machine-readable report enabled, or schema/auth warnings can flap the hook without leaving reproducible evidence.
Before using Schemathesis in a stateless pre-push gate without real auth fixtures, keep the run in positive deterministic mode; broad negative fuzzing belongs to a dedicated authenticated harness, not to a hook that is supposed to validate the published contract.
Before defining Playwright `webServer` commands for hook-backed E2E gates, launch Next apps from the app-local binary with a dedicated `cwd` instead of a `pnpm` wrapper, or teardown can miss the real server process and stall the hook.
Before trusting an E2E admin session fixture, inject the explicit permission set into both the mocked access token and the signed session cookie; a `super_admin` role alone does not authorize admin routes.
Before considering a webapp E2E shell fixture complete, mock provider bootstrap endpoints like `/api/v1/users/me/preferences`, not just visible page data APIs.
When a public landing funnel changes slug, endpoint, or canonical heading, update the matching Playwright spec in the same diff so hooks stay aligned with the real published journey.
Before introducing a shared API contract registry in `packages/shared-types`, split it by domain or concern so the typed catalog stays under the repo guardrail limits instead of landing as one monolithic file.
Before declaring a contract or shared-types guardrail covered by remote CI, verify that `contracts/` and `packages/shared-types/` changes trigger the same runtime/package checks remotely, not only architecture-only jobs.
Before trusting path-scoped required workflows, route gate, release, smoke, and CI helper script changes through the same remote required checks as application-impacting code.
Before shipping a CLI flag that overrides a default list or path, cover the explicit override order with a regression test; cloned defaults and parse order are not reliable state.
Before versioning a smoke check against an API route or allowed origin, verify it against the current runtime contract and target environment instead of reusing a stale prod path or origin.
Before attaching supply-chain evidence to a signed release manifest, verify the nested SBOM and scan artifact digests too, not only the summary file digest.
Before reusing a demo seed pipeline for real tenant provisioning, split the minimal foundation bootstrap from the operational demo data path.
Before allowing `Sec-Fetch-Site:none` on a cookie-authenticated JSON route, require an explicit navigation opt-in; never accept it by default on session or proxy handlers.
Before using a Markdown matrix as release-critical inventory, version an equivalent machine-readable source and validate docs and gates against it.
Before signing JSON evidence with HMAC in shell scripts, sign a canonical JSON serialization and require a pre-provisioned key file; never auto-generate a trust root during signing or verification.
Before accepting restore-drill evidence in a signed manifest, require one evidence artifact plus digest for every mandatory semantic check, not just a summary status string.
Before spawning workflow or approval records from a user action, carry both the actor id and actor role from the authenticated request context so separation-of-duties and audit records stay complete.
Before reading Gold runtime data or medallion features, reject legacy `mock_*` dataset and column names explicitly instead of silently canonicalizing them.
Before resolving a Gold client or site scope, require an explicit canonical slug or allowlisted site code; never fall back to demo aliases, overlap heuristics, or raw site tokens.
Before computing scenario blueprints or Gold proof states, require explicit cost and BAU inputs; never substitute silent zero defaults for missing configuration.
Before constraining authenticated actor ids in admin/runtime flows, verify the repo treats them as guaranteed UUIDs; if the contract only guarantees opaque auth ids, validate non-empty identity instead of inventing a stricter format.
Before extracting a legacy bootstrap path into a new strict service, remove stale wrapper-only keyword flags in every caller and test the direct service contract instead of preserving obsolete compatibility arguments.
Before renaming landing offer vocabulary, update the matching knowledge/services tests in the same change so hooks do not keep asserting an older public wording after the copy is approved.
Before adding a new admin page or admin proxy endpoint, register both the page policy and the API policy in `admin-route-policies.ts` in the same change, or middleware, navigation, and direct URL access will drift apart.
Before returning a rate-limit result from shared auth/security helpers, keep the execution mode (`development-local` vs `distributed-required`) explicit on allowed and blocked paths so tests and observability do not infer it indirectly.
Before importing a new `lucide-react` icon in a shared component covered by global Vitest mocks, add it to `testing/utils/mocks/icons.ts` in the same change or the full app suite will fail on an incomplete module mock.
Before reusing Playwright admin fixture data across files, export the shared dataset from `testing/e2e/admin/fixtures/api-mocks.ts` first; do not import named symbols that the source mock module does not actually export.

## Testing Guidelines

Vitest is the default unit test runner; place tests as `*.test.ts` or under `__tests__/`. Playwright covers full flows in `testing/e2e/`. Python tests live in `app-api/tests/`. Add or update tests for every behavior change, especially auth, tenant scoping, and deployment scripts. Run the smallest relevant suite before pushing, then rerun the impacted app build.

## Commit & Pull Request Guidelines

Follow the existing Conventional Commit style seen in history: `feat(scope): ...`, `fix: ...`, `chore: ...`, `content(blog): ...`. Keep commits scoped to one concern. PRs should include a short summary, impacted apps/packages, verification commands, linked issue or context, and screenshots/video for UI changes.

## Security & Configuration Tips

Do not commit secrets or `.env` overrides. Prefer local scripts in `scripts/` for dev and Scaleway workflows instead of ad hoc commands. Treat tenant scoping, auth flows, and release manifests as sensitive paths and test them explicitly after changes.
