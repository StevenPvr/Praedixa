# `app/(app)/actions/`

Route `/actions`.

## Fichiers

| Fichier                     | Role reel                                                                       |
| --------------------------- | ------------------------------------------------------------------------------- |
| `page.tsx`                  | orchestre la route et branche le page-model vers les sections UI                |
| `page-sections.tsx`         | porte maintenant surtout le header et les onglets                               |
| `treatment-section.tsx`     | porte le workspace de traitement (`alertes`, `diagnostic`, `options`)           |
| `history-section.tsx`       | porte le tableau historique et sa pagination                                    |
| `use-actions-page-model.ts` | centralise l'etat de page, les fetchs, les derives et la validation de decision |
| `loading.tsx`               | etat de chargement de la route                                                  |

## Fetch reel

- `useApiGet` pour les alertes ouvertes
- `useApiGet` pour le workspace de decision de l'alerte selectionnee
- `useApiGetPaginated` pour l'historique
- `useApiPost` pour enregistrer une decision
- `useDecisionConfig` pour les labels d'horizon
- la soumission runtime suit le contrat partage `OperationalDecisionCreateRequest` (`alertId`, `optionId`, `notes?`) et n'envoie plus les anciens champs derives du front

## Garde-fous runtime

- l'onglet Historique reste fail-close tant que le runtime persistant des decisions n'est pas branche; le page-model n'appelle alors plus la route stubbee et expose un message d'indisponibilite explicite

## Etats degrades visibles

- banniere inline pour les erreurs d'alertes
- banniere inline pour les erreurs de workspace
- banniere inline pour les erreurs d'historique
- traitement possible seulement si une alerte et une option sont selectionnees
- une justification est requise avant toute validation d'une option differente de la recommandation
