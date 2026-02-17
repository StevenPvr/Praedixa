# SEO Operating Model (Noob-Friendly)

## Goal

Keep Praedixa discoverable on brand and non-brand queries with a repeatable process.

## How the site is structured

- Every public page is locale-prefixed.
- French lives under `/fr/...`.
- English lives under `/en/...`.
- Root `/` redirects to `/fr`.
- Legacy non-prefixed pages return `410` on purpose.

## What to publish where

- `/fr` and `/en`: conversion landing pages.
- `/fr/ressources` and `/en/resources`: resource hubs.
- Pillars: broad topics.
- Clusters: focused operational guides.
- BOFU pages: industry-specific decision pages.

## Rules to never break

- One intent per page.
- One canonical URL per locale.
- No marketing promises with numeric claims.
- Every content page must link to:
  - its parent resource hub,
  - one deeper resource,
  - pilot application page.

## Weekly checklist

- Verify new pages are in `sitemap.xml`.
- Verify canonical/hreflang are correct.
- Verify JSON-LD renders with valid `Organization` + `WebSite`.
- Verify no accidental non-localized public route appears.
