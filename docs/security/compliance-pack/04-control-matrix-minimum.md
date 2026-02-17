# 04 - Control Matrix (Minimum)

Note: mapping is indicative and should be validated by your auditor.

| Control ID   | Control description                          | Evidence artifact                                                | Owner       | Frequency                  | SOC 2 (indicative) | ISO 27001 (indicative) |
| ------------ | -------------------------------------------- | ---------------------------------------------------------------- | ----------- | -------------------------- | ------------------ | ---------------------- |
| CTRL-AC-01   | MFA enabled on critical systems              | Screenshot/export + access review log                            | CTO         | Monthly                    | CC6.x              | A.5, A.8               |
| CTRL-AC-02   | Least privilege and role reviews             | `07-access-review-log-template.md`                               | CTO/Ops     | Monthly                    | CC6.x              | A.5, A.8               |
| CTRL-SDLC-01 | Code scanning and hard gates in CI           | CI logs + SARIF + workflow files                                 | CTO         | Continuous                 | CC7.x              | A.8                    |
| CTRL-VULN-01 | Vulnerability management process             | vuln tickets + closure evidence                                  | CTO         | Weekly                     | CC7.x              | A.8                    |
| CTRL-CHG-01  | Controlled change management                 | `08-change-management-log-template.md`                           | Ops/Product | Weekly                     | CC8.x              | A.8                    |
| CTRL-LOG-01  | Audit trail for admin actions                | app logs + audit docs                                            | CTO         | Continuous                 | CC7.x              | A.8                    |
| CTRL-INC-01  | Incident response process                    | `09-incident-register-template.md`                               | CEO/CTO     | As needed + quarterly test | CC7.x              | A.5                    |
| CTRL-BCP-01  | Backup and restore tested                    | `10-bcp-dr-test-template.md`                                     | CTO         | Quarterly                  | CC7.x              | A.5, A.8               |
| CTRL-VDR-01  | Vendor due diligence and DPA                 | `06-vendor-subprocessor-register.md`                             | CEO/Ops     | Quarterly                  | CC9.x              | A.5                    |
| CTRL-AUD-01  | Evidence retention and audit trail           | `11-evidence-index-template.md`                                  | Ops/Product | Monthly                    | CC1/CC2/CC7        | A.5                    |
| CTRL-RES-01  | Production data residency enforced in France | Vendor attestations + architecture diagrams + config screenshots | CTO         | Monthly                    | CC6/CC7/CC9        | A.5, A.8               |
| CTRL-RES-02  | Backup and logs residency in France          | Backup provider evidence + log sink region evidence              | CTO         | Monthly                    | CC7/CC9            | A.8                    |
| CTRL-RES-03  | Change gate includes residency impact check  | Change log with residency field                                  | Ops/Product | Weekly                     | CC8/CC9            | A.8                    |
