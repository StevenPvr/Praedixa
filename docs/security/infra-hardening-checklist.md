# Infrastructure Hardening Checklist

**Project:** Praedixa
**Date:** 2026-02-19
**Status:** Assessment updated for local exhaustive gate model

---

## Legend

- [x] Implemented and verified
- [~] Partially implemented
- [ ] Not implemented — action required

---

## 1. Container Security

- [x] Multi-stage Docker build (build deps separated from runtime)
- [x] Non-root user with fixed UID/GID (65532)
- [x] `.dockerignore` excludes `.env`, tests, caches, `.git`
- [x] Explicit `COPY` paths (no `COPY .`)
- [x] `PYTHONDONTWRITEBYTECODE=1` and `PYTHONUNBUFFERED=1`
- [x] `security_opt: no-new-privileges:true` in docker-compose
- [x] HEALTHCHECK directive with reasonable intervals
- [x] OCI labels for image provenance
- [~] Base image pinned to minor version (`python:3.12-slim`) — consider digest pinning for hermetic builds
- [ ] `read_only: true` filesystem in production orchestrator (Kubernetes/ECS)
- [~] Container vulnerability scanning in local exhaustive gate (Trivy active, image-level hardening to extend)
- [ ] Runtime security monitoring (Falco/Sysdig)

---

## 2. Verification Gate & Release Pipeline

- [x] All quality/security checks are hard gates locally (fail = no push)
- [x] Signed gate evidence is required before push
- [x] `pre-push` verifies report freshness, signature, and commit binding
- [x] Full monorepo verification is executed from a single orchestrator script
- [x] `--frozen-lockfile` / locked environments are used in verification commands
- [x] Secret scanning is enforced in local gate (gitleaks + trivy secret scanner)
- [x] SAST/SCA/IaC checks integrated in local gate (semgrep, bandit, checkov, audits)
- [ ] Branch protection rules enforced (if hosted Git provider policy requires PR checks)
- [ ] Signed commits required
- [ ] SLSA provenance generation for build artifacts
- [ ] SBOM (Software Bill of Materials) generation

---

## 3. Secret Management

- [x] `.env` files in `.gitignore`
- [x] `.dev.vars` (Cloudflare) in `.gitignore`
- [x] Private keys (`.pem`, `.key`, `.p12`, `.pfx`) in `.gitignore`
- [x] Service account files in `.gitignore`
- [x] `config.py` validates JWT secret length at startup (min 32 chars)
- [x] `config.py` forces `KEY_PROVIDER=scaleway` in production
- [x] Gitleaks scans are enforced in local gate runs
- [x] `detect-private-key` pre-commit hook
- [x] No hardcoded production secrets found in codebase
- [~] Render env vars use `sync: false` for secrets — values set manually in dashboard
- [ ] Secret rotation strategy documented
- [ ] Cloudflare Workers secrets via `wrangler secret put` (not plain vars)

---

## 4. Network Security

- [x] CORS explicit allowlist (no wildcards)
- [x] CORS enforces HTTPS-only origins in production
- [x] CORS rejects localhost origins in production
- [x] Cloudflare Workers `workers_dev: false` (no public `*.workers.dev` subdomain)
- [x] Cloudflare Workers `preview_urls: false` (no public preview URLs)
- [x] Rate limiting implemented (slowapi for API, in-memory for landing)
- [ ] Redis-backed distributed rate limiting for production (RATE_LIMIT_STORAGE_URI needs configuring)
- [ ] WAF rules configured in Cloudflare dashboard
- [ ] DDoS protection rules (Cloudflare has auto-protection but custom rules recommended)
- [ ] DNSSEC enabled for praedixa.com
- [ ] TLS 1.3 minimum enforced

---

## 5. Database Security

- [x] PostgreSQL connection uses `asyncpg` with parameterized queries (no SQL injection)
- [x] Multi-tenant isolation via `TenantFilter.apply()` on all queries
- [x] Database credentials as environment variables (not hardcoded in production)
- [x] Alembic migrations run as pre-deploy step
- [~] Local dev uses `changeme` password — acceptable for local Docker only
- [ ] Database connection uses SSL in production (`?sslmode=require`)
- [ ] Database user has minimal privileges (no SUPERUSER)
- [ ] Automated database backups configured and tested
- [ ] Point-in-time recovery (PITR) enabled
- [ ] Database audit logging enabled
- [ ] Connection pooling (PgBouncer) for production scale

---

## 6. Monitoring & Observability

- [~] Health endpoint (`/health`) exists for basic liveness checks
- [~] Sentry DSN placeholder exists in `.dev.vars.example` — not yet active
- [ ] Structured JSON logging (structlog is a dependency but output format not verified)
- [ ] Centralized log aggregation (Grafana Loki / Datadog / Scaleway Logs)
- [ ] Application Performance Monitoring (APM)
- [ ] Real User Monitoring (RUM) for frontends
- [ ] Synthetic monitoring (uptime checks from multiple locations)
- [ ] Error rate alerting (P1: >5% error rate)
- [ ] Response time alerting (P2: p95 > 3s)
- [ ] Core Web Vitals tracking (LCP, INP, CLS)
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Cost monitoring and anomaly detection

---

## 7. Alerting Strategy

- [ ] P1 (Critical) alerts: PagerDuty/Opsgenie + Slack + SMS
- [ ] P2 (Warning) alerts: Slack notification within 5 minutes
- [ ] P3 (Info) alerts: Slack channel + dashboard
- [ ] Alert deduplication and grouping configured
- [ ] Every alert links to a runbook
- [ ] On-call rotation defined
- [ ] Incident response playbook documented

---

## 8. Dependency Management

- [x] Dependabot configured for npm, pip, github-actions
- [x] Weekly update schedule with PR grouping
- [x] `pip-audit` in local exhaustive gate
- [x] `pnpm audit` in local exhaustive gate
- [x] Lock files present and enforced (`pnpm-lock.yaml`, `uv.lock`)
- [~] Pre-commit hooks cover security tools (gitleaks, bandit, pip-audit, pnpm audit)
- [ ] Dependabot for Docker base images
- [ ] License compliance scanning
- [ ] SBOM generation for supply chain transparency

---

## 9. Application Security Config

- [x] JWT validation with algorithm enforcement (RS256/ES256/EdDSA, HS256 dev-only)
- [x] Role-based access control (`require_role` dependency)
- [x] Input validation via Pydantic with `extra="forbid"`
- [x] GDPR medical data masking
- [x] Append-only audit log for admin operations
- [x] File upload with size limits and read-only parsing (openpyxl `read_only=True`)
- [x] Email template XSS prevention (HTML entity encoding)
- [x] Honeypot field for bot prevention
- [x] Request body size limits
- [x] IP-based rate limiting with bounded map size
- [ ] Content Security Policy (CSP) headers — tracked as separate task #4
- [ ] HSTS headers with preload
- [ ] X-Content-Type-Options, X-Frame-Options headers

---

## 10. Backup & Disaster Recovery

- [ ] Database backup strategy documented (frequency, retention, encryption)
- [ ] Backup restoration tested and documented
- [ ] RTO (Recovery Time Objective) defined
- [ ] RPO (Recovery Point Objective) defined
- [ ] Multi-region failover plan
- [ ] Infrastructure as Code (Terraform/Pulumi) for reproducible environments
- [ ] Runbook for common failure scenarios

---

## 11. Compliance & Governance

- [x] GDPR-aware data handling (medical masking, erasure machine)
- [x] Admin audit log for accountability
- [ ] Data Processing Agreement (DPA) template
- [ ] Privacy Impact Assessment (PIA) completed
- [ ] Data retention policy documented and enforced
- [ ] Right to erasure implementation fully tested (tracked as task #3)
- [ ] SOC 2 readiness assessment

---

## Priority Roadmap

### Immediate (before production launch)

1. Stabilize all local gate checks to green (no failing quality/security checks)
2. Set up Redis for distributed rate limiting
3. Configure Cloudflare Workers secret bindings
4. Verify database SSL in production connection string
5. Set up basic alerting (uptime + error rate)

### Short-term (first 2 weeks post-launch)

1. Enable Sentry for error tracking
2. Set up structured logging with centralized aggregation
3. Add Docker base image to Dependabot
4. Configure WAF rules in Cloudflare
5. Document backup and restore procedures

### Medium-term (first month)

1. Implement APM and distributed tracing
2. Set up synthetic monitoring
3. Define and test disaster recovery procedures
4. SBOM generation in local gate/pipeline
5. Infrastructure as Code for all cloud resources

### Long-term (ongoing)

1. SOC 2 readiness
2. Regular penetration testing schedule
3. Secret rotation automation
4. Cost optimization and monitoring
