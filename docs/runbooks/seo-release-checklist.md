# SEO Release Checklist

## Before merge

- [ ] All new pages are locale-prefixed.
- [ ] Metadata exists for each new route.
- [ ] Canonical and hreflang are valid (`x-default` -> FR canonical).
- [ ] Root path `/` is still a permanent redirect (`301`) to `/fr`.
- [ ] HTML `<html lang>` matches locale for `/fr` and `/en`.
- [ ] `sitemap.xml` includes new pages.
- [ ] `sitemap.xml` includes canonical URLs only (no redirecting `/` URL).
- [ ] `llms.txt` and `llms-full.txt` updated if needed.
- [ ] No numeric marketing promise in copy.
- [ ] Breadcrumbs are present on deep pages with matching `BreadcrumbList` JSON-LD.
- [ ] Global JSON-LD only includes valid site-level entities (`Organization`, `WebSite`, `SoftwareApplication`).

## Before deploy

- [ ] Run lint.
- [ ] Run typecheck.
- [ ] Run targeted tests for landing SEO routes.
- [ ] Run `pnpm test:e2e:landing` and validate SEO spec status.

## After deploy

- [ ] Check `/` responds with `301` to `/fr`.
- [ ] Check `/fr` and `/en` respond correctly.
- [ ] Check one FR/EN pair for proper alternates.
- [ ] Check `/llms.txt` and `/llms-full.txt` return plain text.
- [ ] Check Search Console URL inspection for one new page.
