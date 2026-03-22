# `app/(auth)/` - UI publique du login admin

Ce groupe contient l'interface publique de connexion de l'admin. Comme pour le webapp, la logique d'authentification serveur reside dans [`../auth/`](../auth/README.md), pas dans cette UI.

## Contenu

| Fichier                         | Role                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `layout.tsx`                    | Layout simple pour la page de login, avec la cible SSR `#main-content` du skip-link global |
| `login/page.tsx`                | Ecran `/login` reserve a l'entree super-admin                                              |
| `login/__tests__/page.test.tsx` | Validation du rendu et des messages                                                        |

## Conventions locales

- `layout.tsx` expose maintenant un contrat de props dedie en `Readonly` pour rester aligne avec les checks Sonar sur les layouts Next.
- `login/page.tsx` utilise `globalThis.location` plutot que `window` pour la redirection vers `/auth/login`.
