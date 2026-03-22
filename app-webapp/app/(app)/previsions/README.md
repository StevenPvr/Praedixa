# `app/(app)/previsions/`

Route `/previsions`.

## Fichiers

| Fichier                        | Role reel                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `page.tsx`                     | rend les cartes, tableaux et etats visuels de la route `/previsions`                                   |
| `use-previsions-page-model.ts` | concentre le state, les hooks de donnees et la selection d'horizon pour garder `page.tsx` plus lisible |
| `loading.tsx`                  | etat de chargement de la route                                                                         |

## Etats degrades visibles

- banniere d'erreur inline avec bouton `Reessayer`
- message `Aucun horizon actif configure`
- message `Aucune prevision disponible`
- message `Aucune alerte active`

La page ne monte pas de graphe ou composant local dedie. Le rendu reste dans `page.tsx`, mais la logique de donnees et de filtres vit desormais dans `use-previsions-page-model.ts`.
