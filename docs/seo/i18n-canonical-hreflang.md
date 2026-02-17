# i18n, Canonical, and Hreflang Guide

## Canonical rules

- Canonical must be self-referencing for the current locale URL.
- Never point FR canonical to EN URL or inverse.

## Hreflang rules

Every localized page pair must expose:

- `fr-FR` -> FR URL
- `en` -> EN URL
- `x-default` -> `/fr/...` URL

## Routing rules

- `/` redirects to `/fr`.
- Non-localized legacy routes return `410`.
- Locale mismatch slug routes redirect to locale-correct slug.

## Verification

Use browser source + URL inspection in Search Console:

- canonical tag
- alternate hreflang links
- indexability
