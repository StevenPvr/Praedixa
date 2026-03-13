# `app/auth/` - Handlers auth de l'admin

Handlers Next.js server-side du flow OIDC de la console super-admin.

## Routes

| Route            | Fichier             | Comportement reel                                                                |
| ---------------- | ------------------- | -------------------------------------------------------------------------------- |
| `/auth/login`    | `login/route.ts`    | prepare le flow OIDC et redirige vers l'issuer                                   |
| `/auth/callback` | `callback/route.ts` | echange le `code`, cree la session admin et refuse les permissions insuffisantes |
| `/auth/session`  | `session/route.ts`  | GET same-origin only qui renvoie l'utilisateur admin courant et ses permissions  |
| `/auth/logout`   | `logout/route.ts`   | nettoie la session et ferme le parcours                                          |

## Invariants verifies par le code

- les reponses de session renvoient `permissions` en plus du role
- le callback exige l'acces `admin:console:access`
- en production, le callback refuse aussi tout token admin sans preuve MFA compatible avec `AUTH_ADMIN_REQUIRED_AMR`
- `/auth/session` est no-store et same-origin only
- `/auth/session` renvoie `403` sur echec CSRF, `401` si la session ne peut pas etre resolue et `429` si le rate limit refuse
- le rate limit auth est fail-close hors developpement: sans store distribue explicite ou sans `AUTH_RATE_LIMIT_KEY_SALT`, les handlers refusent
