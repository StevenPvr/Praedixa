# Repository Guidelines

## Reading Order

Read this file in this order:

1. `Operating Model`: how to work in this repo.
2. `Project Structure`, `Architecture Boundary`, `Build/Test Commands`, `Coding Style`: repo context.
3. `Thematic Guardrails`: the rule catalog. Apply the most specific relevant rule.
4. `Testing Guidelines`, `Commit & Pull Request Guidelines`, `Security & Configuration Tips`: finish and delivery rules.

If multiple rules apply, obey all of them. If a specific rule conflicts with a generic one, follow the specific rule.

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
- `pnpm test` runs the root Vitest suites plus the `app-api-ts` and `app-connectors` package tests.
- `pnpm test:e2e`, `pnpm test:e2e:landing`, `pnpm test:e2e:admin` run Playwright suites; `test:e2e:admin` starts both `admin` and `webapp` because it includes the cross-app session isolation check.
- `pnpm test:e2e:admin:cross-app` runs the admin/webapp session-isolation spec with both apps started.
- `cd app-api && uv run pytest -q` runs Python tests for the data/ML engine.

## Coding Style & Naming Conventions

Use TypeScript/ESM for frontend and Node services, Python 3.12 for `app-api`. Prettier and ESLint govern JS/TS formatting; Ruff and MyPy govern Python quality. Prefer 2-space indentation in TS/JS and 4 spaces in Python. Use `PascalCase` for React components, `camelCase` for functions/variables, and `snake_case` only where Python or database naming requires it.

## Operating Model

### Workflow Orchestration

#### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

#### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One tack per subagent for focused execution

#### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

#### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

#### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

#### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

#### 7. Production-First Delivery

- Default to production truth, not local comfort: unless the user explicitly asks about local/dev, answer whether something works from the production deployment state
- A feature is not "done" when it only works in the worktree or on localhost; verify the deployed/runtime path or state clearly that prod is not there yet
- Design and implement with long-term production operation, security, and scale in mind; avoid solutions that only survive a local happy path

### Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

### Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Thematic Guardrails

### Global Development Rules

Keep modules small and easy to review. As a default rule, avoid source files over 500 lines and functions over 50 lines; split logic into helpers or services before crossing those limits. Strict typing is mandatory: no silent `any`, no loose payload shapes, and no bypassing TypeScript, Pyright, or MyPy errors without a documented reason. Write code that follows KISS, DRY, and SOLID: prefer simple flows, extract duplicated business logic, and keep components or services focused on one responsibility. Put reusable domain logic in `packages/shared-types` or service modules, not page components.
Before wiring a new Python provider adapter into `integration_runtime_worker.py`, keep cross-module references type-only or behind a local import boundary so provider dispatch cannot create a circular import at module load.
Each time a development mistake causes a bug, add one short prevention rule to this `AGENTS.md` so the same error is less likely to happen again.
After every code change, update the documentation in the affected directories and files within the same change so the distributed doc stays current with the codebase.
Before writing a new admin audit action from Node/TS services, match the exact persisted `adminauditaction` enum value and cover that literal in a transaction-level test so the mutation cannot roll back on a typo.
Because the repo is not in production yet, do not preserve legacy aliases, compatibility shims, or transitional fallbacks; remove or replace them with the target contract as soon as they are discovered.
When a review, audit, or implementation pass uncovers a real defect or structural risk, treat it in the same change unless the user explicitly chooses to defer it; do not leave known problems behind as "out of scope".
Before calling a connector sync path operational, verify a worker can actually claim and close `sync_runs`; a queued run alone is not proof that runtime execution exists.

### Next.js, React, and Frontend Runtime

After deleting or renaming Next.js routes or pages in `app-landing`, clear `.next` before restarting Turbopack so the dev cache cannot crash on stale task data.
Before finalizing a hook-backed commit in a Next.js app, verify `next-env.d.ts` was not dirtied by `next dev` or Playwright web servers, or the commit can fail after the checks themselves pass.
Before adding a new nested Next.js route page, verify the relative import depth from the route file to shared modules with `tsc` before considering the route done.
Before adding non-standard React DOM props, verify they are supported by typed HTML attributes or pass them explicitly as intentional lowercase custom attributes.
Before wiring ARIA ids inside a motion-heavy Next.js client component, derive them from stable locale/data keys instead of generated ids so hydration cannot drift between server and client.
For Safari/WebKit media bugs, validate real playback state in WebKit before assuming DOM autoplay attributes are sufficient.
Before mounting an admin page against a route that is still stubbed or a local optional runtime that is not configured, gate the fetch up front and render an explicit fail-close notice instead of auto-spamming guaranteed `503` or `500` requests in the browser console.
Before reopening onboarding or workspace fetches onto the client integrations runtime, reuse the same local feature gate and dependency bootstrap as `/config`; do not let onboarding spam `/integrations/connections` in development when `app-connectors` is still disabled or unstarted.
Before reopening one admin data surface after industrializing its backend route, split the workspace feature gates by endpoint so only the newly persistent panel comes back and sibling stub panels stay fail-close.
Before expanding an admin operator screen, separate launcher, selector, and execution zones visually; if those concerns share the same weight on screen, the UI will feel broken even when the workflow logic is correct.
Before designing an onboarding surface for operators, choose the interaction paradigm from the real job to be done: if users must progress step by step, ship a guided multi-screen wizard rather than a dense all-in-one cockpit.
When mocking `next/image` in tests, strip Next-only props like `fill` and `priority` before rendering a native `img`.
For third-party wordmark logos, use a visually verified official asset at the actual display size instead of assuming the SVG variant will stay legible in the UI.
If a brand asset has already been visually approved, do not swap it for a recolored or reconstructed variant without rechecking the exact rendered wordmark.
Before updating a static Praedixa business asset, reuse the current shared logo mark from `@praedixa/ui` instead of keeping a copied legacy inline SVG.
Do not remove or rewrite user-approved brand or mission copy unless the user explicitly asks for that exact change.
After changing hero claim layouts, verify the real desktop browser rendering before considering the task done.
When updating landing hero positioning copy, verify the combined headline length (`headline` + `headlineHighlight`) stays short enough before trying to solve the issue with layout tweaks.
Before debugging repeated local `/api/v1/*` proxy 502s in Next apps, verify the expected backend is actually listening on `NEXT_PUBLIC_API_URL`.

### Auth, Security, Authorization, and Tenant Safety

Before creating or refreshing a webapp session from an OIDC access token, verify the token is compatible with the API contract instead of assuming login success implies API access.
Before rejecting a valid Praedixa user for landing in the wrong app, hand the identity off to the correct Praedixa app when a canonical companion login exists instead of trapping the user on a generic role error.
Before shipping a cookie-authenticated JSON route in Next.js, reject browser requests whose `Origin` or `Sec-Fetch-Site` is not same-origin, even for GET handlers that can refresh or proxy session state.
Before trusting a cookie-authenticated JSON request as same-origin, let any explicit `Sec-Fetch-Site=cross-site` or `Sec-Fetch-Site=same-site` veto the request even if the `Origin` header looks correct.
Before relying on admin navigation or tab visibility for authorization, enforce the same route-level permission check server-side for direct URL access.
Before deriving OIDC redirect URLs or cookie-origin checks in a Next auth app, prefer the configured public origin (`AUTH_APP_ORIGIN` or `NEXT_PUBLIC_APP_ORIGIN`) over `request.nextUrl.origin` in production.
Before calling an OIDC provider "untrusted" in local development, verify whether the trust gate is rejecting `http://localhost` itself; local Keycloak on loopback may be valid even though production must stay HTTPS-only.
Before changing OIDC discovery or trust policy for both `app-admin` and `app-webapp`, keep that runtime logic in one shared helper instead of parallel app-local copies, or issuer and revocation rules will drift silently.
Before leaving an auth error banner driven only by a `?error=` query on a login page, verify whether the provider has already recovered and auto-reconcile once so users do not get stuck on a stale failure screen.
Before adding a login auto-retry guard in the browser, do not persist it as a sticky `sessionStorage` boolean across refreshes; use an expiring marker so server restarts and stale tabs can recover.
Before relying on admin route permissions in the UI, enforce the same pathname permission check in middleware or server code before rendering the page.
Before a workspace page auto-fetches auxiliary admin endpoints like `/users` or shared org metadata, verify the current route permission set authorizes those endpoints too, or gate and degrade the fetch instead of emitting guaranteed `403` requests.
Before defaulting a signed-in admin to `/` or sending a CTA to another guarded admin page, resolve a permission-allowed landing path first instead of assuming the dashboard or settings page is reachable for every admin session.
Never store a live password or API secret in repo docs; document the secret manager path and rotation procedure instead.
Before exposing mock or fixture API data, fail closed outside explicit `DEMO_MODE` instead of silently serving demo responses.
Before adding a new unauthenticated or provider-driven API route, assign it an explicit exposure policy and cover that exact template in `app-api-ts/src/__tests__/server.test.ts`, or the runtime can reject the route even though the handler exists.
Before applying auth page middleware in a Next admin app, exempt `/api/*` routes so JSON handlers keep control of auth failures and response shape.
Before relying on Keycloak user-attribute token mappers, declare those attributes in the realm user profile contract so Keycloak persists them.
Before trusting a Keycloak convergence or provisioning script, make it reconcile the full canonical token contract (`role`, `organization_id`, `site_id`, and admin `permissions`) instead of only one mapper or realm role, or strict Next auth callbacks will drift from the live realm.
Before treating Keycloak required actions or app-side `amr` checks as sufficient admin MFA proof, version and verify the bound browser flow policy too.
Before declaring a Keycloak invitation flow operational, verify the realm itself registers and enables `UPDATE_PASSWORD`; a user-level `requiredActions` flag alone does not guarantee the mail link will open a password form.
Before treating the local Keycloak Docker stack as restart-safe with `KC_DB=dev-file`, force `KC_CACHE=local` in `infra/docker-compose.yml`; the default clustered cache can stall OIDC discovery on stale single-node restarts.
Before declaring `auth-prod` durable after a realm restore, verify it is really wired to `KC_DB=postgres` and that at least one bootstrap `super_admin` exists in the live realm; an imported realm with `0` users is not operational.
When seeding a demo tenant, align the Keycloak demo user email and JWT subject with the seeded `users.auth_user_id` record before debugging tenant data access.
When a seeded demo tenant uses a fixed UUID, keep every duplicated UUID validator compatible with that seeded format.
Before creating or mutating a client account from admin lifecycle code, provision or resync the real IdP identity first and require `site_id` for `manager` / `hr_manager`; never persist a placeholder `pending-*` `auth_user_id` on a production path.
Before allowing a destructive admin organization deletion, require a persisted tenant flag such as `isTest` plus exact typed confirmations server-side; never infer deletability from naming conventions like slug or email alone.
Before declaring a fake/demo account cleanup finished, inventory and purge the already-provisioned live IdP users created by that path, or explicitly record the remaining bootstrap accounts and their risk.
Before letting a requested `site_id` narrow persistent SQL reads, verify it belongs to the caller's `accessibleSiteIds` or fail closed.
Before trusting `X-Forwarded-For` for rate limiting or audit logs in Node services, gate it behind an explicit trusted-proxy setting.
Before shipping auth rate limiting outside development, require an explicit distributed store and `AUTH_RATE_LIMIT_KEY_SALT`; never derive the salt from `AUTH_SESSION_SECRET` or silently fall back to local memory.
Before attributing a human action through an internal HTTP header, verify the user identity comes from a trusted server-side boundary; never trust a caller-supplied user-id header for audit logs.
Before sending bearer tokens to an internal service from config, validate the base URL scheme and allowlisted host instead of trusting the raw env value.
Before exposing worker-only connector sync routes that can return decrypted credentials or mutate claimed run state, protect them with a dedicated runtime capability instead of the generic operator `sync:*` capability.
Before exposing worker-only connector queue routes that claim or mutate internal `raw_events`, keep them behind a dedicated runtime capability instead of the generic `raw_events:*` capability.
Before calling a tabular upload allowlist strict, reject extensionless files too; do not let `format_hint` widen the accepted file surface beyond the explicit `.csv` / `.tsv` / `.xlsx` policy.
Before persisting an authenticated actor id into a UUID foreign key on a workflow or audit table, verify it is really a DB UUID; if the auth contract only guarantees an opaque subject, keep the FK nullable and persist the opaque id separately in metadata.
Before marking the onboarding `access-model` step ready, require persisted evidence of real secure invitations or SSO setup; a manual `invitationsReady` flag alone is not sufficient proof that client access is operational.
Before calling an admin "create client" flow operable, verify it provisions the first real client identity or invitation in the same backend path; creating only the organization shell is not enough.
Before declaring a test-client deletion flow complete, purge the provisioned IdP identities tied to that tenant in the same operation or explicitly fail closed if IAM cleanup cannot run.
Before declaring a test-client deletion flow complete, purge not only the linked `auth_user_id` identities but also any IdP users still discoverable by the tenant emails and canonical `organization_id` attribute, or tenant recreation can still fail on a stale email conflict.
Before treating a Keycloak `POST /users` `409` as an email-conflict cleanup case, verify whether the collision is on `email`, `username`, or a legacy user without canonical attributes, and cover that exact shape in tests before claiming the recreation path is fixed.
Before putting a deletable entity behind an append-only audit trail, do not keep a live `ON DELETE SET NULL` foreign key from the audit table to that entity; keep a historical identifier instead so tenant deletion cannot be blocked by audit immutability.
Before collapsing an OIDC discovery failure into a generic browser error, preserve the upstream HTTP status and error payload in server logs so realm loss or issuer drift stays diagnosable.

### Tooling, Shell, Hooks, and Monorepo Hygiene

When iterating over newline-delimited shell output, handle the final line even if it has no trailing newline, or single-item deploy selectors can be skipped silently.
Before relying on commit message conventions in a repo, declare and install a real `commit-msg` hook in the versioned hook config instead of assuming an old local hook is still present.
Before pointing monorepo SAST tools at repo root, exclude nested repositories and generated report folders so scans stay limited to in-scope source code.
Before enforcing strict complexity grades on a legacy service, version an explicit baseline and block regressions; a permanently failing gate is not a real guardrail.
Before wiring a baseline-driven architecture guard into a surface-specific CI workflow, scope it to the same app/package perimeter; otherwise a CI-only PR can be blocked by unrelated legacy debt.
Before relying on Keycloak `--import-realm` in a container image, copy realm exports under a `*-realm.json` filename in `/opt/keycloak/data/import/`, or the startup import can be skipped silently.
Before treating an auth container redeploy as durable, verify its live runtime args still include the required Keycloak import flags (`--import-realm` for `auth-prod`); a corrected image `CMD` alone is not enough if the container keeps older args.
Before making a default local `dev:*` entrypoint run in background, keep an attached-terminal command as the default and move logfile/PID behavior behind an explicit `:bg` script.
Before trusting a local `dev:*:status` script or a proxy `502`, verify the target port is actually listening; a surviving `pnpm` or `tsx` PID alone is not evidence that the HTTP server is up.
Before declaring local create-client invitations operational, make `dev:auth` auto-load the same `RESEND_*` / `KEYCLOAK_SMTP_*` secret inputs as the ops Keycloak email reconciliation path; a healthy OIDC discovery endpoint alone does not prove `execute-actions-email` can send mail.
Before documenting bootstrap or admin credentials, use placeholders plus the secret-manager path, never a realistic example password.
Before invoking repo-owned Python governance scripts from CI shell wrappers, ensure the runner path provides their import deps explicitly (for example via `uv run --with pyyaml`) instead of assuming the system `python3` already has them.
Before serializing runtime config or secrets from shell into JSON, never pass secret values through CLI flags such as `jq --arg`; write them from process environment or `stdin` so they never appear in `argv`.
Before a shell ops script relies on env-driven JSON mutation through `python`, `jq`, or similar subprocesses, explicitly `export` every required variable first; local shell assignments alone will silently disappear from the generated payload.
Before sending a multiline shell bootstrap through a container `args` array, verify the deployment API preserves it as one argument; newline-split args can silently turn a startup script into a no-op or a stuck rollout.
Before parallelizing Keycloak admin CLI (`kcadm`) calls, give each workflow its own `--config` file; the shared default `~/.keycloak/kcadm.config` is not concurrency-safe.
Before consuming a new runtime secret in code, wire it in the same change through local env loaders, runtime secret inventory, deploy/configure scripts, and preflight checks so the deployed service cannot drift from the repo contract.
Before calling a generated runtime env contract complete, include the non-secret runtime keys (`NEXT_PUBLIC_API_URL`, OIDC issuer/client/scope, frontend auth tuning, etc.) alongside secrets and origins, or deploy drift can still pass silently.
Before changing a root monorepo command like `build`, `lint`, `typecheck` or `test`, derive its workspace scope from the actual `app-*` / `packages/*` catalog or validate that catalog in the same change; never rely on a hand-maintained list of current packages.
Before defaulting a repo-owned Keycloak contract path from a script under `scripts/keycloak`, resolve it from `REPO_ROOT`, not from `SCRIPT_DIR/../infra`, or the helper will silently point at `scripts/infra/...`.
Before aggregating Vitest projects in the monorepo root, do not mix broad top-level `include` globs with project-specific `include` patterns, or tests can leak across aliases and hang the runner.
Before chaining a new Alembic migration, copy the real previous `revision` value from the migration header; never infer `down_revision` from the filename.
Before finalizing a named Alembic migration, keep the `revision` identifier short enough for the `alembic_version.version_num` column; overly long human-readable ids can make `upgrade head` fail after the DDL already ran.
Before pushing a monorepo change that ships Next.js apps, keep every shipped `next` dependency on a patch version accepted by the OSV/security gate across `app-landing`, `app-webapp`, and `app-admin`; do not leave one app behind on a vulnerable patch.
After replacing a homepage interaction pattern, update or remove the matching E2E spec in the same change so hooks do not keep asserting deleted ARIA roles or landmarks.
Before asking for a manual re-export of a local ops secret, check the repo's standard `.env.local` files and teach the helper script to auto-load them when that keeps the secret local-only and out of git.
Before starting `app-api-ts` from repo-level dev scripts, auto-load `DATABASE_URL` from the local API env sources (`app-api-ts/.env.local`, `app-api/.env.local`, `app-api/.env`, `.env.local`) instead of assuming the shell already exported it.
Before relying on local admin lifecycle or invitation flows against `app-api-ts`, auto-load the Keycloak admin runtime credentials (`KEYCLOAK_ADMIN_USERNAME`, `KEYCLOAK_ADMIN_PASSWORD`) in the same repo-level `dev:api` path, or the API will boot without the identity provisioning capability it needs.
Before declaring local admin auth fixed, verify `app-api-ts` resolves `AUTH_ISSUER_URL` and `AUTH_JWKS_URL` from the same local Keycloak issuer as `app-admin`; a stale live shell export or `app-api/.env` can turn a successful callback into `reauth=1`.
Before trusting a shell `jq` role-priority selector in Keycloak tooling, replay it against a user whose expected role is not the first priority entry, or the helper can silently promote every account to the top role.
Before forcing a client-side reauth redirect after a 401, navigate to the explicit `/login?reauth=1...` URL before awaiting logout side effects, or middleware races can silently drop the reauth query.
Before wiring E2E OIDC defaults into Next auth apps, keep `AUTH_SESSION_SECRET` compliant with the same 32+ character validation as production, or server routes will reject the test session before cookie checks run.
Before running repo-wide security scans from the monorepo root, exclude nested Git repositories in the workspace so unrelated external projects cannot block the main repo gate.
When the user clearly wants an end-to-end execution pass, do not stop to ask for confirmation at each obvious next step; continue through the remaining concrete actions until a real blocker, hidden-risk decision, or final result is reached.

### Workspace, Packages, Docker, and Build Integrity

Before building or deploying with Dockerfiles that run `pnpm install --frozen-lockfile`, sync `pnpm-lock.yaml` with every changed workspace `package.json`, or release builds will fail on the runner.
Before trusting a global grep in `pnpm-lock.yaml` after adding a workspace dependency, inspect the exact importer block for that workspace or rerun `pnpm install --lockfile-only`; another workspace entry can hide a stale specifier list.
After adding a workspace dependency or package subpath export in the monorepo, run a real `pnpm install` before trusting TypeScript or Vitest resolution; `--lockfile-only` does not refresh workspace links.
Before wiring a frontend mutation to a typed backend endpoint, verify the submitted JSON matches the shared request contract exactly and cover that exact payload shape in at least one E2E or route-level test.
Before sending operator-entered JSON from an admin form to a typed mutation, validate the parsed value union and object shape explicitly instead of casting `unknown` to the shared contract.
Before using `z.custom()` inside a unioned route body schema, give it an explicit predicate; the bare form accepts `undefined` and can silently swallow a sibling payload branch.
Before declaring an onboarding control plane "operable", inventory the concrete routes, forms, and commands exposed against the blueprint; task labels and a generic `Completer` button do not count as full workflow coverage.
Before parallelizing PostgreSQL reads in Node, verify they do not share the same `pg` `PoolClient`; run them sequentially or with separate clients instead of `Promise.all` on one transaction client.
Before joining Postgres columns across admin queries, verify the real column types and table names in the live schema; do not assume a legacy table like `employees` still exists or that a `varchar` site id can be compared directly to a `uuid`.
Before trusting a PNPM workspace Docker build, verify the image rebuilds workspace links inside the builder; restoring only root `node_modules` can leave internal packages unresolved even when the local build is green.
Before copying `node_modules` across Docker stages in a PNPM workspace, verify each app keeps its package-local workspace links; copying only the root install is not a safe substitute for a clean builder install.
Before trusting a Docker build of a TypeScript workspace package, exclude or purge `*.tsbuildinfo` if `dist/` is not copied too, or `tsc` can skip emit and leave the image without the built package even though the command exits green locally.
Before exporting an internal ESM package from `dist/`, keep relative imports in source files on explicit `.js` specifiers, or a clean builder can produce artifacts that compile but fail at runtime/package resolution.
Before relying on a Next.js standalone Docker image, ensure every copied runtime path actually exists in the repo or builder output, even if it is only an empty `public/` directory.
Before importing a repo-local shared package into a standalone prospect app, verify its isolated deploy build context includes that package; otherwise vendor the approved asset locally before shipping.
Before asserting exact accessible names for landing nav card links in tests, remember the link name can include both title and description; prefer partial label matching plus `href` checks.
Before shipping a Next.js frontend image for `linux/amd64`, validate the full Docker build under the target platform and prefer a glibc-based base image over Alpine when native build binaries fail.
Before running recursive security scans on a monorepo, exclude nested build artifact directories like `app-*/.next` and `app-*/.open-next`, not just root-level caches.

### Output Quality and Review Standards

When the user asks for a prompt, copy, concept, or creative artifact, the first version you provide must already be the strongest directly usable answer, not a placeholder draft to improve later.
When writing code, the first implementation you ship should already aim for the strongest clean, production-grade solution you can justify, not a knowingly weak first pass meant to be fixed only after user pushback.
Before claiming an implementation matches a repo-owned spec exactly, perform a full spec-to-code conformity sweep and close the concrete gaps first; do not ship partial alignment and rely on iterative follow-up to reach the stated contract.
Before starting a local dynamic API audit or smoke server, bind it to a freshly allocated free port instead of assuming `8000` is available.

### Landing UX, Brand, Copy, and Public SEO

Before adding a global skip-link in a Next.js app shell, verify that every route branch, including auth pages outside the main shell, exposes the target anchor.
Before shipping a decorative hero video on the landing page, let a static poster carry the initial paint and defer video loading so Lighthouse LCP stays tied to the real content, not the media upgrade.
Before calling a decorative hero video "progressive", verify it can still mount automatically without a user gesture, or the homepage can look broken on first visit.
Before simplifying landing hero media to a single shipped video asset, keep an explicit poster fallback so a failed video load does not leave a blank or frozen hero.
Before assuming a landing locale route is broken after a local Next JSON.parse crash, verify whether `generateStaticParams()` is writing into `prerender-manifest.json` during development; keep locale pre-generation disabled in dev if it destabilizes `.next`.
Before simplifying the landing header navigation, verify the approved ICP pages still stay directly reachable from the header, not only through footer or body links.
Before adding a global webfont to the landing layout, verify it is needed above the fold; every extra high-priority font on `/fr` must justify its LCP cost.
Before rebaselining a Lighthouse budget, first remove avoidable bottlenecks on a fresh production build and only then version the new threshold as an explicit measured baseline.
Before reusing a text accent token inside the landing hero, verify it stays readable on the actual dark media background; tokens tuned for light surfaces should not be reused blindly above the fold.
Before shipping French landing copy, do one explicit pass for missing accents and natural French typography on every user-visible string you changed.
Before publishing a landing knowledge or ROI page, strip any internal editorial note or workflow comment from the structured content source so no drafting note can leak to production.
Before tightening the landing CSP `style-src`, verify the live page does not rely on Framer Motion inline transforms; otherwise production will log CSP violations and silently lose motion behavior.
Before enforcing nonce-based CSP in a Next.js app that uses `next-themes` or another inline bootstrap provider, propagate the request nonce from the root layout into that provider or the first page load will block its own inline script.
Before enforcing nonce-based CSP on a Next.js route group, keep that group dynamically rendered; prerendered App Router pages cannot receive a request-scoped nonce and will break hydration under the production CSP.
Before changing a landing public form that collects email, keep the semantic email validation in one shared helper reused by contact, deployment, scoping, and ingest routes; parallel regexes will drift and reopen abuse gaps.
Before shipping French public landing copy, remove leftover English positioning labels when a natural French equivalent exists; do not leave hybrids like `Decision layer`, `wedge`, or `Cycle decision` in user-facing text.
Before finalizing landing mission copy, verify the hero support quote and the `/a-propos` mission section match the approved raison d'être, and do not reuse `Pourquoi maintenant` in both places.
Before finalizing a landing hero or above-the-fold support block, scan the first viewport for literal duplicate sentences; do not paste the same subtitle or reassurance copy into stacked cards.
Before shipping copy on a dark landing section, do not invent non-standard Tailwind opacity suffixes like `text-white/72`; use a supported token or an explicit arbitrary color and verify the real browser rendering.
Before using Tailwind opacity modifiers on custom brand colors like `text-amber-400/55`, verify the class actually compiles in the target app; otherwise use an explicit arbitrary color.
Before calling a landing section "plein ecran" or full-screen, remove any outer section padding and verify the real desktop viewport shows the whole section without extra scroll beyond `100dvh`.
Before assuming a `SectionShell` spacing override is done in the landing, check the inherited responsive paddings too; `py-0` does not cancel `md:py-28`, so breakpoint-specific gaps can survive and create visible seams between sections.
Before calling two adjacent landing sections visually flush, inspect borders as well as spacing; a 1px `border-top` on the second section can read like a white gap even when the DOM gap is zero.
Before changing landing security helpers or CSP-sensitive files, update at least one abuse test under `app-landing/app/api/*/__tests__` so the public-form boundary stays explicitly covered and hook checks do not drift.
Before claiming the landing is ready for Google sitelinks or stronger branded SEO, make core public pages expose both visible breadcrumbs and matching `WebPage`/`BreadcrumbList` JSON-LD; header/footer links alone are not enough.
Before durcifying landing crawl policy, confirm whether the public GEO corpus is intentionally allowed for LLM search and training; do not equate anti-scraping with blocking compliant AI crawlers on sacrificial public pages.
Before repositioning a persistent hero rail or proof strip, anchor it with the section layout (`flex` / `mt-auto`) instead of compensating with ad hoc margins that depend on headline height.
Before declaring a landing hero block removed, verify the exact JSX branch is gone and recheck the real desktop rendering instead of assuming adjacent cards were the only remaining element.
Before trimming a landing explanation of the DecisionOps loop, verify the full product sequence still appears explicitly: federate, predict, calculate, trigger, prove.
Before offsetting landing content blocks with decorative `translate-y` or staggered heights, verify the real desktop rendering and contrast so the composition does not create clipped or low-visibility copy.
Before relaxing fixed-height constraints in a static slide deck, recheck that peer cards on the same slide still keep a uniform visual height.
Before reusing Praedixa short-horizon messaging on a new vertical, verify the real decision lead times; sectors that must book capacity weeks ahead should not be framed as J+3/J+7/J+14 only.

### E2E, CI, Release, and Deployment Integrity

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
Before using a Node-only contract helper repeatedly in coverage gates, cache parsed repo specs like `contracts/openapi/public.yaml` per process instead of reparsing them in every assertion.
Before shipping a repo-wide local coverage or E2E entrypoint, default it to a conservative single-worker setting and require an explicit env override to increase parallelism, or a gate run can saturate the developer machine.
Before wiring Schemathesis into a blocking gate, pin the CLI version through the repo helper and keep `--continue-on-failure` plus a machine-readable report enabled, or schema/auth warnings can flap the hook without leaving reproducible evidence.
Before using Schemathesis in a stateless pre-push gate without real auth fixtures, keep the run in positive deterministic mode; broad negative fuzzing belongs to a dedicated authenticated harness, not to a hook that is supposed to validate the published contract.
Before defining Playwright `webServer` commands for hook-backed E2E gates, launch Next apps from the app-local binary with a dedicated `cwd` instead of a `pnpm` wrapper, or teardown can miss the real server process and stall the hook.
Before adding a targeted Playwright root script or gate, scope `PW_SERVER_TARGETS` to the apps under test so a single-suite run does not boot every Next app in the monorepo.
Before invoking Playwright from repo scripts or gates, use `pnpm exec playwright` so hooks cannot silently pick an older global CLI than the repo-pinned `@playwright/test`.
Before making a Playwright suite blocking in hooks or CI, keep that authoritative suite on a small production-like critical path (`next start` after build) and leave broader drifting regression packs as explicit manual runs until they are realigned.
Before keeping a Scaleway deploy wrapper, require an explicit immutable `registry-image@sha256` or a signed release manifest; do not keep `scw container deploy build-source=...` on repeatable deployment paths.
Before trusting an E2E admin session fixture, inject the explicit permission set into both the mocked access token and the signed session cookie; a `super_admin` role alone does not authorize admin routes.
Before considering a webapp E2E shell fixture complete, mock provider bootstrap endpoints like `/api/v1/users/me/preferences`, not just visible page data APIs.
When a public landing funnel changes slug, endpoint, or canonical heading, update the matching Playwright spec in the same diff so hooks stay aligned with the real published journey.
Before introducing a shared API contract registry in `packages/shared-types`, split it by domain or concern so the typed catalog stays under the repo guardrail limits instead of landing as one monolithic file.
Before relying on a new contract file under `packages/shared-types/src/api`, export it from the matching barrel such as `src/api.ts` before consuming it through `@praedixa/shared-types/api`.
Before consuming a new root export from `@praedixa/shared-types`, rebuild the package so `dist/index.*` includes it; app/admin/runtime checks resolve the workspace export, not the unbuilt source file.
Before wiring an admin page to a new `/api/v1/admin/*` endpoint, verify the matching route is already backed by a persistent service instead of `liveFallbackFailure` or `noDemoFallbackResponse`, or the UI will ship a guaranteed 503.
Before declaring a contract or shared-types guardrail covered by remote CI, verify that `contracts/` and `packages/shared-types/` changes trigger the same runtime/package checks remotely, not only architecture-only jobs.
Before trusting path-scoped required workflows, route gate, release, smoke, and CI helper script changes through the same remote required checks as application-impacting code.
Before shipping a CLI flag that overrides a default list or path, cover the explicit override order with a regression test; cloned defaults and parse order are not reliable state.
Before versioning a smoke check against an API route or allowed origin, verify it against the current runtime contract and target environment instead of reusing a stale prod path or origin.
Before attaching supply-chain evidence to a signed release manifest, verify the nested SBOM and scan artifact digests too, not only the summary file digest.
Before reusing a demo seed pipeline for real tenant provisioning, split the minimal foundation bootstrap from the operational demo data path.
Before allowing `Sec-Fetch-Site:none` on a cookie-authenticated JSON route, require an explicit navigation opt-in; never accept it by default on session or proxy handlers.
Before using a Markdown matrix as release-critical inventory, version an equivalent machine-readable source and validate docs and gates against it.
Before trusting an `uv`-backed dependency audit in `app-api`, resync the package-local environment from `app-api/uv.lock` so stale tool dependencies cannot create false-positive blockers.
Before signing JSON evidence with HMAC in shell scripts, sign a canonical JSON serialization and require a pre-provisioned key file; never auto-generate a trust root during signing or verification.
Before accepting restore-drill evidence in a signed manifest, require one evidence artifact plus digest for every mandatory semantic check, not just a summary status string.

### Runtime Workflows and Gold Data

Before spawning workflow or approval records from a user action, carry both the actor id and actor role from the authenticated request context so separation-of-duties and audit records stay complete.
Before seeding or persisting a retryable action dispatch, do not mark human fallback as `prepared` before a real failure or explicit escalation, or retry eligibility will be blocked from the start.
Before reading Gold runtime data or medallion features, reject legacy `mock_*` dataset and column names explicitly instead of silently canonicalizing them.
Before resolving a Gold client or site scope, require an explicit canonical slug or allowlisted site code; never fall back to demo aliases, overlap heuristics, or raw site tokens.
Before computing scenario blueprints or Gold proof states, require explicit cost and BAU inputs; never substitute silent zero defaults for missing configuration.
Before constraining authenticated actor ids in admin/runtime flows, verify the repo treats them as guaranteed UUIDs; if the contract only guarantees opaque auth ids, validate non-empty identity instead of inventing a stricter format.
Before extracting a legacy bootstrap path into a new strict service, remove stale wrapper-only keyword flags in every caller and test the direct service contract instead of preserving obsolete compatibility arguments.

### Landing Positioning, Public Routes, and Legal Consistency

Before renaming landing offer vocabulary, update the matching knowledge/services tests in the same change so hooks do not keep asserting an older public wording after the copy is approved.
Before duplicating landing public copy across multiple dictionaries, keep one source of truth and reference it; duplicated marketing strings drift silently and break published wording.
Before leaving a legacy landing route public, verify it still matches the current public offer; if it sells an older positioning, remove it or 301 it instead of keeping two commercial narratives live.
Before letting a landing server action post lead data to a configurable internal URL, require a production host allowlist and strip spoofable proxy headers or query-bearing referers from persisted metadata.
Before calling a landing positioning refactor done, scan visible pages, legal copy, metadata/snippets, and EN parity for retired offer wording, or the old product identity will stay publicly alive.
Before publishing landing sovereignty or hosting claims, verify the public legal pages and SEO config both match the actual production delivery stack instead of an old preview or transitional provider.

### Admin Policies, Shared Helpers, and Test Fixtures

Before adding a new admin page or admin proxy endpoint, register both the page policy and the API policy in `admin-route-policies.ts` in the same change, or middleware, navigation, and direct URL access will drift apart.
Before declaring an admin operations table wired, verify both its read route and its first required mutation route are persistently implemented together; fixing only the listing still leaves the page broken on first operator action.
Before shipping a read-only admin compliance or observability page, add a route contract test proving its backing endpoint no longer points at `liveFallbackFailure`, or the UI can stay green locally while every real request still returns 503.
Before returning a rate-limit result from shared auth/security helpers, keep the execution mode (`development-local` vs `distributed-required`) explicit on allowed and blocked paths so tests and observability do not infer it indirectly.
Before importing a new `lucide-react` icon in a shared component covered by global Vitest mocks, add it to `testing/utils/mocks/icons.ts` in the same change or the full app suite will fail on an incomplete module mock.
Before reusing Playwright admin fixture data across files, export the shared dataset from `testing/e2e/admin/fixtures/api-mocks.ts` first; do not import named symbols that the source mock module does not actually export.

## Testing Guidelines

Vitest is the default unit test runner; place tests as `*.test.ts` or under `__tests__/`. Playwright covers full flows in `testing/e2e/`. Python tests live in `app-api/tests/`. Add or update tests for every behavior change, especially auth, tenant scoping, and deployment scripts. Run the smallest relevant suite before pushing, then rerun the impacted app build.

## Commit & Pull Request Guidelines

Follow the existing Conventional Commit style seen in history: `feat(scope): ...`, `fix: ...`, `chore: ...`, `content(blog): ...`. Keep commits scoped to one concern. PRs should include a short summary, impacted apps/packages, verification commands, linked issue or context, and screenshots/video for UI changes.

## Security & Configuration Tips

Do not commit secrets or `.env` overrides. Prefer local scripts in `scripts/` for dev and Scaleway workflows instead of ad hoc commands. Treat tenant scoping, auth flows, and release manifests as sensitive paths and test them explicitly after changes.
