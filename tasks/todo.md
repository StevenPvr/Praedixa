# PRD continuation work

## Current Pass - 2026-03-17 - Commit, Fix, Push

### Plan

- [x] Re-read the repo operating instructions and current tracking files before touching the worktree
- [x] Run the relevant monorepo quality gates to surface the current blocking errors
- [x] Fix the blocking issues with production-grade changes and keep touched docs in sync
- [x] Re-run the impacted verification commands until the repo is in a shippable state
- [ ] Commit the full intended worktree and push it to `origin/main`

### Review

- The first commit attempt surfaced the remaining real delivery blocker: the `pre-commit` gate reached Playwright and failed on two outdated E2E contracts, not on runtime/build code.
- Root causes fixed in this pass:
  - `testing/e2e/landing/hero-industry-links.spec.ts` was still asserting the removed homepage sector carousel instead of the current `#secteurs` card section and published sector hrefs.
  - `testing/e2e/webapp/messages.spec.ts` used an ambiguous global text locator for the empty-state copy; the page now renders duplicate hidden/visible DOM copies, so the assertion had to be scoped to the visible exact paragraphs.
- Supporting doc updated:
  - `testing/e2e/landing/README.md` now documents that `hero-industry-links.spec.ts` must follow the current section anchor/hrefs when the home sector layout changes.
- Verification completed:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build:api`
  - `pnpm build:landing`
  - `pnpm build:admin`
  - `PW_REUSE_SERVER=0 PW_SERVER_TARGETS=landing pnpm exec playwright test testing/e2e/landing/hero-industry-links.spec.ts --project=landing --workers=1 --reporter=list`
  - `PW_REUSE_SERVER=0 PW_SERVER_TARGETS=webapp pnpm exec playwright test testing/e2e/webapp/messages.spec.ts --project=webapp --workers=1 --reporter=list`
  - `PW_WORKERS=1 pnpm test:e2e`
- Remaining step: re-stage the hook-formatted workspace, create one conventional commit, and push `main`.

## Plan

- [x] Inspect the existing PRD corpus in `docs/prd` and surrounding architecture/docs context
- [x] Load the `senior-fullstack` and `test-obsessed-guardian` skills for this analysis pass
- [x] Read `docs/prd/TODO.md`, `docs/TESTING.md`, `docs/data-api/README.md`, `docs/governance/adding-features-without-breaking-the-socle.md`, and `docs/runbooks/local-gate-exhaustive.md`
- [x] Extract the open product-platform needs around testing, integration maturity, and cross-surface coherence
- [x] Recommend the single most actionable verification matrix or checklist to add alongside `docs/prd`
- [x] Record the review rationale and suggested placement in this file

## Review

- Recommended next artifact: `docs/prd/matrice-verification-parcours-confiance.md`
- Why this one next:
  - `docs/prd/TODO.md` still has open items that span multiple systems at once, especially connector activation, critical trust E2E, scenario/action/ledger regression, degraded-state coherence, and ROI/ledger consistency.
  - `docs/TESTING.md` and `docs/runbooks/local-gate-exhaustive.md` describe layers, commands, and gates well, but they do not map those checks back to the product journeys they are supposed to prove.
  - `docs/data-api/connector-certification-matrix.md` is a strong precedent for a matrix that is evidence-oriented instead of purely narrative.
- Scope the matrix around two product-critical paths:
  - connector activation maturity (`admin -> connectors -> medallion -> dataset health`)
  - DecisionOps trust loop (`auth -> signal -> compare -> approve -> dispatch -> ledger`)
- For each row, capture at minimum:
  - PRD/TODO requirement reference
  - involved surfaces and source-of-truth contracts
  - happy-path verification
  - degraded/fail-close verification
  - required unit/integration/security/E2E/smoke evidence
  - observability evidence (`request_id`, `run_id`, `contract_version`, `action_id`, etc.)
  - merge gate vs release gate expectation
- Placement:
  - keep it in `docs/prd/` next to `TODO.md`
  - link it from `docs/prd/README.md`
  - use it as evidence support for the open TODO items instead of adding more prose-only checklist lines

## Current Pass - 2026-03-15 - Execution Breakdown

### Plan

- [x] Read `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` and `docs/prd/TODO.md`
- [x] Extract the roadmap, backlog, and user-story sections that should drive execution planning
- [x] Synthesize candidate epics and 6-10 highest-priority workstreams grounded in the current repo reality
- [x] Define reusable acceptance-criteria patterns for the next PRD artifact
- [x] Deliver a cited execution-oriented breakdown and record the review outcome

### Review

- Produced an execution-oriented PRD continuation breakdown grounded in the PRD roadmap, annex backlog, critical user stories, and the monorepo build-ready TODO. The recommended next artifact is an execution backbone that keeps epics stable, ranks workstreams against current repo gaps, and standardizes acceptance criteria around lifecycle states, governance, degraded paths, events/audit, and ROI evidence.

## Current Pass - 2026-03-15 - Security Control-Plane Review

### Plan

- [x] Load the `backend-security-architect` skill, repo guidance, and prior security memory
- [x] Review `docs/prd/TODO.md` plus the specified security/control-plane source documents
- [x] Extract unresolved security and control-plane items that materially affect PRD sequencing
- [x] Recommend how the next PRD continuation document should represent those items
- [x] Record the review rationale and source-backed recommendations here

### Review

- The PRD still says the trust skeleton (`identity`, `RBAC`, `audit`, `tenant isolation`, `secrets`, `observability`) comes first and that the control plane is a prerequisite before any write-back action. See `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`.
- The most material open blockers are: demo/fallback auth paths still to close; append-only audit not yet extended across contracts/approvals/actions/privilege elevation; approval matrix / structured justification / separation of duties / write-back permissions still open; remote branch-governance remains policy-dependent; break-glass + secret rotation + restore are documented but still need to remain explicit go-live evidence in sequencing.
- The current machine-readable invariant set is too narrow for that target state. `docs/security/invariants/security-invariants.yaml` only covers tenant isolation, admin route role checks, OpenAPI coherence, HTTP headers, and connector auth/payload validation, leaving control-plane mutation auditability and governance largely unencoded.
- The next PRD continuation document should therefore be organized as sequence gates, not as a flat backlog: `Trust Gate`, `Governed Publish & Dispatch Gate`, `Operational Recovery Gate`, and `Verification / Governance Gate`, each with blocked PRD capabilities, exit criteria, and required evidence/tests.

## Current Pass - 2026-03-15 - Build/Release Readiness Review

### Plan

- [x] Load the `devops-pipeline-architect` skill and read the requested PRD/runbook/performance/deployment corpus
- [x] Extract the still-open build-ready and release-readiness blockers from the source docs
- [x] Group the blockers into a milestone structure aligned to merge governance, release reproducibility, observability, and performance enforcement
- [x] Record the review rationale and proposed milestone sequence here

### Review

- The first hard blocker is still platform governance: the docs say the workflows now emit stable `Admin - Required` and `API - Required` jobs, but branch protection must still be configured outside YAML before those checks become truly merge-blocking.
- The second blocker is release reproducibility: the release and smoke runbooks are explicit, but local -> staging -> prod bootstrap, per-service rollback validation, DB migration/compat strategy, backup/restore evidence, and end-to-end signed provenance are still open.
- The third blocker is operational readiness: the repo has a machine-readable synthetic baseline and performance/capacity policies, but provider-backed synthetics, business-context tracing, dashboards/alerts, cost monitoring, SQL hot-path hardening, official load/regression suites, and proof that critical surfaces do not depend on implicit full refreshes are still not closed.
- Recommended milestone order for the PRD execution plan: `M1 Merge Authority`, `M2 Reproducible Release & Recovery`, `M3 Observability & Incident Control`, `M4 Performance/Capacity Enforcement`, then `M5 Trust-Path Product Closure` for demo/fallback, contract, and critical E2E gaps that remain before the final build-ready exit gate.

## Current Pass - 2026-03-15 - Strategic Throughline Review

### Plan

- [x] Read `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` and `docs/prd/TODO.md`
- [x] Extract the strategic throughline and the highest-value unresolved product decisions
- [x] Recommend the single continuation artifact that best bridges PRD vision to execution

### Review

- The PRD is strategically coherent around a sovereign, human-governed DecisionOps loop rather than a generic data, BI, or AI platform.
- The most valuable remaining product decisions sit at the seams between modules: contract governance, reliable write-back, finance-grade ledger semantics, and operable onboarding.
- The strongest next artifact is a single end-to-end V1 execution spec anchored on the Coverage loop and reused as the trust spine for Flow.

## Current Pass - 2026-03-15 - Architecture Dependency Streams Review

### Plan

- [x] Load the `senior-architect` skill and read the requested architecture/PRD sources
- [x] Isolate the still-open architecture-level blockers from `docs/prd/TODO.md`
- [x] Cluster the blockers into dependency streams with explicit sequencing
- [x] Recommend the next `docs/prd` artifact that would drive execution from the current checklist

### Review

- `docs/ARCHITECTURE.md` plus `docs/architecture/README.md`, `domain-vocabulary.md`, `ownership-matrix.md`, and `placement-guide.md` already document the static invariants: runtime split, package placement, multi-tenant rules, ownership, and canonical domain terms.
- The main blockers now sit above those invariants: target-state cleanup, trusted data onboarding, canonical decision primitives, governed signal-to-action execution, and production hardening.
- Recommended next artifact: `docs/prd/architecture-execution-plan.md`, positioned as the bridge between the flat checklist in `docs/prd/TODO.md` and the durable invariants/ADRs in `docs/architecture/`.

## Current Pass - 2026-03-15 - PRD Continuation Delivery

### Plan

- [x] Synthesize the parallel agent findings into a single continuation strategy
- [x] Create a V1 execution backbone in `docs/prd/`
- [x] Create a trust-path verification matrix in `docs/prd/`
- [x] Update `docs/prd/README.md` so the new artifacts are discoverable and properly framed
- [x] Re-read the new docs and check ASCII hygiene on the touched files

### Review

- Added `docs/prd/decisionops-v1-execution-backbone.md` as the main PRD continuation artifact. It defines the canonical Coverage thin slice, four execution gates, and ten prioritized workstreams with owners, dependencies, story slices, acceptance patterns, and exit evidence.
- Added `docs/prd/matrice-verification-parcours-confiance.md` as the proof matrix for the two end-to-end journeys that still decide whether the product is credible: connector activation and the DecisionOps trust loop.
- Updated `docs/prd/README.md` so the folder now reads as a coherent set:
  - target PRD
  - structural closure checklist
  - execution backbone
  - verification matrix
- Verification completed:
  - manual re-read of the three touched docs
  - ASCII check on the touched `docs/prd/*` files
- No application tests were run because this was a documentation-only pass.

## Current Pass - 2026-03-16 - Coverage Thin Slice PRD

### Plan

- [x] Re-read the current PRD continuation corpus and isolate the next missing artifact between vision, execution order, and proof matrix
- [x] Draft `docs/prd/coverage-v1-thin-slice-spec.md` as the canonical end-to-end Coverage loop for V1
- [x] Update `docs/prd/TODO.md` so the open checklist explicitly uses this new thin-slice spec as an execution anchor
- [x] Update `docs/prd/README.md` so the new artifact is discoverable in the folder contract
- [x] Re-read the touched docs, check formatting/ASCII hygiene, and record the review outcome here

### Review

- Added `docs/prd/coverage-v1-thin-slice-spec.md` as the new PRD continuation artifact. It defines the canonical Coverage V1 loop from connector activation to monthly ROI review, with the shared objects, lifecycle states, degraded paths, surfaces, and merge/release evidence that have to exist together.
- Updated `docs/prd/TODO.md` so the open sections that touch the end-to-end DecisionOps path are now explicitly interpreted through this thin slice instead of being read as isolated checklist lines.
- Updated `docs/prd/README.md` so the folder now exposes four distinct layers of PRD continuation:
  - target PRD
  - structural closure checklist
  - canonical Coverage thin slice
  - execution backbone and proof matrix
- Verification completed:
  - manual re-read of `docs/prd/coverage-v1-thin-slice-spec.md`, `docs/prd/TODO.md`, and `docs/prd/README.md`
  - ASCII check on the newly added thin-slice spec plus the touched tracking docs
  - size check on `docs/prd/coverage-v1-thin-slice-spec.md` to keep the artifact reviewable
- No application tests were run because this was a documentation-only pass.

## Current Pass - 2026-03-16 - Governed Decision Contract PRD

### Plan

- [x] Re-read the PRD sections and TODO items that already define DecisionContract, approval, action permissions, event schemas, and ledger links
- [x] Draft `docs/prd/decision-contract-governed-publish-spec.md` as the canonical contract governance artifact
- [x] Update `docs/prd/README.md` and `docs/prd/TODO.md` so this artifact becomes part of the living PRD set
- [x] Re-read the touched docs, run ASCII hygiene checks, and record the review outcome here

### Review

- Added `docs/prd/decision-contract-governed-publish-spec.md` as the next PRD continuation artifact. It turns `DecisionContract` into a governed product object with an explicit lifecycle, authorized transitions, publish gates, SoD rules, audit expectations, rollback rules, and downstream bindings to scenario, approval, action, and ledger.
- Updated `docs/prd/README.md` so the PRD folder now exposes the contract-governance layer separately from the Coverage thin slice and the execution/proof artifacts.
- Updated `docs/prd/TODO.md` so sections 2, 5, 7, and 8 are explicitly interpreted through this governed contract spec when reading remaining structural work.
- Verification completed:
  - manual re-read of `docs/prd/decision-contract-governed-publish-spec.md`, `docs/prd/README.md`, and `docs/prd/TODO.md`
  - ASCII check on `docs/prd/decision-contract-governed-publish-spec.md`, `docs/prd/README.md`, and `tasks/todo.md`
  - size check on `docs/prd/decision-contract-governed-publish-spec.md` to keep the artifact reviewable
- No application tests were run because this was a documentation-only pass.

## Current Pass - 2026-03-16 - TODO Coverage Artifacts

### Plan

- [x] Re-read the remaining open TODO sections across data onboarding, operating loop, and release/SRE readiness
- [x] Draft the missing PRD artifacts that directly cover those open clusters instead of adding more meta framing
- [x] Update `docs/prd/README.md` and `docs/prd/TODO.md` so each major section now points to its governing artifact
- [x] Capture the user correction in `tasks/lessons.md`
- [x] Re-read the touched docs and run hygiene checks on the new artifact files

### Review

- Added `docs/prd/connector-activation-and-dataset-trust-spec.md` to cover connector creation, readiness, sync, mapping, quarantine, replay/backfill, and dataset health as one operable path.
- Added `docs/prd/decisionops-operating-loop-spec.md` to cover the daily runtime loop `signal -> compare -> approve -> dispatch -> ledger`, including shared states, webapp/admin responsibilities, fail-close behavior, and proof expectations.
- Added `docs/prd/build-release-sre-readiness-spec.md` to cover the open build-ready clusters around CI/CD authority, release path, rollback/restore, observability/supportability, performance/cost, and the final exit gate.
- Updated `docs/prd/README.md` so the PRD folder now exposes the full set of closure artifacts instead of only the target PRD plus two continuation docs.
- Updated `docs/prd/TODO.md` so the remaining open sections are now explicitly mapped to their governing artifacts at the top of the checklist.
- Added `tasks/lessons.md` with the user-correction rule for future PRD/TODO continuation work.
- Verification completed:
  - manual re-read of the three new spec files plus the touched `README.md` and `TODO.md`
  - ASCII checks on the new spec files, `docs/prd/README.md`, `tasks/todo.md`, and `tasks/lessons.md`
- No application tests were run because this was a documentation-only pass.

## Current Pass - 2026-03-16 - Action Dispatch Lifecycle Wiring

### Plan

- [x] Inspect the existing DecisionOps runtime code to find the smallest real TODO item that could be closed with product code now
- [x] Wire the persisted `ActionDispatch` lifecycle mutation through the admin API surface and admin endpoint policy layer
- [x] Make the admin action-dispatch detail page actionable for valid lifecycle transitions with permission-aware UI
- [x] Update the local docs in the touched directories and reflect the verified closure in `docs/prd/TODO.md`
- [x] Run targeted tests in `app-api-ts` and `app-admin`

### Review

- Added the missing admin write route `POST /api/v1/admin/organizations/:orgId/action-dispatches/:actionId/decision` in `app-api-ts/src/routes.ts`, backed by the already existing persistent service `decisionops-runtime-action.ts`.
- Added the matching admin endpoint helper and explicit admin API policy so the new route is reachable through the guarded same-origin admin surface.
- Upgraded the admin action-dispatch detail page from read-only to permission-aware lifecycle control:
  - valid transitions are now derived from the current dispatch status
  - admins with `admin:org:write` can progress `pending/dispatched/failed/retried` states
  - each mutation refreshes the detail and syncs the latest linked ledger through the backend service

## Current Pass - 2026-03-16 - Integration Replay Backfill Operations

### Plan

- [x] Wire the missing admin endpoint helpers and API policies for integration connection test, sync trigger, and sync-run listing
- [x] Upgrade `app-admin/app/(admin)/clients/[orgId]/config/page.tsx` so integrations can test a connection and trigger `manual/replay/backfill` runs without falling back to undocumented scripts
- [x] Fix the permission bug in the config page so integration mutations use `admin:integrations:write` instead of the generic `admin:org:write` gate
- [x] Update the affected local docs and reflect any honestly closed `docs/prd/TODO.md` item
- [x] Run targeted tests for the touched admin endpoint helpers, route policies, and config page

### Review

- Added the missing admin endpoint helpers in `app-admin/lib/api/endpoints.ts` for connector test, sync trigger, and sync-run listing.
- Added the matching proxy policies in `app-admin/lib/auth/admin-route-policies.ts`, then covered them through `route-access` tests.
- Upgraded `app-admin/app/(admin)/clients/[orgId]/config/page.tsx` so the admin can:
  - test a selected connector connection;
  - trigger `manual`, `replay`, or `backfill` runs with optional full-sync and explicit source windows;
  - inspect the latest sync runs without dropping to runtime scripts.
- Fixed a real permission bug in the config page: integration mutations no longer depend on `admin:org:write`; they now enforce `admin:integrations:write`.
- Updated the local docs in `app-admin/app/(admin)/clients/[orgId]/config/README.md`, `app-admin/lib/api/README.md`, and `app-admin/lib/auth/README.md`.
- Marked `Ajouter replay/backfill par connecteur sans reconstruction manuelle` as closed in `docs/prd/TODO.md`, because the repo now proves that replay/backfill is operable through the guarded admin UI and API path instead of only through lower-level runtime primitives.

### Verification

- `pnpm --dir app-admin test -- lib/api/__tests__/endpoints.test.ts lib/auth/__tests__/route-access.test.ts 'app/(admin)/clients/[orgId]/config/__tests__/page.test.tsx'`
- `pnpm --dir app-admin typecheck`

## Current Pass - 2026-03-16 - Performance Budget Enforcement

### Plan

- [x] Add the missing root script for performance budget validation so the documented command exists
- [x] Enforce the validator from the local blocking gates that already claim to run it
- [x] Enforce the same validator in the remote admin/API workflows
- [x] Update the affected docs and `docs/prd/TODO.md` if the enforcement gap is honestly closed
- [x] Run the validator test and the validator itself locally

### Review

- Added the missing root script `pnpm performance:validate-budgets` in `package.json`, aligned with the already versioned validator `scripts/validate-performance-budgets.mjs`.
- Wired the validator into the local blocking paths:
  - `scripts/gate-prepush-deep.sh`
  - `scripts/gate-exhaustive-local.sh`
- Wired the same validator into the remote required workflows:
  - `.github/workflows/ci-api.yml`
  - `.github/workflows/ci-admin.yml`
- Updated the distributed docs in `scripts/README.md`, `docs/runbooks/local-gate-exhaustive.md`, `docs/performance/README.md`, and `.github/workflows/README.md` so the repo no longer claims enforcement that does not actually exist.
- Marked `Versionner et durcir une politique de budgets perf/scalabilite/outils sans echappatoire manuelle` as closed in `docs/prd/TODO.md`.

### Verification

- `node --test scripts/__tests__/validate-performance-budgets.test.mjs`
- `pnpm performance:validate-budgets`
- Updated touched directory docs in:
  - `app-admin/app/(admin)/clients/[orgId]/actions/dispatches/[actionId]/README.md`
  - `app-api-ts/src/README.md`
  - `app-api-ts/src/services/README.md`
- Marked the `docs/prd/TODO.md` item `Ajouter un vrai lifecycle dry-run -> dispatch -> acknowledged -> failed -> retried -> canceled` as closed because the lifecycle is now reachable through shared types, API route, admin policy surface, persistent service, admin UI, and tests.
- Verification completed:
  - `pnpm --dir app-api-ts test -- src/__tests__/decisionops-runtime-action.test.ts src/__tests__/routes.contracts.test.ts`
  - `pnpm --dir app-admin test -- 'app/(admin)/clients/[orgId]/actions/dispatches/[actionId]/__tests__/page.test.tsx' lib/api/__tests__/endpoints.test.ts lib/auth/__tests__/route-access.test.ts`

## Current Pass - 2026-03-16 - Fallback Humain et Ledger Closure

### Plan

- [x] Fermer l'ecart runtime qui preprepare le fallback humain avant un vrai echec de dispatch
- [x] Ajouter une mutation admin persistante de fallback humain sur `ActionDispatch`
- [x] Rendre la page admin de detail dispatch actionnable pour `prepare` et `execute` du fallback, sans depasser les garde-fous de taille
- [x] Recaler `docs/prd/TODO.md` sur les fermetures ledger deja prouvees et sur la nouvelle fermeture fallback si elle est verifiee
- [x] Mettre a jour la doc locale des dossiers touches et executer les tests cibles `shared-types`, `app-api-ts` et `app-admin`

## Current Pass - 2026-03-16 - Dispatch Fallback And Idempotence

### Plan

- [x] Add a typed admin mutation for explicit human fallback on `ActionDispatch`
- [x] Wire the persistent fallback mutation through `app-api-ts` routes and admin route policies
- [x] Extend the admin action-dispatch detail page with permission-aware fallback actions
- [x] Harden persistent dispatch idempotence at runtime insertion time and cover the conflict path in tests
- [x] Update the touched runtime docs and reflect the verified closures in `docs/prd/TODO.md`
- [x] Run targeted `app-api-ts` and `app-admin` tests for the new mutation and idempotence guard

### Review

- Reused the already present typed/runtime fallback mutation path (`ActionDispatchFallback`) and completed the end-to-end branch by making the admin action-dispatch detail page explicitly actionable for human fallback preparation and execution.
- Kept the UI fail-close:
  - fallback actions require `admin:org:write`
  - fallback preparation stays blocked while a valid retry is still available unless the destination policy requires immediate human fallback
  - the page now refreshes after fallback mutation exactly like the lifecycle mutation
- Hardened runtime idempotence for the seeded `action_dispatches` path:
  - app-level pre-check on `organization_id + idempotency_key` before inserting the persistent dispatch
  - conflict-specific runtime error `ACTION_DISPATCH_IDEMPOTENCY_CONFLICT`
  - versioned DB guard in `app-api-ts/migrations/002_decisionops_runtime_guards.sql`
- Updated distributed docs and reflected only the verified closures in `docs/prd/TODO.md`:
  - explicit human fallback on failed write-back
  - baseline / recommended / actual separation
  - persisted counterfactual method
  - finance validation status
  - versioned recalculation when actuals arrive later
- Verification completed:
  - `pnpm --dir app-api-ts test -- src/__tests__/decisionops-runtime.test.ts src/__tests__/decisionops-runtime-action.test.ts src/__tests__/routes.contracts.test.ts`
  - `pnpm --dir app-admin test -- 'app/(admin)/clients/[orgId]/actions/dispatches/[actionId]/__tests__/page.test.tsx' lib/api/__tests__/endpoints.test.ts lib/auth/__tests__/route-access.test.ts`

## Current Pass - 2026-03-16 - Dispatch Writeback Permissions

### Plan

- [x] Extend the action-dispatch detail contract so admin surfaces can see contract/destination write-back permissions explicitly
- [x] Enforce write-back permission checks in persistent action decision and fallback services, not only in page navigation
- [x] Hide or block dispatch/fallback mutations in the admin detail page when contract or destination permissions are missing
- [x] Update targeted tests across shared detail builders, runtime action services, route contracts, and the admin page
- [x] Reflect the verified closure in `docs/prd/TODO.md` and touched README files

### Review

- Extended `ActionDispatchDetailResponse` with an explicit `permissions` block so admin surfaces now know whether write-back is allowed by contract and which destination permission keys are required.
- Enforced the same rule server-side in `decisionops-runtime-action.ts` for both lifecycle mutations and fallback mutations:
  - contract-level deny now returns `ACTION_DISPATCH_PERMISSION_DENIED`
  - missing destination permission keys now return `ACTION_DISPATCH_PERMISSION_DENIED`
- Updated the admin dispatch detail UI so write actions disappear behind honest read-only states when:
  - `admin:org:write` is missing
  - the contract blocks write-back
  - the destination permission keys required by the dispatch are absent from the current admin token
- Marked `docs/prd/TODO.md` item `Ajouter les permissions de write-back par contrat et par destination` as closed because the rule is now visible in the shared detail contract, enforced in the persistent mutation services, reflected in the admin page, and covered by tests.
- Verification completed:
  - `pnpm --dir packages/shared-types test -- src/__tests__/action-dispatch-detail.test.ts`
  - `pnpm --dir app-api-ts test -- src/__tests__/action-dispatch-detail.test.ts src/__tests__/decisionops-runtime-action.test.ts src/__tests__/routes.contracts.test.ts`
  - `pnpm --dir app-admin test -- 'app/(admin)/clients/[orgId]/actions/dispatches/[actionId]/__tests__/page.test.tsx'`

## Current Pass - 2026-03-16 - Fallback Stabilization et Page Guardrails

### Plan

- [x] Revalider les contrats partages et les routes fallback apres enforcement des permissions write-back
- [x] Extraire les panneaux de mutation des pages admin dispatch et ledger pour revenir sous les garde-fous de taille
- [x] Resynchroniser la doc distribuee des dossiers touches
- [x] Rejouer les tests cibles `shared-types`, `app-api-ts` et `app-admin`

### Review

- Revalide la chaine `shared-types -> app-api-ts -> app-admin` autour du fallback humain et des permissions write-back:
  - les routes admin dispatch/fallback propagent bien les `permissions` acteur jusqu'au service persistant
  - les contrats de route restent fail-close avec des params valides et des ids invalides
- Ramene les pages admin sous les garde-fous de taille sans changer le comportement:
  - `app-admin/.../actions/dispatches/[actionId]/page.tsx` delegue maintenant les mutations a `dispatch-controls.tsx`
  - `app-admin/.../rapports/ledgers/[ledgerId]/page.tsx` delegue maintenant les mutations et snapshots a `ledger-panels.tsx`
- Met a jour la documentation distribuee pour refléter les nouveaux artefacts et endpoints:
  - `packages/shared-types/README.md`
  - `app-admin/lib/api/README.md`
  - `app-admin/.../rapports/ledgers/[ledgerId]/README.md`
- Verification executee:
  - `pnpm --dir packages/shared-types test -- src/__tests__/action-dispatch-fallback.test.ts src/__tests__/action-dispatch-detail.test.ts`
  - `pnpm --dir app-api-ts test -- src/__tests__/decisionops-runtime-action.test.ts src/__tests__/action-dispatch-detail.test.ts src/__tests__/routes.contracts.test.ts src/__tests__/decisionops-runtime-approval.test.ts`
  - `pnpm --dir app-admin test -- 'app/(admin)/clients/[orgId]/actions/dispatches/[actionId]/__tests__/page.test.tsx' lib/api/__tests__/endpoints.test.ts lib/auth/__tests__/route-access.test.ts`

## Current Pass - 2026-03-16 - Decision Contract Template Routes

### Plan

- [x] Expose admin routes for listing DecisionContract templates and previewing a template instantiation without persistence
- [x] Expose an admin route for explicit DecisionContract <-> DecisionGraph compatibility evaluation
- [x] Register the new admin endpoints and same-origin API policies in `app-admin`
- [x] Cover the new HTTP contract and admin endpoint/policy registration in targeted tests
- [x] Reflect the verified closure for contract templates in `docs/prd/TODO.md` and touched README files

### Review

- Added the missing admin governance routes that were already modeled in shared types and pure services but not yet exposed over HTTP:
  - `GET /api/v1/admin/decision-contract-templates`
  - `POST /api/v1/admin/decision-contract-templates/instantiate-preview`
  - `POST /api/v1/admin/decision-compatibility/evaluate`
- These routes stay honest about their role:
  - template catalog and preview are pure admin governance helpers, not fake persistence
  - compatibility evaluation is an explicit compute surface, not a hidden helper only reachable from tests
- Registered the matching admin endpoints and route policies in `app-admin`, then updated the distributed READMEs so the new governance surface is visible from both the admin proxy layer and the API runtime docs.
- Marked `docs/prd/TODO.md` item `Ajouter des templates de contrats par pack (Coverage, Flow, Allocation)` as closed because the repo now carries versioned templates across packs and exposes them through an admin API plus instantiation preview.
- Verification completed:
  - `pnpm --dir app-api-ts test -- src/__tests__/routes.contracts.test.ts`
  - `pnpm --dir app-admin test -- lib/api/__tests__/endpoints.test.ts lib/auth/__tests__/route-access.test.ts`

## Current Pass - 2026-03-16 - Decision Contract Runtime Persistence

### Plan

- [x] Ajouter les contrats API partages pour un `DecisionContract` runtime persistant (save, transition, rollback)
- [x] Implementer un service `DecisionContract` persistant avec versioning, fork, rollback et audit append-only dedie
- [x] Exposer les routes admin org-scoped du Contract Studio runtime et enregistrer les endpoints/policies admin associes
- [x] Ajouter les tests cibles `shared-types`, `app-api-ts` et `app-admin`
- [x] Mettre a jour la doc distribuee et ne cocher dans `docs/prd/TODO.md` que les fermetures prouvees par le repo

### Review

- Le repo supporte maintenant un vrai runtime persistant `DecisionContract` distinct du `decision-config`, avec service dedie, schema SQL versionne et bootstrap au demarrage via:
  - `app-api-ts/src/services/decision-contract-runtime.ts`
  - `app-api-ts/migrations/003_decision_contract_runtime.sql`
  - `app-api-ts/src/index.ts`
- Le Contract Studio org-scoped est expose de bout en bout dans l'API admin:
  - `GET /api/v1/admin/organizations/:orgId/decision-contracts`
  - `GET /api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion`
  - `POST /api/v1/admin/organizations/:orgId/decision-contracts`
  - `POST /api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/transition`
  - `POST /api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/fork`
  - `GET /api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/rollback-candidates`
  - `POST /api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/rollback`
- La surface admin et ses garde-fous sont maintenant alignes avec ce runtime:
  - endpoints dans `app-admin/lib/api/endpoints.ts`
  - policies proxy/page dans `app-admin/lib/auth/admin-route-policies.ts`
  - page runtime documentee dans `app-admin/app/(admin)/clients/[orgId]/contrats/README.md`
- `docs/prd/TODO.md` peut maintenant fermer honnetement les cases suivantes de la section 5:
  - `Faire de DecisionContract un objet logiciel de premier rang, distinct du simple decision-config`
  - `Definir le cycle de vie complet draft -> testing -> approved -> published -> archived`
  - `Ajouter versioning, auteur, motif de changement, rollback et audit pour les contrats`
- Verification executee:
  - `pnpm --dir packages/shared-types build`
  - `pnpm --dir packages/shared-types test -- src/__tests__/decision-contract-studio.test.ts`
  - `pnpm --dir app-api-ts test -- src/__tests__/decision-contract-runtime.test.ts src/__tests__/decision-contract-studio.test.ts src/__tests__/routes.contracts.test.ts`
  - `pnpm --dir app-admin test -- lib/api/__tests__/endpoints.test.ts lib/auth/__tests__/route-access.test.ts components/__tests__/client-tabs-nav.test.tsx components/__tests__/command-palette.test.ts 'app/(admin)/clients/[orgId]/contrats/__tests__/page.test.tsx' 'app/(admin)/clients/[orgId]/rapports/ledgers/[ledgerId]/__tests__/page.test.tsx'`
  - `pnpm build:api`
  - `pnpm build:admin`

## Current Pass - 2026-03-16 - Decision Graph and Scenario Runtime PRD

### Plan

- [x] Re-read the open `docs/prd/TODO.md` items for sections 5 and 6 and align them with the existing PRD continuation artifacts
- [x] Draft `docs/prd/decision-graph-and-scenario-runtime-spec.md` as the missing execution contract for semantic graph and persistent scenario runtime
- [x] Update `docs/prd/README.md` and `docs/prd/TODO.md` so the new artifact becomes part of the living PRD map
- [x] Update `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` so the main PRD reflects the repo state and the living artifacts as of 16 March 2026
- [x] Re-read the touched docs and run targeted hygiene checks before closing the pass

### Review

- Added `docs/prd/decision-graph-and-scenario-runtime-spec.md` as the missing PRD continuation artifact for the still-open nucleus `DecisionGraph + semantic query API + persistent scenario runtime + explainability + regression evidence`.
- Updated `docs/prd/README.md` so this new artifact now sits alongside the connector trust, contract governance, operating loop, build-release, execution backbone, and verification matrix docs.
- Updated `docs/prd/TODO.md` so sections 5 and 6, plus the related parts of 9 and 12, now explicitly point to this new graph/scenario spec instead of staying covered only indirectly.
- Refreshed `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` to keep the main PRD honest and useful:
  - metadata date/version/status moved to 16 March 2026 / `v1.2`
  - section `4.6` now reflects the current repo state more accurately
  - new section `4.7` links the main PRD to the living artifacts in `docs/prd/`
  - sections 7, 8, 9, 11, 12, and 13 were adjusted where needed to reflect the current runtime/documentation reality without overstating closures
- Verification completed:
  - manual re-read of `docs/prd/decision-graph-and-scenario-runtime-spec.md`, `docs/prd/README.md`, `docs/prd/TODO.md`, and the touched PRD sections
  - ASCII hygiene check on `docs/prd/decision-graph-and-scenario-runtime-spec.md` and `docs/prd/README.md` via `LC_ALL=C rg -n "[^\\x00-\\x7F]" ...` with no matches
  - size check via `wc -l` to keep the new spec reviewable
- No application tests were run because this was a documentation-only pass.

## Current Pass - 2026-03-16 - Decision Ledger Finance-Grade PRD

### Plan

- [x] Re-read the open `docs/prd/TODO.md` items for section 8 and the ledger/ROI acceptance criteria already present in the PRD continuation docs
- [x] Draft `docs/prd/decision-ledger-and-roi-proof-spec.md` as the missing execution contract for finance-grade ledger, monthly review, exports, and proof semantics
- [x] Update `docs/prd/README.md` and `docs/prd/TODO.md` so the new artifact becomes part of the living PRD map for ledger closure
- [x] Update `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` so the main PRD reflects the dedicated ledger/proof artifact and stays honest about what is still open
- [x] Re-read the touched docs and run targeted hygiene checks before closing the pass

### Review

- Added `docs/prd/decision-ledger-and-roi-proof-spec.md` as the dedicated PRD continuation artifact for finance-grade `Decision Ledger`, ROI proof, proof-pack boundary, monthly review, drill-down, and exports.
- Updated `docs/prd/README.md` so the ledger/proof artifact now sits explicitly alongside the connector trust, contract governance, graph/scenario runtime, operating loop, build-release, execution backbone, and verification matrix docs.
- Updated `docs/prd/TODO.md` so section 8, plus the related parts of 7, 9, 11, and 12, now point to the ledger/proof artifact instead of leaving the finance-grade proof layer covered only indirectly.
- Refreshed `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` to keep the main PRD honest and connected to the living doc set:
  - metadata moved to `v1.3` on 16 March 2026
  - section `4.7` now includes the ledger/proof artifact in the living artifact map
  - section `6.8` now states more explicitly what is already present in the repo vs what remains open on cockpit, exports, drill-down, and proof-pack separation
  - the runtime/UX/API roadmap sections now remain aligned with the dedicated ledger/proof artifact instead of overloading the main PRD narrative
- Verification completed:
  - manual re-read of `docs/prd/decision-ledger-and-roi-proof-spec.md`, `docs/prd/README.md`, `docs/prd/TODO.md`, and the touched PRD sections
  - ASCII hygiene check on `docs/prd/decision-ledger-and-roi-proof-spec.md` and `docs/prd/README.md`
  - consistency check that `README.md`, `TODO.md`, and the PRD main artifact map all point to the same canonical ledger/proof filename
- No application tests were run because this was a documentation-only pass.

## Current Pass - 2026-03-16 - Control Plane Trust Gate PRD

### Plan

- [x] Re-read the open `docs/prd/TODO.md` items for sections 1 and 3 plus the related trust-gate requirements already present in the PRD continuation docs
- [x] Draft `docs/prd/control-plane-trust-gate-spec.md` as the missing execution contract for demo/legacy cleanup, auth/RBAC/tenant safety, append-only audit, and privileged access trust
- [x] Update `docs/prd/README.md` and `docs/prd/TODO.md` so the new artifact becomes part of the living PRD map for control-plane closure
- [x] Update `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` so the main PRD reflects the dedicated trust-gate artifact and stays honest about what is still open
- [x] Re-read the touched docs and run targeted hygiene checks before closing the pass

### Review

- Added `docs/prd/control-plane-trust-gate-spec.md` as the dedicated PRD continuation artifact for the still-open trust skeleton: demo/legacy/fallback cleanup, auth/RBAC/tenant safety, append-only audit extension, break-glass, and support least-privilege.
- Updated `docs/prd/README.md` so the new trust-gate artifact now sits alongside the connector trust, contract governance, graph/scenario runtime, ledger/proof, operating loop, build-release, execution backbone, and verification matrix docs.
- Updated `docs/prd/TODO.md` so sections 1 and 3, plus the related trust-sensitive parts of 12 and 15, now explicitly point to the control-plane trust-gate artifact instead of remaining spread across broader execution and SRE docs.
- Refreshed `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` to keep the main PRD honest and connected to the living doc set:
  - metadata moved to `v1.4` on 16 March 2026
  - section `4.6` now includes an explicit `Control plane trust` row in the repo-state table
  - section `4.7` now includes the trust-gate artifact in the living artifact map
  - section `10.2` now states more explicitly that the trust gate is not fully closed while demo/legacy cleanup, append-only audit extension, and privileged implicit paths remain open
- Verification completed:
  - manual re-read of `docs/prd/control-plane-trust-gate-spec.md`, `docs/prd/README.md`, `docs/prd/TODO.md`, and the touched PRD sections
  - ASCII hygiene check on `docs/prd/control-plane-trust-gate-spec.md` and `docs/prd/README.md` via `LC_ALL=C rg -n "[^\\x00-\\x7F]" ...` with no matches after correction
  - size check via `wc -l` to keep the new spec reviewable
- No application tests were run because this was a documentation-only pass.

## Current Pass - 2026-03-16 - UX And E2E Trust Paths PRD

### Plan

- [x] Re-read the open `docs/prd/TODO.md` items for section 9 plus the already documented trust-path evidence in the operating-loop and verification-matrix artifacts
- [x] Draft `docs/prd/ux-and-e2e-trust-paths-spec.md` as the missing execution contract for shared page patterns, degraded states, pack-neutral shells, and critical-path E2E proofs
- [x] Update `docs/prd/README.md` and `docs/prd/TODO.md` so the new artifact becomes part of the living PRD map for UX/trust-path closure
- [x] Update `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` so the main PRD reflects the dedicated UX/E2E artifact and stays honest about what is still open in the shells
- [x] Re-read the touched docs and run targeted hygiene checks before closing the pass

### Review

- Added `docs/prd/ux-and-e2e-trust-paths-spec.md` as the dedicated PRD continuation artifact for shared page models, degraded states, retry/fetch conventions, pack-neutral shells, and the critical-path E2E contract across `app-webapp` and `app-admin`.
- Updated `docs/prd/README.md` so the UX/E2E artifact now sits alongside connector trust, control-plane trust, contract governance, graph/scenario runtime, ledger/proof, operating loop, build-release, execution backbone, and the verification matrix.
- Updated `docs/prd/TODO.md` so section 9, plus the related parts of 10, 12, and 15, now explicitly point to the UX/E2E artifact instead of leaving shell consistency and E2E critical paths covered only indirectly.
- Refreshed `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` to keep the main PRD honest and connected to the living doc set:
  - metadata moved to `v1.5` on 16 March 2026
  - section `4.7` now includes the UX/E2E artifact in the living artifact map
  - section `8.1` now states more explicitly that the next UX closure is inter-shell convergence rather than only adding more screens
  - section `8.3` now states more explicitly that operator, approver, and support must not see divergent product states across apps
  - section `11.4` now includes the need for E2E critical-path coverage on real persistent flows
- Verification completed:
  - manual re-read of `docs/prd/ux-and-e2e-trust-paths-spec.md`, `docs/prd/README.md`, `docs/prd/TODO.md`, and the touched PRD sections
  - ASCII hygiene check on `docs/prd/ux-and-e2e-trust-paths-spec.md` and `docs/prd/README.md` via `LC_ALL=C rg -n "[^\\x00-\\x7F]" ...` with no matches
  - size check via `wc -l` to keep the new spec reviewable
- No application tests were run because this was a documentation-only pass.

## Current Pass - 2026-03-16 - Approval And Action Mesh Governance PRD

### Plan

- [x] Re-read the open `docs/prd/TODO.md` items for section 7 plus the approval/action requirements already present in the contract-governance and operating-loop artifacts
- [x] Draft `docs/prd/approval-and-action-mesh-governance-spec.md` as the missing execution contract for approval matrix, structured justification, SoD, idempotence, sandbox, and composite actions
- [x] Update `docs/prd/README.md` and `docs/prd/TODO.md` so the new artifact becomes part of the living PRD map for section 7 closure
- [x] Update `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` so the main PRD reflects the dedicated approval/action artifact and stays honest about what is still open
- [x] Re-read the touched docs and run targeted hygiene checks before closing the pass

### Review

- Added `docs/prd/approval-and-action-mesh-governance-spec.md` as the dedicated PRD continuation artifact for section 7: approval matrix, structured justification, critical SoD, end-to-end idempotence, composite actions, and sandboxed Action Mesh execution.
- Updated `docs/prd/README.md` so the approval/action artifact now sits alongside connector trust, control-plane trust, contract governance, graph/scenario runtime, ledger/proof, UX/E2E, operating loop, build-release, execution backbone, and the verification matrix.
- Updated `docs/prd/TODO.md` so section 7, plus the related parts of 5, 8, 9, and 12, now explicitly point to the approval/action artifact instead of leaving execution governance split only across the contract and operating-loop docs.
- Refreshed `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` to keep the main PRD honest and connected to the living doc set:
  - metadata moved to `v1.6` on 16 March 2026
  - section `4.7` now includes the approval/action governance artifact in the living artifact map
  - section `6.7` now states more explicitly what already exists in the repo versus what remains open on approval matrix, structured justification, complete idempotence, composite actions, and sandbox
- Verification completed:
  - manual re-read of `docs/prd/approval-and-action-mesh-governance-spec.md`, `docs/prd/README.md`, `docs/prd/TODO.md`, and the touched PRD sections
  - ASCII hygiene check on `docs/prd/approval-and-action-mesh-governance-spec.md` and `docs/prd/README.md` via `LC_ALL=C rg -n "[^\\x00-\\x7F]" ...` with no matches after correction
  - size check via `wc -l` to keep the new spec reviewable
- No application tests were run because this was a documentation-only pass.

## Current Pass - 2026-03-16 - Release Candidate Hardening And Landing Deployment

### Plan

- [x] Audit the dirty workspace, release scripts, and Scaleway prerequisites for the landing deployment
- [x] Run targeted builds, tests, and release preflight checks on the touched surfaces to identify real blockers
- [x] Fix the blockers with long-term repo-safe changes and update the touched local docs in the same pass
- [x] Re-run the relevant verification until the workspace is green enough for release
- [x] Commit and push the verified workspace on `main`
- [ ] Build a signed landing release artifact and deploy it on Scaleway with smoke verification

### Review

- Verified the current workspace locally with:
  - `pnpm build:api`
  - `pnpm build:admin`
  - `pnpm build:landing`
  - `pnpm --filter @praedixa/shared-types test`
  - `pnpm --filter @praedixa/api-ts test`
  - `pnpm --filter @praedixa/admin test`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm format:check`
  - `pnpm test:e2e:landing`
- Fixed two real release-candidate blockers:
  - `app-api-ts/src/routes.ts` now keeps `DECISION_CONTRACT_TRANSITIONS` as a typed shared route constant, which restores both lint and TypeScript inference on the decision-contract transition route
  - `playwright.config.ts` now supports `PW_SERVER_TARGETS`, and the targeted `package.json` E2E scripts (`landing`, `webapp`, `admin`, `smoke`) now start only the required Next.js servers instead of booting the whole monorepo for a single-project run
- Updated `testing/e2e/README.md` and `testing/e2e/landing/README.md` so the scoped Playwright server behavior is documented with the targeted commands
- Root-cause result for the landing E2E red:
  - the flaky landing header scroll proof was not a product bug in `ScrollReactiveHeader`; browser-level reproduction confirmed the runtime state still transitions `visible -> hidden -> visible`
  - `testing/e2e/landing/navigation.spec.ts` now uses deterministic `window.scrollTo` / `window.scrollBy` with `expect.poll` instead of `mouse.wheel`, which removes the scroll-interaction flake from the blocking gate
  - the targeted regression proof now passes with `PW_SERVER_TARGETS=landing PW_REUSE_SERVER=1 pnpm exec playwright test testing/e2e/landing/navigation.spec.ts --project=landing --workers=1 --grep 'navbar hides on downward scroll' --reporter=list`
- Fixed one additional test-drift blocker in the landing unit suite by aligning `app-landing/components/homepage/__tests__/HeroSection.test.tsx` with the current approved French hero copy (`Prédisez 3 à 14 jours plus tôt`) instead of the stale legacy wording.
- Scaleway deployment remains blocked by infrastructure preflight, not by the application build:
  - `./scripts/scw-preflight-deploy.sh staging` fails because the DNS zone is not active in the current account context, staging namespaces/containers are missing, and several required DB/Redis/bucket resources are absent
  - `DNS_DELEGATION_MODE=transitional SCW_DEFAULT_PROJECT_ID=6551109e-86d0-414a-8b8d-4078d70f9155 ./scripts/scw-preflight-deploy.sh prod` still fails because `webapp-prod`, `admin-prod`, and `api-prod` are missing, the DNS records are not active in Scaleway, and `landing-web` itself still lacks required runtime secrets/config such as `RATE_LIMIT_STORAGE_URI`, `CONTACT_FORM_CHALLENGE_SECRET`, and `LANDING_TRUST_PROXY_IP_HEADERS`
- Result: the repo is in a verified commit-ready state locally, but the signed Scaleway deployment path must stay blocked until the infra/runtime preflight turns green.

## Current Pass - 2026-03-16 - Gate And Release Hardening Continuation

### Plan

- [ ] Reproduce the current `gate:verify` / `architecture:ts-guardrails` failure set on the dirty workspace and isolate the real regression clusters
- [ ] Refactor the largest DecisionOps admin slices out of `app-api-ts/src/routes.ts` and `app-admin/lib/auth/admin-route-policies.ts` into feature modules without changing behavior
- [ ] Split the new DecisionContract / dispatch / ledger / config modules so file and function guardrails return below the versioned baseline
- [ ] Split the newly added landing components into smaller subcomponents/hooks so the same guardrail passes without relaxing policy
- [ ] Re-run `pnpm architecture:ts-guardrails`, the targeted tests, and the relevant gate/preflight commands; record what is fixed versus what remains infra-blocked

### Review

- In progress.
- The `app-admin/app/(admin)/clients/[orgId]/config` slice is now structurally back under the local TS guardrail without relaxing policy:
  - `page.tsx` now stays as a thin orchestrator (`94` lines)
  - decision-config rendering split into `decision-config-section.tsx` + `decision-config-card.tsx`
  - integrations rendering split into `integrations-section.tsx`, `integrations-section-view.tsx`, `integrations-section-ops.tsx`, and `integrations-section-tables.tsx`
  - shared table/notice helpers live in `async-data-table-block.tsx` and `config-readonly-notice.tsx`
- Verified on the config slice:
  - `node scripts/check-ts-guardrail-baseline.mjs --include-root 'app-admin/app/(admin)/clients/[orgId]/config'`
  - `pnpm --dir app-admin exec eslint 'app/(admin)/clients/[orgId]/config/page.tsx' 'app/(admin)/clients/[orgId]/config/async-data-table-block.tsx' 'app/(admin)/clients/[orgId]/config/config-readonly-notice.tsx' 'app/(admin)/clients/[orgId]/config/cost-params-section.tsx' 'app/(admin)/clients/[orgId]/config/proof-packs-section.tsx' 'app/(admin)/clients/[orgId]/config/decision-config-card.tsx' 'app/(admin)/clients/[orgId]/config/decision-config-section.tsx' 'app/(admin)/clients/[orgId]/config/integrations-section.tsx' 'app/(admin)/clients/[orgId]/config/integrations-section-view.tsx' 'app/(admin)/clients/[orgId]/config/integrations-section-ops.tsx' 'app/(admin)/clients/[orgId]/config/integrations-section-tables.tsx' 'app/(admin)/clients/[orgId]/config/config-operations.ts' 'app/(admin)/clients/[orgId]/config/config-types.ts'`
  - `pnpm --dir app-admin test -- 'app/(admin)/clients/[orgId]/config/__tests__/page.test.tsx'`
- `pnpm --dir app-admin typecheck` is still red for pre-existing non-config errors in the dirty workspace:
  - `app/(admin)/clients/[orgId]/actions/dispatches/[actionId]/action-dispatch-detail-view.tsx`
  - `app/(admin)/clients/[orgId]/actions/dispatches/[actionId]/dispatch-control-ui.tsx`
  - `app/(admin)/clients/[orgId]/actions/dispatches/[actionId]/dispatch-fallback-panel.tsx`
  - `app/(admin)/clients/[orgId]/contrats/contract-studio-create-panel.tsx`
  - `app-admin/lib/auth/admin-route-policies.ts`

## Current Pass - 2026-03-17 - Hook Recovery And Push Preparation

### Plan

- [x] Reproduce the remaining `pre-push` failures after the admin/config guardrail work
- [x] Fix the root causes in `app-api-ts` instead of patching the hook symptoms
- [x] Re-run the targeted red tests, then the full `app-api-ts` package verification
- [x] Update the local docs and repo guardrails with the newly discovered prevention rules
- [ ] Re-run `pnpm gate:prepush`, then commit the full workspace and push `main`

### Review

- Fixed the last blocking `app-api-ts` regressions uncovered by the hook chain:
  - `decisionops-runtime-seed-records.ts` now uses an explicit `ScenarioOptionType -> action template binding` map aligned with the active `action-templates` catalog, instead of emitting stale legacy pairs like `workforce_adjustment + staffing_shift`
  - `decision-contract-runtime-support.ts` now creates rollback drafts with a clean draft audit state and an explicit `rollbackFromVersion` lineage pointing to the superseded live version
  - `admin-decision-runtime-route-support.ts` and `admin-decision-contract-route-support.ts` now preserve `PersistenceError` status/code/details, so fail-close admin routes keep returning `503 PERSISTENCE_UNAVAILABLE` when persistence is missing
  - `admin-decision-contract-route-support.ts` no longer lets a bare `z.custom()` swallow create payloads as `{}` in the save/create union, and the rollback route schema now matches the shared contract with optional `name`
- Updated the local docs in `app-api-ts/src/README.md` and `app-api-ts/src/services/README.md` to document the stricter fail-close behavior and the explicit runtime binding/rollback semantics.
- Added one prevention rule to `AGENTS.md` for `z.custom()` usage in unioned route schemas, and one delivery/communication reminder to `tasks/lessons.md`.
- Verification completed so far:
  - `pnpm --dir app-api-ts test -- src/__tests__/decisionops-runtime.test.ts src/__tests__/decision-contract-runtime.test.ts src/__tests__/routes.contracts.test.ts`
  - `pnpm --dir app-api-ts test`
  - `pnpm --dir app-api-ts build`
