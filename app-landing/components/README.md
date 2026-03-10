# `components/`

Composants UI du site marketing.

## Sous-zones

- `homepage/`: sections assemblees par la homepage
- `pages/`: composants de pages completes ou blocs metier (forms, legal, resources)
- `shared/`: shell transverse (header, footer, nav, wrappers, motion)
- `blog/`: listing + detail blog
- `seo/`: rendu JSON-LD

## Reseau de dependances attendu

- `app/[locale]/*` importe surtout `components/pages/*` et `components/homepage/*`
- `components/homepage/*` peut s'appuyer sur `components/shared/*`
- `components/pages/*` orchestre souvent `lib/content/*`, `lib/i18n/*` et les routes `app/api/*`
- `components/shared/*` est le socle visuel partage
- `components/pages/SectorPage.tsx` porte les pages verticales et `components/homepage/SectorPagesTeaserSection.tsx` relie la homepage a ces pages

## Conventions

- garder les composants orientes contenu dans ce dossier, pas dans `lib/`
- les composants client doivent etre explicites avec `"use client"`
- la copy vient du dictionnaire ou de modules `lib/content`, pas de constantes dupliquees dans plusieurs sections
- les variantes de motion vivent de preference dans `components/shared/motion/` ou `lib/animations/variants.ts`

## Tests

- `homepage/__tests__/`
- `shared/__tests__/`
