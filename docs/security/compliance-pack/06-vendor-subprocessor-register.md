# 06 - Vendor and Subprocessor Register

## Register

| Vendor               | Service                   | Data category                                                     | Region                  | DPA status  | Security review date | Owner | Risk level | Decision and notes                                                                            |
| -------------------- | ------------------------- | ----------------------------------------------------------------- | ----------------------- | ----------- | -------------------- | ----- | ---------- | --------------------------------------------------------------------------------------------- |
| Cloudflare           | Frontend hosting/DNS/edge | Delivery metadata; no production customer payload in target model | Global/Config-dependent | To complete | 2026-03-15           | CTO   | High       | Keep only if architecture guarantees no production customer data/log transfer outside France. |
| Scaleway             | API hosting               | Application/runtime/DB related production data                    | France                  | To complete | 2026-03-15           | CTO   | Medium     | Preferred provider for production data plane in France.                                       |
| Supabase (if active) | Auth/identity             | User identity/session metadata                                    | Region to verify        | To complete | 2026-03-15           | CTO   | High       | Not approved for production until France residency and DPA are validated.                     |
| GitHub               | Source code and CI logs   | SDLC metadata only                                                | US/EU options           | To complete | 2026-03-15           | CTO   | Medium     | Allowed only for SDLC metadata; production customer data prohibited.                          |

## Due diligence checklist (per vendor)

- DPA signed and archived
- Data location documented at country level
- Security certifications reviewed
- Incident notification clause reviewed
- Exit plan documented
- Production data residency in France validated (contract + technical evidence)
- Backup/log location validated
