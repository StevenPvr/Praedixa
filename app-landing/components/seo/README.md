# Seo

## Rôle

Ce sous-dossier contient une famille spécialisée de composants rattachée à `app-landing`.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `JsonLd.tsx`
- `CorePageJsonLd.tsx`

## Intégration

Ce dossier est consommé par l'application `app-landing` et s'insère dans son flux runtime, build ou test.
`JsonLd.tsx` publie des scripts JSON-LD contextuels separes par type de page; la source de verite n'est plus un `@graph` global unique.
`CorePageJsonLd.tsx` publie les schemas `WebPage` et `BreadcrumbList` pour les pages piliers indexables, en les reliant aux entites canoniques `#website` et `#organization`.
Le wording machine-readable doit suivre la meme wedge publique que la landing (`ecarts charge/capacite -> arbitrage -> impact`) au lieu de reintroduire un discours plus large ou plus jargonisant.
Pour les pages coeur de navigation publique, garder alignes le titre visible, la breadcrumb visible et les libelles JSON-LD; Google doit lire la meme hierarchie dans l'UI et dans le balisage.
Si une route publique devient une redirection ou qu'une offre publique change de nom, nettoyer le schema, le sitemap et les snippets dans la meme passe pour que Google ne conserve pas l'ancien produit en vitrine.
