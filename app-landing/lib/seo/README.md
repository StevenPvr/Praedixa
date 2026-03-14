# `lib/seo/`

Helpers SEO et metadata.

## Role

Construire des metadata Next cohérentes, les entites SEO et quelques schemas derives.

## Fichiers clefs

- `metadata.ts`: builder principal pour title/description/canonical/hreflang/OG/Twitter
- `entity.ts`: donnees entite / organisation
- `knowledge.ts`: helpers SEO pour pages knowledge
- `schema/breadcrumb.ts`: breadcrumb schema
- `schema/core-page.ts`: `WebPage` schema relie aux entites canoniques et a la breadcrumb de page
- `types.ts`: contrats SEO internes

## Consommateurs

- `app/[locale]/*` via `generateMetadata`
- `app/robots.ts`
- `app/sitemap.ts`
- `components/seo/JsonLd.tsx`

## Convention

- `JsonLd.tsx` emet plusieurs scripts JSON-LD specialises (organisation, website, softwareApplication, service, faq) plutot qu'un `@graph` global monolithique.
- Les pages piliers publiques doivent exposer une hierarchie coherente a la fois en UI et en schema: breadcrumb visible, `BreadcrumbList` JSON-LD, et `WebPage` rattache a `#website` et `#organization`.
- Les metadata et sorties `llms*.txt` doivent reprendre la promesse publique actuelle de la landing; ne pas y reintroduire un wording categorie plus large que celui visible aux acheteurs.

## Tests

- `__tests__/metadata.test.ts`
