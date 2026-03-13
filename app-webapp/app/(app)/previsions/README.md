# `app/(app)/previsions/`

Route `/previsions`.

## Fichiers

| Fichier       | Role reel                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| `page.tsx`    | combine `useDecisionConfig`, `useLatestForecasts` et `useApiGet` pour afficher horizons, previsions et alertes |
| `loading.tsx` | etat de chargement de la route                                                                                 |

## Etats degrades visibles

- banniere d'erreur inline avec bouton `Reessayer`
- message `Aucun horizon actif configure`
- message `Aucune prevision disponible`
- message `Aucune alerte active`

La page ne monte pas de graphe ou composant local dedie: l'essentiel du rendu reste dans le JSX de `page.tsx`.
