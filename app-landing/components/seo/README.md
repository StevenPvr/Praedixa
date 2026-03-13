# Seo

## Rôle

Ce sous-dossier contient une famille spécialisée de composants rattachée à `app-landing`.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `JsonLd.tsx`

## Intégration

Ce dossier est consommé par l'application `app-landing` et s'insère dans son flux runtime, build ou test.
`JsonLd.tsx` publie des scripts JSON-LD contextuels separes par type de page; la source de verite n'est plus un `@graph` global unique.
Le wording machine-readable doit suivre la meme wedge publique que la landing (`ecarts charge/capacite -> arbitrage -> impact`) au lieu de reintroduire un discours plus large ou plus jargonisant.
