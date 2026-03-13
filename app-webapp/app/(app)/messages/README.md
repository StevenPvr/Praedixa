# `app/(app)/messages/`

Route `/messages`.

## Fichiers

| Fichier                      | Role reel                                                                |
| ---------------------------- | ------------------------------------------------------------------------ |
| `page.tsx`                   | assemble la liste des conversations, le thread et la creation d'un sujet |
| `use-messages-page-model.ts` | concentre le state derive, les appels API et les callbacks de page       |
| `loading.tsx`                | etat de chargement de la route                                           |

## Etats degrades visibles

- banniere `error-fallback` si le modele remonte `combinedError`
- message de guidage tant qu'aucune conversation n'est selectionnee
- champ de saisie rendu seulement quand une conversation est active
- bouton de creation desactive tant que le sujet est vide ou en cours de creation
