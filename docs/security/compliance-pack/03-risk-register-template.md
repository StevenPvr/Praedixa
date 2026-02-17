# 03 - Risk Register

Use scoring:

- Likelihood: 1 (rare) to 5 (frequent)
- Impact: 1 (low) to 5 (critical)
- Risk score = Likelihood x Impact

## Register

| ID    | Asset/Process         | Threat scenario                                      | Existing control                | Likelihood | Impact | Score | Owner       | Treatment plan                                       | Due date   | Status | Evidence link |
| ----- | --------------------- | ---------------------------------------------------- | ------------------------------- | ---------: | -----: | ----: | ----------- | ---------------------------------------------------- | ---------- | ------ | ------------- |
| R-001 | CI/CD secrets         | Secret leak in repo/history                          | Gitleaks + pre-commit + CI      |          2 |      5 |    10 | CTO         | Rotate keys + enforce scanners                       | 2026-03-31 | Open   | [LINK]        |
| R-002 | Tenant isolation      | Cross-tenant data exposure                           | RLS + auth checks               |          2 |      5 |    10 | CTO         | Quarterly penetration tests                          | 2026-04-30 | Open   | [LINK]        |
| R-003 | Availability          | API outage > SLA                                     | Health checks + runbook         |          3 |      4 |    12 | CTO         | Add alerting and failover tests                      | 2026-04-30 | Open   | [LINK]        |
| R-004 | Compliance evidence   | Missing audit trail                                  | Evidence index process          |          3 |      3 |     9 | Ops/Product | Monthly evidence review                              | 2026-03-15 | Open   | [LINK]        |
| R-005 | Data residency        | Production logs or backups replicated outside France | Manual vendor checks            |          3 |      5 |    15 | CTO         | Enforce FR-only vendors + monthly residency evidence | 2026-03-31 | Open   | [LINK]        |
| R-006 | Vendor onboarding     | New tool enabled without FR residency proof          | Vendor register review          |          3 |      4 |    12 | CEO/Ops     | Add vendor go-live gate with residency approval      | 2026-03-15 | Open   | [LINK]        |
| R-007 | Collaboration tooling | Production exports shared through non-FR SaaS        | Access policy + ad-hoc controls |          2 |      4 |     8 | CEO         | Restrict support/export channels and review monthly  | 2026-04-15 | Open   | [LINK]        |

## Monthly review checklist

- Update status of all risks >= 10.
- Add new risks from incidents/findings.
- Close only if evidence exists.
- Verify residency risk entries with fresh evidence links.
