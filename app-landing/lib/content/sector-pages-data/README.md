# `lib/content/sector-pages-data/`

Source de verite des pages sectorielles.

## Decoupage

- `types.ts`: contrats partages
- `routes.ts`: slugs, chemins et alias legacy
- `shared.ts`: sources Praedixa communes et cartes de differenciation partagees
- `fr.ts`: contenu editorial FR des 4 verticales
- `en.ts`: contenu editorial EN des 4 verticales

## Regle

La facade publique reste `lib/content/sector-pages.ts`. Les composants et routes consomment cette facade; ils ne doivent pas repliquer la copy ou la logique de routing.
