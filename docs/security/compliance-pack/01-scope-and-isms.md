# 01 - Scope and ISMS

## Scope declaration

- Legal entity: Praedixa SAS (a confirmer a l'immatriculation)
- Product in scope: Praedixa platform
- In-scope systems:
  - `app-api`
  - `app-webapp`
  - `app-admin`
  - production data plane (compute, DB, backups, logs)
  - source control and CI/CD
- Out-of-scope (phase 1):
  - pure marketing analytics without customer production data
  - historical archive docs not containing production customer data

## Data in scope

- Operational business data (capacity, workload, absences)
- Tenant metadata and user accounts
- Audit logs and admin actions
- Security logs and evidence logs
- Customer support and incident records

## Data residency principle (mandatory)

Production objective:

1. All production data remains in France.
2. All production processing remains in France.
3. All backups and restore copies remain in France.
4. All security and audit logs tied to production remain in France.
5. No transfer outside France without formal exception approved by CEO + CTO and customer contractual acceptance.

## Compliance target (first 12 months)

- Primary target: ISO 27001 readiness and certification kickoff
- Secondary target: SOC 2 Type I (commercial requirement driven)
- Target date:
  - ISO readiness package: 2026-06-30
  - ISO certification audit window: 2026-Q4
  - SOC 2 Type I readiness: 2027-Q1

## Security objectives

1. Prevent unauthorized access to tenant data.
2. Keep customer data availability and integrity at agreed SLA.
3. Detect and remediate vulnerabilities quickly.
4. Maintain auditable evidence of security operations.
5. Enforce France-only data residency for production data.

## ISMS governance minimum

- Risk review cadence: monthly
- Access review cadence: monthly
- Policy review cadence: quarterly
- Incident tabletop cadence: quarterly
- Backup restore test cadence: quarterly
- Data residency review cadence: monthly
