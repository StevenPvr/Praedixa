# 02 - Roles and RACI (2-3 founders)

## Core roles

- Founder 1 (CEO): compliance owner and commercial trust owner
- Founder 2 (CTO): security owner and technical control owner
- Founder 3 (Ops/Product): evidence owner and process owner

If only 2 founders, Founder 2 also owns evidence operations.

## RACI matrix

| Activity                                 | CEO | CTO | Ops/Product |
| ---------------------------------------- | --- | --- | ----------- |
| Define compliance roadmap                | A   | C   | R           |
| Security architecture decisions          | C   | A/R | C           |
| Risk register maintenance                | A   | R   | R           |
| Access review sign-off                   | A   | R   | R           |
| Vulnerability remediation prioritization | C   | A/R | C           |
| Incident response coordination           | A   | R   | R           |
| Backup/restore test execution            | I   | A/R | R           |
| Vendor due diligence                     | A/R | C   | R           |
| Audit evidence collection                | I   | C   | A/R         |

Legend: R = Responsible, A = Accountable, C = Consulted, I = Informed

## Meeting rhythm

- Weekly 30 min: security + delivery review
- Monthly 60 min: risk and access review
- Quarterly 90 min: management review and policy updates
