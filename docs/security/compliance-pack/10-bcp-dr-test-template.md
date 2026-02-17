# 10 - BCP/DR Test Template

## Recovery objectives

- RTO target: 4h (initial target)
- RPO target: 1h (initial target)

## Test execution

| Test ID | Date   | Scenario               | Systems covered      | Restore method | RTO achieved | RPO achieved | Result      | Gaps found | Actions   | Owner  | Evidence |
| ------- | ------ | ---------------------- | -------------------- | -------------- | ------------ | ------------ | ----------- | ---------- | --------- | ------ | -------- |
| DR-001  | [DATE] | DB restore             | API + DB             | [METHOD]       | [TIME]       | [TIME]       | [PASS/FAIL] | [GAPS]     | [ACTIONS] | [NAME] | [LINK]   |
| DR-002  | [DATE] | Region residency drill | API + logs + backups | [METHOD]       | [TIME]       | [TIME]       | [PASS/FAIL] | [GAPS]     | [ACTIONS] | [NAME] | [LINK]   |

## Minimum cadence

- One restore test per quarter.
- One incident tabletop per quarter.
- One France-only residency continuity drill per quarter.
