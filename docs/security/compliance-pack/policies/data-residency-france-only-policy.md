# Data Residency Policy - France Only (Production)

## Purpose

Enforce the company objective that production data remains in France.

## Scope

- Production customer data
- Derived data and exports
- Audit and security logs tied to production
- Backups and disaster recovery copies

## Mandatory rules

1. Production storage location: France only.
2. Production processing location: France only.
3. Backup location: France only.
4. Log sink location: France only.
5. Cross-border transfer: prohibited by default.

## Exception process

Any exception requires all of the following:

- written business justification
- legal review
- customer contractual acceptance when relevant
- CEO + CTO approval
- expiry date and remediation plan

## Verification

- Monthly residency evidence review.
- Quarterly architecture review for hidden transfer paths.
- Any residency breach is treated as a security incident.
