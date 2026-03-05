# LLM Discovery Guide

## Files exposed

- `/llms.txt`: short canonical index for model crawlers.
- `/llms-full.txt`: expanded content inventory by locale.

## Why this exists

It helps AI retrieval systems find the canonical, high-signal pages first, with the exact current positioning used on the landing.

Current canonical positioning to keep aligned:

- Closed loop: forecast -> optimal decision -> assisted first action -> monthly ROI proof.
- Read-only overlay on existing exports/APIs.
- Human in the loop: manager validates.
- Not a planning/WFM replacement.
- Month 1 offered: historical audit (read-only).

## Maintenance

Update these files whenever:

- the landing promise changes,
- the contact/pilot offer changes,
- a pillar is added,
- a cluster is removed,
- a BOFU page slug changes,
- locale mapping changes.

Validation after update:

- check `/llms.txt` and `/llms-full.txt` return `text/plain`,
- confirm links resolve in both `/fr` and `/en`,
- confirm wording matches `app-landing/lib/i18n/dictionaries/fr.ts` and `app-landing/lib/i18n/dictionaries/en.ts`.
