# SEO Operating Model (Noob-Friendly)

## Goal

Keep Praedixa discoverable on brand and non-brand queries with a repeatable process.

## How the site is structured

- Every public page is locale-prefixed.
- French lives under `/fr/...`.
- English lives under `/en/...`.
- Root `/` redirects permanently (`301`) to `/fr`.
- Legacy non-prefixed pages are handled explicitly:
  - known legacy slugs -> permanent redirect (`301`) to locale URL,
  - unknown slugs are non-canonical and should not be linked internally.

## What to publish where

- `/fr` and `/en`: conversion landing pages.
- `/fr/ressources` and `/en/resources`: resource hubs.
- Pillars: broad topics.
- Clusters: focused operational guides.
- BOFU pages: industry-specific decision pages.

## Rules to never break

- One intent per page.
- One canonical URL per locale.
- `x-default` must always point to the French canonical variant.
- Every deep page includes breadcrumb navigation and matching `BreadcrumbList` schema.
- No marketing promises with numeric claims.
- Every content page must link to:
  - its parent resource hub,
  - one deeper resource,
  - pilot application page.

## Weekly checklist

- Verify new pages are in `sitemap.xml`.
- Verify `sitemap.xml` does not include redirecting URLs.
- Verify canonical/hreflang are correct.
- Verify JSON-LD renders with valid `Organization` + `WebSite`.
- Verify no accidental non-localized public route appears.
