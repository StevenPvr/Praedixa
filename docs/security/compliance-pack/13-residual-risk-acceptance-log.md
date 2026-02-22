# 13 - Residual Risk Acceptance Log

Use this log when a risk cannot be fully remediated before release.

## Acceptance criteria

- Named owner and reviewer are mandatory.
- Compensating controls are mandatory.
- Expiration date is mandatory and must be <= 90 days.
- Acceptance decision must be traceable to approvers.
- Revalidation is mandatory before expiration.

## Log

| Acceptance ID | Risk ID | Residual risk statement | Why immediate fix is not feasible | Compensating controls | Owner  | Reviewer | Approver(s) | Accepted on | Expires on | Revalidation date | Status (active/expired/closed) | Evidence |
| ------------- | ------- | ----------------------- | --------------------------------- | --------------------- | ------ | -------- | ----------- | ----------- | ---------- | ----------------- | ------------------------------ | -------- |
| RRA-001       | R-007   | [SHORT STATEMENT]       | [REASON]                          | [CONTROL SET]         | [NAME] | [NAME]   | [CTO + SEC] | [DATE]      | [DATE]     | [DATE]            | [STATUS]                       | [LINK]   |

## Weekly review checklist

- Expired entries are escalated and cannot remain `active`.
- Any control failure linked to an active residual risk triggers immediate reassessment.
- Each active entry has current evidence and a scheduled revalidation date.
