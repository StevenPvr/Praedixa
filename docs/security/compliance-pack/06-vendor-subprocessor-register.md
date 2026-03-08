# 06 - Vendor and Subprocessor Register

## Register

| Vendor               | Service                   | Data category                                                     | Region                  | DPA status  | Risk score (0-100) | Risk level | Review frequency | Last review | Next review | Owner | Decision and notes                                                                            |
| -------------------- | ------------------------- | ----------------------------------------------------------------- | ----------------------- | ----------- | -----------------: | ---------- | ---------------- | ----------- | ----------- | ----- | --------------------------------------------------------------------------------------------- |
| Cloudflare           | Frontend hosting/DNS/edge | Delivery metadata; no production customer payload in target model | Global/Config-dependent | To complete |                 75 | High       | Quarterly        | [DATE]      | 2026-03-15  | CTO   | Keep only if architecture guarantees no production customer data/log transfer outside France. |
| Scaleway             | API hosting               | Application/runtime/DB related production data                    | France                  | To complete |                 88 | Medium     | Quarterly        | [DATE]      | 2026-03-15  | CTO   | Preferred provider for production data plane in France.                                       |
| GitHub               | Source code and CI logs   | SDLC metadata only                                                | US/EU options           | To complete |                 70 | Medium     | Annually         | [DATE]      | 2026-03-15  | CTO   | Allowed only for SDLC metadata; production customer data prohibited.                          |

## Due diligence checklist (per vendor)

- DPA signed and archived
- Data location documented at country level
- Security certifications reviewed
- Incident notification clause reviewed
- Exit plan documented
- Production data residency in France validated (contract + technical evidence)
- Backup/log location validated
- Evidence link recorded for latest review
