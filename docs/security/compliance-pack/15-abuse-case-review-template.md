# 15 - Abuse Case Review Template

Use this template for sensitive features (authorization boundaries, billing flows, export/import, irreversible actions, high-value workflows).

## Metadata

- Feature:
- Owner:
- Reviewer:
- Date:
- Release target:
- Related PR/ticket:

## Abuse scenarios

| Scenario ID | Abuse objective                          | Precondition | Attack path | Expected control | Verification test  | Result      |
| ----------- | ---------------------------------------- | ------------ | ----------- | ---------------- | ------------------ | ----------- |
| ABUSE-001   | [EXAMPLE] Gain unauthorized admin action | [STATE]      | [STEPS]     | [CONTROL]        | [TEST FILE / CASE] | [PASS/FAIL] |

## Required checks

- Horizontal privilege escalation attempts covered.
- Vertical privilege escalation attempts covered.
- Workflow bypass and race condition attempts covered.
- Rate limit and anti-automation abuse covered.
- Logging/monitoring expectations defined for detection.

## Decision

- Security decision: `approve` / `approve with conditions` / `reject`
- Conditions:
- Required follow-up actions:
- Evidence link:
