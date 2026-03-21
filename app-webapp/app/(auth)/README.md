# `app/(auth)/` - UI publique du login client

Ce groupe ne contient pas la logique d'authentification serveur. Il porte seulement l'interface publique de `/login`.

## Fichiers

| Fichier          | Role reel                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `layout.tsx`     | layout marketing/login en deux panneaux, avec cible `#main-content` pour le skip-link            |
| `login/page.tsx` | page `/login`, lit les query params d'erreur/reauth et redirige l'utilisateur vers `/auth/login` |

## Flux reel

- les messages affiches viennent des query params (`error`, `reauth`, `token_reason`, `error_code`, `request_id`) poses par les handlers `app/auth/*`; `wrong_role` explique maintenant explicitement qu'un compte `super_admin` doit passer par la console admin
- le bouton de connexion ne parle pas directement a l'IdP: il ouvre `/auth/login`
- toute la logique OIDC, session, cookies et rate limit reste dans [`../auth/README.md`](../auth/README.md)
