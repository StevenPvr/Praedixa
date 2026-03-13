# `app/(app)/actions/`

Route `/actions`.

## Fichiers

| Fichier       | Role reel                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `page.tsx`    | gere l'onglet `A traiter`, l'onglet `Historique`, la selection d'alerte et la validation d'une decision |
| `loading.tsx` | etat de chargement de la route                                                                          |

## Fetch reel

- `useApiGet` pour les alertes ouvertes
- `useApiGet` pour le workspace de decision de l'alerte selectionnee
- `useApiGetPaginated` pour l'historique
- `useApiPost` pour enregistrer une decision
- `useDecisionConfig` pour les labels d'horizon
- la soumission runtime suit le contrat partage `OperationalDecisionCreateRequest` (`alertId`, `optionId`, `notes?`) et n'envoie plus les anciens champs derives du front

## Etats degrades visibles

- banniere inline pour les erreurs d'alertes
- banniere inline pour les erreurs de workspace
- banniere inline pour les erreurs d'historique
- traitement possible seulement si une alerte et une option sont selectionnees
- une justification est requise avant toute validation d'une option differente de la recommandation
