# i18n, Canonical, and Hreflang Guide

## Canonical rules

- Canonical must be self-referencing for the current locale URL.
- Never point FR canonical to EN URL or inverse.

## Hreflang rules

Every localized page pair must expose:

- `fr-FR` -> FR URL
- `en` -> EN URL
- `x-default` -> `/fr/...` URL (French canonical variant)

## Routing rules

- `/` redirects to `/fr`.
- Known non-localized legacy routes redirect `301` to localized canonical routes.
- Unknown non-localized routes are non-canonical and must not be internally linked.
- Locale mismatch slug routes redirect to locale-correct slug.

## Verification

Use browser source + URL inspection in Search Console:

- canonical tag
- alternate hreflang links
- indexability
