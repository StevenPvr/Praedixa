# Data Retention Policy

## Purpose

Define retention periods and deletion rules for Praedixa data.

## Retention table

| Data type                 | Owner       | Retention                                    | Deletion method                                        | Notes                       |
| ------------------------- | ----------- | -------------------------------------------- | ------------------------------------------------------ | --------------------------- |
| Customer operational data | Product/CTO | Contract duration + 90 days                  | Tenant-scoped purge job + deletion evidence            | France-only storage         |
| Audit logs                | CTO         | 24 months                                    | Immutable log retention expiration + archival deletion | Integrity required          |
| Security logs             | CTO         | 12 months                                    | SIEM/log sink retention policy                         | Incident evidence           |
| Backups                   | CTO         | 35 days rolling + monthly snapshot 12 months | Backup policy auto-expiry + deletion verification      | France-only backup location |
| Support data              | Ops         | Ticket closure + 24 months                   | Ticket export purge + deletion log                     | Contract aligned            |

## Rules

- Keep only required data.
- Document legal/contractual basis.
- Apply secure deletion at end of retention.
- All retained production data must remain in France.
