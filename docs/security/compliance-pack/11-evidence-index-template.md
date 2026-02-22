# 11 - Evidence Index

Use this file as the master index for audit evidence.

| Evidence ID | Control ID    | Period    | Artifact description                                  | Source link | Owner            | Verified date |
| ----------- | ------------- | --------- | ----------------------------------------------------- | ----------- | ---------------- | ------------- |
| EV-001      | CTRL-SDLC-01  | [YYYY-MM] | Local exhaustive gate run (signed report + tool logs) | [LINK]      | CTO              | [DATE]        |
| EV-002      | CTRL-AC-02    | [YYYY-MM] | Monthly access review signed                          | [LINK]      | CTO/Ops          | [DATE]        |
| EV-003      | CTRL-VDR-01   | [YYYY-Q]  | Vendor review and DPA evidence                        | [LINK]      | CEO/Ops          | [DATE]        |
| EV-004      | CTRL-INC-01   | [YYYY-Q]  | Incident drill report                                 | [LINK]      | CTO              | [DATE]        |
| EV-005      | CTRL-BCP-01   | [YYYY-Q]  | Backup restore test report                            | [LINK]      | CTO              | [DATE]        |
| EV-006      | CTRL-RES-01   | [YYYY-MM] | France-only residency evidence for production systems | [LINK]      | CTO              | [DATE]        |
| EV-007      | CTRL-RES-02   | [YYYY-MM] | Backup/log residency evidence                         | [LINK]      | CTO              | [DATE]        |
| EV-008      | CTRL-RISK-01  | [YYYY-W]  | Residual risk board decision log                      | [LINK]      | CTO              | [DATE]        |
| EV-009      | CTRL-THRT-01  | [YYYY-MM] | Threat intel/CVE triage log                           | [LINK]      | Security Lead    | [DATE]        |
| EV-010      | CTRL-ABUSE-01 | [YYYY-Q]  | Abuse-case review for sensitive feature               | [LINK]      | Product/Security | [DATE]        |

## Evidence quality rules

- Every entry has a source link.
- Every entry has an owner.
- Evidence older than 90 days is reviewed.
- Residency controls require monthly evidence refresh.
- Evidence tied to accepted residual risk must include expiry and approval refs.
