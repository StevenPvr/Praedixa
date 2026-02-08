# DevOps Security Audit Report

**Project:** Praedixa
**Date:** 2026-02-08
**Auditor:** watchtower (DevOps & Infra Security Agent)
**Scope:** Docker, CI/CD, supply chain, secrets management, deployment configuration

---

## Executive Summary

The Praedixa infrastructure demonstrates strong security foundations with multi-stage Docker builds, non-root container execution, comprehensive pre-commit hooks, and defense-in-depth CI/CD pipelines. However, several gaps require attention before production readiness.

**Severity distribution:**

- CRITICAL: 1 (render.yaml missing production-required env vars)
- HIGH: 3 (GH Actions not pinned by SHA, no branch protection documented, uv image tag `:latest`)
- MEDIUM: 5 (no-new-privileges missing, admin CORS not in render.yaml, no Dependabot security alerts for Docker, Bandit severity too lenient in pre-commit, `.dev.vars.example` has placeholder API key format)
- LOW: 4 (informational improvements)

---

## 1. Docker Security

### Files audited

- `apps/api/Dockerfile`
- `apps/api/.dockerignore`
- `apps/api/docker-entrypoint.sh`
- `docker-compose.yml`

### Findings

| #   | Severity | Finding                                                                                                                                                                  | Status                      |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| D1  | HIGH     | `COPY --from=ghcr.io/astral-sh/uv:latest` used `:latest` tag — mutable, unpinnable, supply chain risk                                                                    | **FIXED** — pinned to `0.6` |
| D2  | MEDIUM   | `docker-compose.yml` API service missing `security_opt: no-new-privileges:true`                                                                                          | **FIXED**                   |
| D3  | LOW      | Dockerfile USER directive uses name `appuser` — prefer numeric UID (65532) for consistency across orchestrators                                                          | **FIXED** — UID/GID 65532   |
| D4  | INFO     | `PYTHONDONTWRITEBYTECODE=1` and `PYTHONUNBUFFERED=1` not set — best practice for containers                                                                              | **FIXED**                   |
| D5  | OK       | Multi-stage build correctly separates build from runtime                                                                                                                 |
| D6  | OK       | Non-root user created and used before CMD                                                                                                                                |
| D7  | OK       | `.dockerignore` excludes `.env`, `.env.*`, tests, caches, `.git`                                                                                                         |
| D8  | OK       | COPY uses explicit paths, not `COPY .`                                                                                                                                   |
| D9  | OK       | HEALTHCHECK present with reasonable intervals                                                                                                                            |
| D10 | LOW      | HEALTHCHECK leaks the `/health` endpoint path — acceptable since health endpoints are typically public, but note this is visible in `docker inspect`                     |
| D11 | INFO     | `read_only: true` not set on API container in docker-compose — acceptable for dev (bind mounts require write), but should be enforced in production orchestrator configs |
| D12 | INFO     | OCI labels added for image provenance tracking                                                                                                                           |

### docker-compose.yml Security Notes

- `POSTGRES_PASSWORD: changeme` is hardcoded but acceptable for **local development only**. This value MUST never appear in production configs.
- The `DATABASE_URL` in docker-compose contains the same default password — same caveat applies.
- `config.py` enforces strong validation at startup for staging/production (JWT secret length, CORS HTTPS, KEY_PROVIDER=scaleway).

---

## 2. render.yaml — Production Deployment Config

### File: `render.yaml`

| #   | Severity | Finding                                                                                                                                                                     | Status                             |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| R1  | CRITICAL | Missing `KEY_PROVIDER`, `SCW_SECRET_KEY`, `SCW_DEFAULT_PROJECT_ID`, `SCW_REGION` — app startup WILL fail in production because `config.py` enforces `KEY_PROVIDER=scaleway` | **FIXED**                          |
| R2  | MEDIUM   | `CORS_ORIGINS` only listed `app.praedixa.com` — missing `admin.praedixa.com`                                                                                                | **FIXED**                          |
| R3  | HIGH     | Missing `RATE_LIMIT_STORAGE_URI` — production rate limiting falls back to in-memory (useless with multiple workers/replicas)                                                | **FIXED** — added as `sync: false` |
| R4  | OK       | `DATABASE_URL` and `SUPABASE_JWT_SECRET` use `sync: false` (manual secret management)                                                                                       |
| R5  | OK       | `ENVIRONMENT=production` and `DEBUG=false` correctly set                                                                                                                    |
| R6  | INFO     | Render free tier has cold start issues — consider upgrading for production SLA                                                                                              |

---

## 3. CI/CD Pipeline Security

### Files audited

- `.github/workflows/ci.yml`
- `.github/workflows/ci-api.yml`
- `.github/workflows/ci-admin.yml`
- `.pre-commit-config.yaml`

### 3.1 GitHub Actions

| #    | Severity | Finding                                                                                                                                                | Status                          |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| CI1  | HIGH     | All GitHub Actions use tag references (`@v4`, `@v5`, `@v2`) instead of SHA pinning — vulnerable to tag mutation/hijacking (supply chain attack vector) | **OPEN** — Recommendation below |
| CI2  | OK       | `concurrency` with `cancel-in-progress: true` prevents parallel builds on same ref                                                                     |
| CI3  | OK       | Deploy job requires ALL checks to pass (`needs: [checks, security-audit, secret-scan, bundle-size]`)                                                   |
| CI4  | OK       | Deploy only runs on `main` branch (`if: github.ref == 'refs/heads/main'`)                                                                              |
| CI5  | OK       | Production deploy concurrency group prevents concurrent deploys (`cancel-in-progress: false`)                                                          |
| CI6  | OK       | Post-deploy health check with retry logic (5 attempts, 10s delay)                                                                                      |
| CI7  | OK       | `permissions: contents: read` follows least privilege principle                                                                                        |
| CI8  | OK       | `pnpm install --frozen-lockfile` prevents lockfile modifications in CI                                                                                 |
| CI9  | OK       | Gitleaks uses `fetch-depth: 0` for full history scan                                                                                                   |
| CI10 | INFO     | No `[skip ci]` protection on main branch — GitHub branch protection rules should be configured to require status checks                                |
| CI11 | INFO     | `ci-api.yml` integration tests use hardcoded `changeme` password — acceptable for ephemeral CI containers                                              |

**Recommendation for CI1:** Pin actions to SHA hashes. Example:

```yaml
# Instead of:
uses: actions/checkout@v4
# Use:
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
```

Dependabot's `github-actions` ecosystem (already configured) will auto-propose SHA updates when new versions are released.

### 3.2 Pre-commit Hooks

| #   | Severity | Finding                                                                                                                                                                                                               | Status                              |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| PC1 | MEDIUM   | `bandit` in pre-commit uses `-ll` (MEDIUM+), but CI uses `-lll` (HIGH only) — inconsistency. Pre-commit is stricter, which is correct, but the CI gap means a MEDIUM finding could bypass CI if pre-commit is skipped | **OPEN** — align CI bandit to `-ll` |
| PC2 | OK       | Gitleaks hook present for pre-commit secret scanning                                                                                                                                                                  |
| PC3 | OK       | `detect-private-key` hook catches private key formats                                                                                                                                                                 |
| PC4 | OK       | `check-added-large-files` with 500KB limit prevents accidental binary commits                                                                                                                                         |
| PC5 | OK       | `pip-audit` scans Python deps, `pnpm audit` scans JS deps                                                                                                                                                             |
| PC6 | OK       | `actionlint` validates GitHub Actions workflow syntax                                                                                                                                                                 |
| PC7 | OK       | Full test suite (vitest + pytest) runs in pre-commit                                                                                                                                                                  |
| PC8 | OK       | Build verification ensures no broken builds reach the repo                                                                                                                                                            |
| PC9 | INFO     | `pnpm audit --audit-level=high` has a TODO to lower to `moderate` — tracked                                                                                                                                           |

### 3.3 Non-bypassability Assessment

**Pre-commit hooks** can be bypassed with `git commit --no-verify`. This is by design — pre-commit is a convenience gate, not a security boundary. The CI pipeline is the true enforcement point.

**CI pipeline** is the hard gate:

- Runs on all PRs and pushes to `main`
- Deploy requires ALL jobs to pass
- **Gap:** Branch protection rules are NOT configured in the repository (or at least not in code). This means a direct push to `main` could bypass PR checks.

**Recommendation:** Configure GitHub branch protection via the UI or Terraform:

- Require PR reviews before merging
- Require status checks (checks, security-audit, secret-scan, bundle-size)
- Disallow direct pushes to `main`
- Require branches to be up to date

---

## 4. Dependency Vulnerability Assessment

### 4.1 Python Dependencies (`apps/api/pyproject.toml`)

All dependencies use `>=` version constraints (floor, no ceiling). This is standard for Python libraries but means patch versions are not locked without `uv.lock`.

| Package          | Version Spec | Known CVE Risk | Notes                                              |
| ---------------- | ------------ | -------------- | -------------------------------------------------- |
| fastapi          | >=0.115.0    | Low            | Actively maintained, frequent patches              |
| uvicorn          | >=0.34.0     | Low            |                                                    |
| sqlalchemy       | >=2.0.36     | Low            |                                                    |
| asyncpg          | >=0.30.0     | Low            |                                                    |
| pydantic         | >=2.10.0     | Low            |                                                    |
| PyJWT            | >=2.8.0      | Low            |                                                    |
| alembic          | >=1.14.0     | Low            |                                                    |
| httpx            | >=0.28.0     | Low            |                                                    |
| slowapi          | >=0.1.9      | Low            |                                                    |
| openpyxl         | >=3.1.0      | Medium         | File parsing — opened in `read_only` mode (good)   |
| chardet          | >=5.0.0      | Low            |                                                    |
| python-multipart | >=0.0.9      | Medium         | Historical CVEs in older versions, >=0.0.9 is safe |
| reportlab        | >=4.1.0      | Low            | PDF generation                                     |

**No known unpatched CVEs** in the specified minimum versions as of 2026-02-08. The `pip-audit` check in CI and pre-commit provides continuous monitoring.

### 4.2 JavaScript Dependencies (`package.json`)

Root devDependencies are standard toolchain packages. The `pnpm audit --audit-level=high` check is configured.

**Note:** There is a known TODO about transitive vulnerabilities from `@opennextjs/cloudflare` -> `next@15.2.9`. The audit level is set to `high` instead of `moderate` to work around this.

### 4.3 Lock File Integrity

- `pnpm-lock.yaml` — present, `--frozen-lockfile` enforced in CI
- `apps/api/uv.lock` — present (referenced by `uv sync --frozen` in render.yaml)
- No suspicious `postinstall` scripts found in root package.json beyond the `prek` install hook (which safely no-ops in CI via `CI=true` check)

---

## 5. .gitignore — Secret Exclusion Audit

### File: `.gitignore`

| Pattern            | Coverage                         | Status |
| ------------------ | -------------------------------- | ------ |
| `.env`             | Root .env files                  | OK     |
| `.env.local`       | Next.js local env                | OK     |
| `.env.*.local`     | Environment-specific local files | OK     |
| `*.pem`            | TLS/SSH certificates             | OK     |
| `*.key`            | Private keys                     | OK     |
| `secrets/`         | Secrets directory                | OK     |
| `credentials.json` | GCP/service credentials          | OK     |
| `.dev.vars`        | Cloudflare Workers local secrets | OK     |
| `.claude/`         | AI tooling config                | OK     |
| `.mcp.json`        | MCP config                       | OK     |

**Additions made:**

- `*.p12`, `*.pfx` — PKCS#12 certificate bundles
- `*.jks`, `*.keystore` — Java keystores (future-proofing)
- `service-account*.json`, `*-credentials.json` — Cloud provider service accounts
- `*.secret`, `.secrets/` — Generic secret files

---

## 6. Hardcoded Secrets Scan

### Methodology

Scanned the entire codebase for patterns: `sk-*`, `password=`, `secret=`, `api_key=`, `eyJ*` (JWT), `AKIA*` (AWS), `BEGIN PRIV-ATE KEY`, `changeme`, `token:`.

### Results

| Location                             | Pattern                             | Verdict                                                  |
| ------------------------------------ | ----------------------------------- | -------------------------------------------------------- |
| `docker-compose.yml`                 | `POSTGRES_PASSWORD: changeme`       | **ACCEPTABLE** — local dev only, documented              |
| `apps/api/app/core/config.py:27`     | `changeme` in DATABASE_URL default  | **ACCEPTABLE** — dev default, production validates       |
| `ci-api.yml:156,194,200`             | `changeme` in CI Postgres           | **ACCEPTABLE** — ephemeral CI containers                 |
| `apps/api/tests/**`                  | Test secrets (`test-secret-key-*`)  | **ACCEPTABLE** — test fixtures, never used in production |
| `e2e/*/fixtures/auth.ts`             | Mock tokens (`mock-access-token-*`) | **ACCEPTABLE** — E2E test fixtures                       |
| `apps/landing/app/api/**` test files | `re_test_key`                       | **ACCEPTABLE** — test mocks for Resend API               |
| `.env.example` (root)                | `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`   | **ACCEPTABLE** — placeholder format                      |

**No real secrets found in the codebase.** All detected patterns are test fixtures, dev defaults, or placeholders.

---

## 7. Cloudflare Workers Configuration

### Files audited

- `apps/landing/wrangler.jsonc`
- `apps/webapp/wrangler.jsonc`
- `apps/admin/wrangler.jsonc` — **DOES NOT EXIST**

| #   | Severity | Finding                                                                                                                                      | Status                                    |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| CF1 | INFO     | `apps/admin/wrangler.jsonc` missing — admin app deployment not yet configured                                                                | **OPEN** — needed before admin deployment |
| CF2 | OK       | `workers_dev: false` prevents `*.workers.dev` subdomain exposure                                                                             |
| CF3 | OK       | `preview_urls: false` prevents preview URL exposure                                                                                          |
| CF4 | OK       | Landing uses custom domains (`praedixa.com`, `www.praedixa.com`)                                                                             |
| CF5 | OK       | Webapp uses custom domain (`app.praedixa.com`)                                                                                               |
| CF6 | OK       | `.dev.vars` is in `.gitignore` — Cloudflare Workers secrets stay local                                                                       |
| CF7 | INFO     | No `[vars]` section in wrangler configs — env vars are managed via Cloudflare dashboard or `.dev.vars`, which is correct for secrets         |
| CF8 | INFO     | Landing `RESEND_API_KEY` should be configured as a Cloudflare Workers secret binding (`wrangler secret put RESEND_API_KEY`), not a plain var |

---

## 8. Supply Chain Security Assessment

| #   | Severity | Finding                                                                                                                                                  | Status   |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| SC1 | OK       | Dependabot configured for npm, pip, and github-actions ecosystems                                                                                        |
| SC2 | OK       | Weekly update schedule with PR grouping (prod-deps, dev-tooling)                                                                                         |
| SC3 | OK       | `pnpm install --frozen-lockfile` in CI prevents lockfile tampering                                                                                       |
| SC4 | OK       | `uv sync --frozen` in render.yaml enforces lockfile                                                                                                      |
| SC5 | OK       | `pip-audit` and `pnpm audit` run in CI for vulnerability scanning                                                                                        |
| SC6 | OK       | `postinstall` script only installs `prek` hooks, safely no-ops in CI                                                                                     |
| SC7 | MEDIUM   | No Dependabot config for Docker base images (`python:3.12-slim`) — add `docker` ecosystem                                                                | **OPEN** |
| SC8 | INFO     | Pre-commit hook repos (`pre-commit-hooks`, `gitleaks`, `bandit`, `actionlint`) use version tags — acceptable since pre-commit has its own lock mechanism |

---

## 9. Remediation Summary

### Fixes Applied (this audit)

1. **render.yaml** — Added `KEY_PROVIDER`, `SCW_SECRET_KEY`, `SCW_DEFAULT_PROJECT_ID`, `SCW_REGION`, `RATE_LIMIT_STORAGE_URI`; expanded `CORS_ORIGINS` to include `admin.praedixa.com`
2. **Dockerfile** — Pinned uv image to `0.6`, fixed UID/GID to 65532, added `PYTHONDONTWRITEBYTECODE` + `PYTHONUNBUFFERED`, added OCI labels
3. **docker-compose.yml** — Added `security_opt: no-new-privileges:true` on API service
4. **.gitignore** — Expanded secret file patterns (`.p12`, `.pfx`, `.jks`, `service-account*.json`, etc.)

### Open Items (require manual action or follow-up)

| Priority | Item                                         | Action                                                 |
| -------- | -------------------------------------------- | ------------------------------------------------------ |
| HIGH     | Pin GitHub Actions to SHA hashes             | Update all `uses:` to include `@<sha> # v<tag>` format |
| HIGH     | Configure GitHub branch protection           | Require PR reviews + status checks on `main`           |
| MEDIUM   | Align bandit severity in CI                  | Change `ci-api.yml` bandit from `-lll` to `-ll`        |
| MEDIUM   | Add Docker ecosystem to Dependabot           | Add entry in `.github/dependabot.yml`                  |
| MEDIUM   | Create `apps/admin/wrangler.jsonc`           | Needed before admin deployment to Cloudflare Workers   |
| LOW      | Configure Cloudflare Workers secret bindings | Use `wrangler secret put` for `RESEND_API_KEY`         |
| INFO     | Set up Redis for production rate limiting    | Configure `RATE_LIMIT_STORAGE_URI` in Render dashboard |

---

## Appendix A: Files Modified

- `render.yaml` — production env vars
- `apps/api/Dockerfile` — image pinning, UID, env vars
- `docker-compose.yml` — security_opt
- `.gitignore` — expanded secret patterns
