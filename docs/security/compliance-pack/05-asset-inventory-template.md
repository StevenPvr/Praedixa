# 05 - Asset Inventory

## Asset register

| Asset ID | Asset                 | Type        | Environment  | Data classification      | Hosting location          | Residency status  | Owner | Backup required | Criticality | Notes                                    |
| -------- | --------------------- | ----------- | ------------ | ------------------------ | ------------------------- | ----------------- | ----- | --------------- | ----------- | ---------------------------------------- |
| A-001    | app-api               | Application | Prod/Staging | Confidential             | France (target mandatory) | Target            | CTO   | Yes             | High        | Core processing                          |
| A-002    | app-webapp            | Application | Prod/Staging | Internal/Confidential    | France (target mandatory) | Target            | CTO   | No              | Medium      | Customer UI                              |
| A-003    | PostgreSQL            | Database    | Prod         | Confidential             | France                    | Required          | CTO   | Yes             | Critical    | Tenant data                              |
| A-004    | GitHub repo + Actions | Platform    | SaaS         | Internal SDLC metadata   | Non-FR possible           | Exception-managed | CTO   | N/A             | High        | No production customer data allowed      |
| A-005    | Cloudflare account    | Platform    | SaaS         | Delivery metadata        | Global unless constrained | Transitional risk | CTO   | N/A             | High        | Customer data path must stay France-only |
| A-006    | Scaleway project      | Platform    | SaaS         | Runtime/application data | France                    | Required          | CTO   | N/A             | High        | Preferred production host                |

## Classification levels

- Public: can be shared publicly
- Internal: internal operational data
- Confidential: customer or sensitive business data
- Restricted: highly sensitive, strict access needed

## Residency status definitions

- Required: must be in France now
- Target: planned for France-only production cutover
- Exception-managed: temporary exception approved and time-bounded
- Transitional risk: known gap with active remediation plan
