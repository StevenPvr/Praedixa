# DevOps Security Audit Report

**Project:** Praedixa
**Date:** 2026-02-19
**Auditor:** watchtower (DevOps & Infra Security Agent)
**Scope:** local verification gate, supply chain, secrets management, deployment hardening

---

## Executive Summary

Praedixa relies on a **local signed exhaustive gate** as the blocking quality/security control.

Current model:

- blocking gate command: `pnpm gate:exhaustive`
- signed report verification: `pnpm gate:verify`
- push enforcement: `pnpm gate:prepush`
- hooks managed by `./scripts/dev/install-prek.sh`

The generic GitHub verification workflows (`ci.yml`, `audit.yml`) are no longer the source of authority. Remaining GitHub workflows are scoped helpers, not the canonical merge/release gate.

**Current risk summary (operational):**

- CRITICAL: 0
- HIGH: 1 (remote governance/branch protection remains policy-dependent)
- MEDIUM: 3 (toolchain update policy hardening, Docker Dependabot coverage, observability centralization)
- LOW: 3 (operational improvements)

---

## 1. Scope and Artifacts Audited

### Verification and hooks

- `.pre-commit-config.yaml`
- `scripts/gates/gate-exhaustive-local.sh`
- `scripts/gates/verify-gate-report.sh`
- `scripts/gates/gate-report-sign.sh`
- `scripts/gate.config.yaml`
- `scripts/dev/install-prek.sh`

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
- `.github/workflows/ci-api.yml`
- `.github/workflows/ci-admin.yml`

---

## 2. Local Exhaustive Gate Security

### Hook chain and non-bypassability

| Control                             | Status | Notes                                                                    |
| ----------------------------------- | ------ | ------------------------------------------------------------------------ |
| `pre-commit` runs exhaustive gate   | OK     | `./scripts/gates/gate-exhaustive-local.sh --mode pre-commit`             |
| `pre-push` verifies signed report   | OK     | `./scripts/gates/verify-gate-report.sh --mode pre-push --run-if-missing` |
| HEAD-bound signed evidence required | OK     | report tied to commit SHA                                                |
| stale/missing report blocks push    | OK     | enforced in `pre-push`                                                   |
| dry-run reports rejected            | OK     | guardrail in verifier                                                    |

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

- frontends and API are deployed via local `scw:*` scripts (France region objective)
- Cloudflare remains transitional for part of landing/public edge flows where applicable
- no generic “auto-deploy from broad CI workflow” is treated as blocking authority

### Governance note

Local gate hardens contributor workflows, but **remote repository governance** still matters:

- branch protection strategy
- required reviews
- signed commits policy (if enabled)

This remains the main HIGH-priority governance item.

---

## 5. Supply Chain and Dependency Security

| Control                    | Status  | Notes                                         |
| -------------------------- | ------- | --------------------------------------------- |
| JS lockfile present        | OK      | `pnpm-lock.yaml`                              |
| Python lockfile present    | OK      | `app-api/uv.lock`                             |
| local SCA in blocking gate | OK      | `pip-audit`, `pnpm audit`, `osv-scanner`      |
| Dependabot active          | PARTIAL | npm/pip/github-actions covered                |
| Docker Dependabot coverage | OPEN    | recommended to ensure image update visibility |

Recommendations:

1. Keep tool versions/pinning policy explicit in gate docs and scripts.
2. Add/confirm Docker ecosystem updates in Dependabot configuration.
3. Maintain periodic review of transitive dependency exceptions.

---

## 6. Secrets and Sensitive Configuration

- `.gitignore` patterns include local secret formats (`.env*`, `.dev.vars`, key/cert patterns).
- Local placeholders (e.g. `changeme`, test keys) are acceptable only in test/dev contexts.
- No production-grade plaintext secret should be present in tracked files.

Recommended operational controls:

1. periodic `gitleaks` full-history scan in controlled maintenance windows
2. documented secret rotation cadence per environment
3. evidence capture in `docs/security/compliance-pack/11-evidence-index-template.md`

---

## 7. Open Items and Prioritized Remediation

| Priority | Item                         | Action                                                   |
| -------- | ---------------------------- | -------------------------------------------------------- |
| HIGH     | Remote governance baseline   | enforce branch protection + mandatory review policy      |
| MEDIUM   | Docker dependency governance | ensure Dependabot Docker ecosystem coverage              |
| MEDIUM   | Gate toolchain lifecycle     | formalize upgrade cadence and rollback policy            |
| MEDIUM   | Centralized monitoring       | complete log/alert centralization for deployment/runtime |
| LOW      | Periodic drift checks        | scheduled verification of gate config vs docs            |
| LOW      | Provenance metadata          | strengthen SBOM/provenance evidence capture              |
| LOW      | Operational runbook depth    | expand incident + rollback drills in runbooks            |

---

## Appendix: Canonical References

- `docs/runbooks/local-gate-exhaustive.md`
- `docs/runbooks/mvp-go-live-readiness.md`
- `scripts/gate.config.yaml`
- `scripts/gates/gate-exhaustive-local.sh`
- `scripts/gates/verify-gate-report.sh`
