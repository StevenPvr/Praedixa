# `lib/content/sector-pages-data/`

Source de verite des pages sectorielles.

## Decoupage

- `types.ts`: contrats partages
- `routes.ts`: slugs, chemins et alias legacy
- `shared.ts`: sources Praedixa communes et cartes de differenciation partagees
- `fitness.ts`: verticale fitness FR/EN partagee
- `fr.ts`: contenu editorial FR des 5 verticales
- `en.ts`: contenu editorial EN des 5 verticales

## Regle

La facade publique reste `lib/content/sector-pages.ts`. Les composants et routes consomment cette facade; ils ne doivent pas repliquer la copy ou la logique de routing.
Les contrats de ce dossier importent `Locale` depuis `lib/i18n/locale.ts`, jamais depuis `lib/i18n/config.ts`, pour garder le graphe de contenu acyclique.
Chaque verticale doit maintenant embarquer deux listes metier distinctes: des `kpis` predicitifs concrets et des `decisions` optimisables concretes, avec une granularite propre au secteur plutot que des formulations generiques.
La proposition de valeur de chaque verticale doit exprimer un risque business sectoriel clair; ne pas laisser les cinq pages retomber dans la meme promesse reductrice de `staffing` meme quand la capacite humaine fait partie du probleme.
Chaque verticale doit aussi faire apparaitre au moins un levier non-staffing propre au secteur dans ses `kpis` et ses `decisions` (ex: promesse de service HCR, listes d'attente campus, stock/reapprovisionnement reseau, pieces/retention apres-vente).
