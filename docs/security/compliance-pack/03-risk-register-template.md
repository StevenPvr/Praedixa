# 03 - Risk Register

Use scoring:

- Likelihood: 1 (rare) to 5 (almost certain)
- Impact: 1 (minimal) to 5 (catastrophic)
- Risk score = Likelihood x Impact
- Severity bands:
  - Critical: 15-25
  - High: 10-14
  - Medium: 5-9
  - Low: 1-4

## Register

| ID    | Asset/Process         | Threat scenario                                      | Control gap                            | Existing controls                | Likelihood | Impact | Score | Band     | Decision (Mitigate/Accept/Transfer/Avoid) | Compensating controls                            | Owner       | Reviewer         | Due date   | Status | Residual expiry | Approval refs | Evidence link |
| ----- | --------------------- | ---------------------------------------------------- | -------------------------------------- | -------------------------------- | ---------: | -----: | ----: | -------- | ----------------------------------------- | ------------------------------------------------ | ----------- | ---------------- | ---------- | ------ | --------------- | ------------- | ------------- |
| R-001 | SDLC secrets          | Secret leak in repo/history                          | Secret exposure via history or CI logs | Gitleaks + local exhaustive gate |          2 |      5 |    10 | High     | Mitigate                                  | Key rotation + log scrubbing + secret scanning   | CTO         | Security Lead    | 2026-03-31 | Open   | N/A             | [LINK]        | [LINK]        |
| R-002 | Tenant isolation      | Cross-tenant data exposure                           | Incomplete authorization on edge cases | RLS + auth checks                |          2 |      5 |    10 | High     | Mitigate                                  | Abuse-case tests + quarterly pentest             | CTO         | Security Lead    | 2026-04-30 | Open   | N/A             | [LINK]        | [LINK]        |
| R-003 | Availability          | API outage > SLA                                     | Single-point operational bottlenecks   | Health checks + runbook          |          3 |      4 |    12 | High     | Mitigate                                  | Alerting hardening + failover drill              | CTO         | Ops Lead         | 2026-04-30 | Open   | N/A             | [LINK]        | [LINK]        |
| R-004 | Compliance evidence   | Missing audit trail                                  | Evidence refresh and verification gaps | Evidence index process           |          3 |      3 |     9 | Medium   | Mitigate                                  | Monthly evidence board + owner/reviewer tracking | Ops/Product | Compliance Owner | 2026-03-15 | Open   | N/A             | [LINK]        | [LINK]        |
| R-005 | Data residency        | Production logs or backups replicated outside France | Vendor and config drift                | Manual vendor checks             |          3 |      5 |    15 | Critical | Mitigate                                  | Residency gate + monthly residency evidence      | CTO         | Compliance Owner | 2026-03-31 | Open   | N/A             | [LINK]        | [LINK]        |
| R-006 | Vendor onboarding     | New tool enabled without FR residency proof          | Procurement flow bypass                | Vendor register review           |          3 |      4 |    12 | High     | Mitigate                                  | Go-live hold point + sign-off checklist          | CEO/Ops     | Compliance Owner | 2026-03-15 | Open   | N/A             | [LINK]        | [LINK]        |
| R-007 | Collaboration tooling | Production exports shared through non-FR SaaS        | Ad-hoc data sharing channels           | Access policy + ad-hoc controls  |          2 |      4 |     8 | Medium   | Mitigate                                  | Channel restrictions + periodic access review    | CEO         | Security Lead    | 2026-04-15 | Open   | N/A             | [LINK]        | [LINK]        |

## Residual risk acceptance rules

- Residual risk acceptance is time-boxed (maximum 90 days).
- Acceptance requires named owner, named reviewer, and explicit compensating controls.
- Acceptance for Critical risks requires CTO + Security Lead approval reference.
- Expired accepted risks must be re-assessed before next release window.

## Monthly review checklist

- Update status of all risks with score >= 10.
- Add new risks from incidents, pentests, and scanner findings.
- Verify decision rationale (`mitigate/accept/transfer/avoid`) remains valid.
- Ensure all accepted risks have non-expired `Residual expiry`.
- Close only when mitigation evidence is linked and reviewer confirms closure.
