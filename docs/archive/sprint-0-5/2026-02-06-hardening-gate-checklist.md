# Document 2 — Data Foundation Hardening Gate Checklist (ARCHIVED SNAPSHOT)

**Date:** 6 February 2026
**Revision:** 1.2 (archive normalization, current path alignment)
**Archive status:** Historical sprint artifact (Sprint 0.5), not the canonical operational gate.
**Superseded by:** `docs/runbooks/local-gate-exhaustive.md`, `docs/runbooks/mvp-go-live-readiness.md`, `docs/security/devops-audit.md`
**Scope (historical):** `docs/archive/sprint-0-5/2026-02-06-data-foundation-design.md`
**Mode:** Historical reference
**Note:** Ticket statuses and target dates below are historical and must not be used as the active source of truth.

## 1. Start Decision

Development starts **now** with Phase 0 hardening and technical scaffolding.

- `GO` for coding, migrations, tests, and security hardening with synthetic data.
- `NO-GO` for real client HR data until all P0 tickets are `DONE`.
- `NO-GO` for production deployment until P0 is closed and sign-off is recorded.

## 2. Execution Rules

- Use fake/synthetic data only (`scripts/generate_fake_data.py`) until P0 closure.
- Keep feature work behind non-production flags if it touches HR data flows.
- Attach objective evidence (test output, migration SQL, runbook logs) to each ticket.
- A ticket is not `DONE` without passing acceptance criteria.

## 3. P0 Blocking Gate (mandatory before real data)

### DF-SEC-P0-01 — Auth hardening (JWT + role checks)

- Priority: `P0`
- Owner: API Security
- Status: `OPEN`
- Deliverables:
  - Replace `python-jose` with `PyJWT`.
  - Enforce `RS256` or `EdDSA` only.
  - Add `kid`-based key rotation.
  - Validate sensitive endpoint role against DB state (not token-only).
- Acceptance criteria:
  1. No runtime dependency on `python-jose` in `app-api/pyproject.toml`.
  2. Tokens signed with `none`/`HS256` are rejected.
  3. Expired, malformed, wrong-issuer, wrong-audience tokens are rejected.
  4. Admin endpoints require DB-backed privileged role confirmation.
- Evidence:
  - Unit tests in `app-api/tests/security/test_auth_jwt.py`.
  - CI test log attached.
- Target date: `2026-02-09`

### DF-SEC-P0-02 — Rate limiting + abuse protection

- Priority: `P0`
- Owner: API Platform
- Status: `OPEN`
- Deliverables:
  - Add `slowapi` middleware.
  - Global limits + stricter limits for `/transform`, `/refit`, `/export`, auth endpoints.
  - Add request-size limits and standardized 429 responses.
- Acceptance criteria:
  1. Global API limit enforced.
  2. Endpoint-specific limits enforced on sensitive routes.
  3. 429 responses are deterministic and logged with request ID.
  4. Brute-force simulation test triggers block.
- Evidence:
  - Integration tests in `app-api/tests/security/test_rate_limits.py`.
  - Load test output showing throttling behavior.
- Target date: `2026-02-09`

### DF-SEC-P0-03 — Dynamic DDL and YAML hardening

- Priority: `P0`
- Owner: Data Platform
- Status: `OPEN`
- Deliverables:
  - Implement `app-api/app/core/ddl_validation.py`.
  - Validate `client slug`, schema, table, column, and type via strict allowlists.
  - Enforce `strictyaml` schema validation with field allowlist.
  - Ensure all DDL uses `psycopg.sql.Identifier`.
- Acceptance criteria:
  1. Payloads with invalid identifiers are rejected.
  2. Reserved words/prefixes are rejected.
  3. Unsupported type strings are rejected.
  4. No f-string interpolation in DDL paths.
- Evidence:
  - Tests in `app-api/tests/security/test_schema_manager_validation.py`.
  - Static grep evidence showing no dynamic DDL f-strings in schema manager.
- Target date: `2026-02-10`

### DF-SEC-P0-04 — PostgreSQL role architecture + ownership + default privileges (UPDATED)

- Priority: `P0`
- Owner: DB Security
- Status: `OPEN`
- Deliverables:
  - Implement role hierarchy migration (`002_role_architecture.sql`) including `praedixa_owner`.
  - Ensure Schema Manager DDL creates objects owned by `praedixa_owner`.
  - `ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner` for `_raw` and `_transformed` schemas.
- Acceptance criteria:
  1. `praedixa_ingest` can write `_raw` and cannot access `_transformed`.
  2. `praedixa_etl` can read `_raw`, write `_transformed`, and read required catalog tables.
  3. `praedixa_api` can read `_raw` only (and never `_transformed`).
  4. Newly created tables inherit grants automatically **without manual GRANT**.
- Evidence:
  - SQL verification script output saved in `docs/security-evidence/roles-verify-2026-02-xx.md`.
  - Automated test: `app-api/tests/security/test_default_privileges.py`.
- Target date: `2026-02-10`

### DF-SEC-P0-05 — RLS full coverage and isolation tests (UPDATED scope)

- Priority: `P0`
- Owner: Backend
- Status: `OPEN`
- Deliverables:
  - Apply RLS (`ENABLE` + `FORCE`) to all org-scoped **platform** tables:
    - `organizations`, `users`, `client_datasets`, `dataset_columns`, `fit_parameters`, `ingestion_log`, `pipeline_config_history`
    - plus any existing domain tables if present in the repo.
  - Add policy coverage for read/write paths.
  - Add integration tests for cross-tenant denial.
- Acceptance criteria:
  1. RLS enabled+forced on all listed tables.
  2. Cross-tenant read attempts fail.
  3. Cross-tenant write attempts fail.
  4. Tenant-local read/write still works.
- Evidence:
  - `uv run pytest app-api/tests/test_rls_isolation.py -q` output.
- Target date: `2026-02-10`

### DF-SEC-P0-06 — RGPD erasure with crypto-shredding and backup lifecycle (UPDATED key storage)

- Priority: `P0`
- Owner: Security + Legal Engineering
- Status: `OPEN`
- Deliverables:
  - Implement `rgpd_erasure.py` with dual-approval enforcement.
  - Implement key-destruction step **in Secrets Manager/KMS** before schema deletion.
  - Implement verification queries across all platform tables.
  - Document backup expiration behavior and restore constraints.
- Acceptance criteria:
  1. Erasure run deletes schemas and platform rows for target org.
  2. Destroyed external org keys prevent decryption of restored backup data.
  3. Audit events capture request, approvals, completion.
  4. Runbook approved by Security + Legal.
- Evidence:
  - End-to-end dry run report in `docs/security-evidence/rgpd-erasure-dry-run-2026-02-xx.md`.
- Target date: `2026-02-11`

### DF-SEC-P0-07 — Incident freeze/unfreeze runbook validation (UPDATED for role inheritance)

- Priority: `P0`
- Owner: SecOps
- Status: `OPEN`
- Deliverables:
  - Fix role names and SQL commands in incident runbook to revoke from **group roles** (not only login roles).
  - Execute tabletop + technical drill on staging/local.
- Acceptance criteria:
  1. Freeze script revokes the correct roles (group roles that actually hold privileges).
  2. Active sessions are terminated for target schema.
  3. Unfreeze restores intended least-privilege grants.
  4. Drill completes within SLA with incident log.
- Evidence:
  - Drill transcript in `docs/security-evidence/incident-freeze-drill-2026-02-xx.md`.
- Target date: `2026-02-11`

### DF-SEC-P0-08 — Verification gate hardening

- Priority: `P0`
- Owner: DevSecOps
- Status: `OPEN`
- Deliverables:
  - Maintain local exhaustive gate coverage for `bandit`, `pip-audit`, `gitleaks`, `trivy`.
  - Keep blocking behavior on policy-defined findings.
  - Keep dependency and secret scanning as mandatory checks in the gate flow.
- Acceptance criteria:
  1. `pnpm gate:exhaustive` fails on a seeded vulnerable dependency.
  2. `pnpm gate:exhaustive` fails on a seeded fake secret.
  3. `pnpm gate:exhaustive` passes on a clean branch.
- Evidence:
  - Local gate logs + signed report (`.git/gate-reports/<sha>.json`).
- Target date: `2026-02-11`

### DF-SEC-P0-09 — Managed DB extensions availability check (NEW)

- Priority: `P0`
- Owner: DB Platform
- Status: `OPEN`
- Deliverables:
  - Verify required extension availability on target environments (local, staging, Scaleway managed PG):
    - `pgcrypto` (mandatory)
    - `pg_cron` (optional; else external scheduler)
    - `pgaudit` (optional; else app audit only)
  - Document final decision and fallback plan.
- Acceptance criteria:
  1. `pgcrypto` confirmed available everywhere (or platform plan changed).
  2. If `pg_cron` unavailable, a working external scheduler path is demonstrated.
  3. If `pgaudit` unavailable, audit coverage is still compliant (app audit + safe DB logging).
- Evidence:
  - `scripts/verify_db_extensions.sql` output in `docs/security-evidence/db-extensions-2026-02-xx.md`.
- Target date: `2026-02-11`

## 4. P1 Hardening (not blocking dev start, required before production)

### DF-SEC-P1-01 — CORS and security header tightening

- Priority: `P1`
- Owner: API Platform
- Status: `OPEN`
- Deliverables:
  - Restrict `allow_headers` and origins.
  - Add CSP, HSTS, X-Content-Type-Options, Referrer-Policy.
- Target date: `2026-02-13`

### DF-SEC-P1-02 — Query bounds and timeouts

- Priority: `P1`
- Owner: Backend
- Status: `OPEN`
- Deliverables:
  - Add pagination caps.
  - Add `pool_timeout`, `statement_timeout`, and query guardrails.
- Target date: `2026-02-13`

### DF-SEC-P1-03 — Data exfiltration detection rules

- Priority: `P1`
- Owner: SecOps
- Status: `OPEN`
- Deliverables:
  - Alerting on abnormal export volume and multi-org access patterns.
  - Dashboards for security events and threshold tuning.
- Target date: `2026-02-13`

## 5. Gate Closure Checklist (P0)

Mark all before enabling real client data:

- [ ] DF-SEC-P0-01 DONE with evidence
- [ ] DF-SEC-P0-02 DONE with evidence
- [ ] DF-SEC-P0-03 DONE with evidence
- [ ] DF-SEC-P0-04 DONE with evidence
- [ ] DF-SEC-P0-05 DONE with evidence
- [ ] DF-SEC-P0-06 DONE with evidence
- [ ] DF-SEC-P0-07 DONE with evidence
- [ ] DF-SEC-P0-08 DONE with evidence
- [ ] DF-SEC-P0-09 DONE with evidence
- [ ] Security lead sign-off recorded
- [ ] Engineering lead sign-off recorded

## 6. Practical Start Plan (development can begin immediately)

Day 0 kickoff order (updated to include extensions/ownership early):

1. Implement `DF-SEC-P0-03` (DDL/YAML hardening) and `DF-SEC-P0-04` (roles/ownership/default privileges).
2. Implement `DF-SEC-P0-09` (extensions availability) to avoid late platform surprises.
3. Implement `DF-SEC-P0-01` (JWT hardening) and `DF-SEC-P0-02` (rate limiting).
4. Implement `DF-SEC-P0-05` tests and RLS migration.
5. Implement `DF-SEC-P0-06` erasure workflow and `DF-SEC-P0-07` incident drill.
6. Wire `DF-SEC-P0-08` gate checks and collect evidence.
