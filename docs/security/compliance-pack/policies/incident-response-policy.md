# Incident Response Policy

## Purpose

Define mandatory handling of security incidents from first detection to verified recovery.

## Scope

- Production systems and data
- Security findings with active exploitation potential
- Major control failures impacting confidentiality, integrity, or availability

## Severity model

- P0 (Critical): active breach, data exfiltration in progress, ransomware, or critical production outage with security impact.
- P1 (High): confirmed compromise attempt or severe incident requiring immediate coordinated response.
- P2 (Medium): contained security issue requiring same-day investigation and remediation.
- P3 (Low): low-impact security event requiring documentation and tracked follow-up.

## SLA targets

- P0: acknowledge < 15 min, containment < 60 min, executive escalation immediate.
- P1: acknowledge < 30 min, containment < 4 h.
- P2: acknowledge < 4 h, containment < 24 h.
- P3: acknowledge < 1 business day.

## Workflow

1. Detection

- Trigger from local gates, monitoring, threat intelligence, user/vendor report, or manual investigation.

2. Classification

- Assign severity (P0-P3), owner, response channel, and initial impact estimate.

3. Containment

- Apply immediate controls (access revocation, key rotation, rule/block, service isolation, virtual patch).

4. Eradication and recovery

- Remove root cause, patch or harden systems, verify system integrity, restore full service.

5. Governance and closure

- Complete incident record, run post-incident review, and track preventive actions to closure.

## Mandatory artifacts

- Incident entry in `09-incident-register-template.md`
- Timeline with detection/containment/recovery timestamps
- Root cause analysis
- Corrective and preventive actions with owner and due date
- Evidence links (logs, signed gate report, remediation proof)
- Data residency impact assessment for incidents touching production data
