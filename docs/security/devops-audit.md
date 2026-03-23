# DevOps Security Audit Report

**Project:** Praedixa
**Date:** 2026-03-23
**Auditor:** watchtower (DevOps & Infra Security Agent)
**Scope:** merge authority, release governance, supply chain, runtime contracts, deployment hardening

---

## Executive Summary

Praedixa now relies on a **two-level authority model**:

- local signed exhaustive gate for developer-side depth;
- `CI - Autorite` / `Autorite - Required` as the canonical remote merge authority.

Current model:

- blocking local gate command: `pnpm gate:exhaustive`
- signed report verification: `pnpm gate:verify`
- push enforcement: `pnpm gate:prepush`
- canonical remote merge check: `Autorite - Required`
- canonical release workflow: `Release - Platform`

**Current risk summary (operational):**

- CRITICAL: 0
- HIGH: 0
- MEDIUM: 4 (fresh release proof bundle, provider-backed synthetics/supportability, observability centralization, toolchain lifecycle policy)
- LOW: 2 (operational runbook depth, provenance hardening)

---

## 1. Scope and Artifacts Audited

### Verification and hooks

- `.pre-commit-config.yaml`
- `scripts/gates/gate-exhaustive-local.sh`
- `scripts/gates/verify-gate-report.sh`
- `scripts/gates/gate-report-sign.sh`
- `scripts/gate.config.yaml`
- `scripts/dev/install-prek.sh`
- `scripts/validate-build-ready-status.mjs`
- `scripts/generate-build-ready-report.mjs`
- `scripts/validate-turbo-env-coverage.mjs`
- `docs/governance/build-ready-status.json`

### Build/runtime and infra

- `app-api/Dockerfile`
- `app-api/docker-entrypoint.sh`
- `infra/docker-compose.yml`
- `app-landing/Dockerfile.scaleway`
- `app-webapp/Dockerfile.scaleway`
- `app-admin/Dockerfile.scaleway`
- `scripts/scw/scw-*.sh`

### Supply chain and dependency controls

- `pnpm-lock.yaml`
- `app-api/uv.lock`
- `.github/dependabot.yml`
- `.github/workflows/ci-authoritative.yml`
- `.github/workflows/release-platform.yml`
- `.github/workflows/ci-api.yml`
- `.github/workflows/ci-admin.yml`

---

## 2. Local Depth and Remote Authority

| Control                             | Status | Notes                                                           |
| ----------------------------------- | ------ | --------------------------------------------------------------- |
| `pre-commit` runs exhaustive gate   | OK     | `./scripts/gates/gate-exhaustive-local.sh --mode pre-commit`    |
| `pre-push` verifies signed report   | OK     | `./scripts/gates/verify-gate-report.sh --mode pre-push ...`     |
| HEAD-bound signed evidence required | OK     | report tied to commit SHA                                       |
| stale/missing report blocks push    | OK     | enforced in `pre-push`                                          |
| dry-run reports rejected            | OK     | guardrail in verifier                                           |
| `Autorite - Required` on `main`     | OK     | required status check in branch protection                      |
| required review on `main`           | OK     | `required_approving_review_count = 1`                           |
| admin bypass disabled               | OK     | `enforce_admins = true`                                         |
| SHA-level build-ready report        | OK     | `.git/gate-reports/build-ready-<sha>.json` from `CI - Autorite` |

### Tooling coverage

The exhaustive gate covers:

- secrets: `gitleaks`, key detectors
- SAST: `semgrep`, `bandit`, `codeql` wrapper
- SCA: `pip-audit`, `pnpm audit`, `osv-scanner`
- IaC/misconfig: `checkov`, `trivy`, Terraform checks when `.tf` exists
- quality/test/perf: lint, typecheck, unit/integration, critical E2E, performance/accessibility/schema checks

### Operational guardrails

- Missing required tooling fails the gate by default.
- Thresholds and policy are centralized in `scripts/gate.config.yaml`.
- Gate evidence is local and signed (`.git/gate-reports/<sha>.json`).
- The remote workflow now also publishes a machine-readable `build-ready` verdict per SHA.

---

## 3. Container and Runtime Hardening

| Area                         | Status     | Notes                                                                                                                           |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| API image hardening          | OK         | non-root user, multi-stage build, healthcheck                                                                                   |
| Local compose security       | OK         | `no-new-privileges:true` on API service                                                                                         |
| Secret defaults in local env | ACCEPTABLE | local compose now uses a non-placeholder dev password; these credentials remain dev-only and must never be reused outside local |
| Frontend containerization    | OK         | dedicated Scaleway Dockerfiles per app                                                                                          |
| Entrypoint discipline        | OK         | migrations/startup flow controlled in scripts                                                                                   |

Residual improvement:

- continue regular base image refresh cadence and provenance tracking.

---

## 4. Deployment and Governance Posture

### Current deployment model

- `Release - Platform` is the nominal release path for signed build -> manifest -> staging smoke -> prod promotion
- local `release:*` and `scw:*` scripts remain versioned primitives and break-glass helpers
- Cloudflare remains transitional for part of landing/public edge flows where applicable

### Governance note

Remote repository governance is no longer only policy text:

- branch protection is active on `main`
- `Autorite - Required` is required
- one review is required
- admins are also enforced

Residual risk is now about freshness of proofs, not about the existence of the governance model itself.

---

## 5. Supply Chain and Dependency Security

| Control                    | Status | Notes                                        |
| -------------------------- | ------ | -------------------------------------------- |
| JS lockfile present        | OK     | `pnpm-lock.yaml`                             |
| Python lockfile present    | OK     | `app-api/uv.lock`                            |
| local SCA in blocking gate | OK     | `pip-audit`, `pnpm audit`, `osv-scanner`     |
| Dependabot active          | OK     | npm/pip/github-actions/terraform covered     |
| Docker Dependabot coverage | OK     | frontend/API/auth Docker directories covered |

Recommendations:

1. Keep tool versions/pinning policy explicit in gate docs and scripts.
2. Maintain periodic review of transitive dependency exceptions.
3. Keep release evidence freshness auditable by SHA, not only by runbook text.

---

## 6. Secrets and Sensitive Configuration

- `.gitignore` patterns include local secret formats (`.env*`, `.dev.vars`, key/cert patterns).
- Local placeholders remain acceptable only in test/dev contexts.
- No production-grade plaintext secret should be present in tracked files.

Recommended operational controls:

1. periodic `gitleaks` full-history scan in controlled maintenance windows
2. documented secret rotation cadence per environment
3. evidence capture in `docs/security/compliance-pack/11-evidence-index-template.md`

---

## 7. Open Items and Prioritized Remediation

| Priority | Item                       | Action                                                                 |
| -------- | -------------------------- | ---------------------------------------------------------------------- |
| MEDIUM   | Fresh release proof bundle | attach fresh staging/smoke/rollback/restore evidence to one SHA        |
| MEDIUM   | Provider-backed synthetics | go beyond the JSON baseline and wire real external monitors            |
| MEDIUM   | Centralized monitoring     | finish log/alert/dashboard centralization for runtime operations       |
| MEDIUM   | Gate toolchain lifecycle   | formalize upgrade cadence and rollback policy                          |
| LOW      | Provenance metadata        | strengthen SBOM/provenance evidence capture once verifiable end-to-end |
| LOW      | Operational runbook depth  | continue incident + rollback drill enrichment                          |

---

## Appendix: Canonical References

- `docs/runbooks/local-gate-exhaustive.md`
- `docs/runbooks/remote-ci-governance.md`
- `docs/governance/build-ready-status.json`
- `scripts/gate.config.yaml`
- `scripts/gates/gate-exhaustive-local.sh`
- `scripts/gates/verify-gate-report.sh`
