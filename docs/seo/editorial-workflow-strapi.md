# Editorial Workflow (Strapi-ready, Free-to-Play)

## Current state

The landing app already supports a scalable URL and metadata model for FR/EN SEO pages.

## Recommended CMS deployment

- Use Strapi OSS self-hosted (free-to-play).
- Host on your own infra.
- Enable i18n with `fr` and `en`.
- Model types:
  - `pillar_page`
  - `cluster_page`
  - `industry_page`
  - `resource_hub`

## Required fields per entry

- `slug_fr`, `slug_en`
- `title_fr`, `title_en`
- `meta_description_fr`, `meta_description_en`
- `body_fr`, `body_en`
- `status` (`draft` or `published`)

## Mandatory editorial controls

- Reject entries with numeric performance promises.
- Reject entries without internal links to hub + pilot page.
- Reject entries without FR/EN pair.

## Publish flow

1. Draft FR and EN content.
2. Review copy and legal safety.
3. Publish in Strapi.
4. Trigger ISR/webhook revalidation.
5. Validate page live + sitemap entry.
