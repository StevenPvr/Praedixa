# LLM Discovery Guide

## Files exposed

- `/llms.txt`: short canonical index for model crawlers.
- `/llms-full.txt`: expanded content inventory by locale.
- `/llm.txt`: compatibility redirect to `/llms.txt`, never a separate source of truth.

Canonical naming choice:

- publish only `/llms.txt` as canonical content;
- keep `/llm.txt` as a redirect alias only if tooling or operators still probe that path;
- do not maintain two different text artifacts with diverging content.

## Why this exists

It helps AI retrieval systems find the canonical, high-signal pages first, with the exact current positioning used on the landing.

Current canonical positioning to keep aligned:

- Public path: concrete example first, Praedixa deployment second, historical proof only if it helps qualify the starting point.
- Praedixa helps multi-site networks surface the trade-offs that threaten margin earlier, compare constrained options, and review the real impact of the decisions taken.
- Starts with the most costly coverage and allocation trade-offs in the customer perimeter.
- Read-only overlay on existing exports/APIs before deeper rollout.
- Human in the loop: managers remain decision-makers.
- Not a planning, WFM, ERP, BI, or generic data-platform replacement.

## Maintenance

Update these files whenever:

- the landing promise changes,
- the public offer hierarchy changes,
- the contact/pilot offer changes,
- public legal hosting or sovereignty wording changes,
- a pillar is added,
- a cluster is removed,
- a BOFU page slug changes,
- locale mapping changes.

Validation after update:

- check `/llms.txt` and `/llms-full.txt` return `text/plain`,
- check `/llm.txt` redirects to `/llms.txt`,
- confirm links resolve in both `/fr` and `/en`,
- confirm wording stays aligned with the current positioning source in `app-landing/lib/seo/llms.ts` and the landing dictionaries.
