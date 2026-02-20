# 11 - Evidence Index

Use this file as the master index for audit evidence.

| Evidence ID | Control ID   | Period    | Artifact description                                  | Source link | Owner   | Verified date |
| ----------- | ------------ | --------- | ----------------------------------------------------- | ----------- | ------- | ------------- |
| EV-001      | CTRL-SDLC-01 | [YYYY-MM] | Local exhaustive gate run (signed report + tool logs) | [LINK]      | CTO     | [DATE]        |
| EV-002      | CTRL-AC-02   | [YYYY-MM] | Monthly access review signed                          | [LINK]      | CTO/Ops | [DATE]        |
| EV-003      | CTRL-VDR-01  | [YYYY-Q]  | Vendor review and DPA evidence                        | [LINK]      | CEO/Ops | [DATE]        |
| EV-004      | CTRL-INC-01  | [YYYY-Q]  | Incident drill report                                 | [LINK]      | CTO     | [DATE]        |
| EV-005      | CTRL-BCP-01  | [YYYY-Q]  | Backup restore test report                            | [LINK]      | CTO     | [DATE]        |
| EV-006      | CTRL-RES-01  | [YYYY-MM] | France-only residency evidence for production systems | [LINK]      | CTO     | [DATE]        |
| EV-007      | CTRL-RES-02  | [YYYY-MM] | Backup/log residency evidence                         | [LINK]      | CTO     | [DATE]        |

## Evidence quality rules

- Every entry has a source link.
- Every entry has an owner.
- Evidence older than 90 days is reviewed.
- Residency controls require monthly evidence refresh.
