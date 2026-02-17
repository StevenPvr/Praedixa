# SEO Release Checklist

## Before merge

- [ ] All new pages are locale-prefixed.
- [ ] Metadata exists for each new route.
- [ ] Canonical and hreflang are valid.
- [ ] `sitemap.xml` includes new pages.
- [ ] `llms.txt` and `llms-full.txt` updated if needed.
- [ ] No numeric marketing promise in copy.

## Before deploy

- [ ] Run lint.
- [ ] Run typecheck.
- [ ] Run targeted tests for landing SEO routes.

## After deploy

- [ ] Check `/fr` and `/en` respond correctly.
- [ ] Check one FR/EN pair for proper alternates.
- [ ] Check `/llms.txt` and `/llms-full.txt` return plain text.
- [ ] Check Search Console URL inspection for one new page.
