# `app/(app)/messages/`

Route `/messages`.

## Fichiers

| Fichier                      | Role reel                                                                 |
| ---------------------------- | ------------------------------------------------------------------------- |
| `page.tsx`                   | compose maintenant les sections de la route a partir du page-model        |
| `page-sections.tsx`          | porte le hero, le panneau de creation et le workspace conversation/thread |
| `use-messages-page-model.ts` | concentre le state derive, les appels API et les callbacks de page        |
| `loading.tsx`                | etat de chargement de la route                                            |

## Etats degrades visibles

- banniere `error-fallback` si le modele remonte `combinedError`
- message de guidage tant qu'aucune conversation n'est selectionnee
- champ de saisie rendu seulement quand une conversation est active
- bouton de creation desactive tant que le sujet est vide ou en cours de creation
- la route passe entierement en fail-close tant que le runtime conversations n'est pas industrialise; dans cet etat aucun polling ni aucune mutation ne partent vers les routes stubbees
