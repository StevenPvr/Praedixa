# `lib/auth/` - Auth, session et permissions admin

Le back-office n'est pas seulement protege par un role; il applique aussi des permissions fines par route. Ce dossier porte la resolution de session, les permissions metier et les garde-fous d'acces directs.

## Fichiers principaux

| Fichier | Role |
| --- | --- |
| `middleware.ts` | Garde des requetes Next, redirections login/unauthorized |
| `request-session.ts` | Resolution centralisee de la session admin |
| `server.ts` | Helpers serveur pour lire l'utilisateur |
| `client.ts` | Lecture client de la session via `/auth/session` |
| `permissions.ts` | Normalisation des permissions et acces console |
| `route-access.ts` | Mapping pathname -> permissions requises |
| `oidc.ts` | Sous-systeme OIDC admin (cookies, JWT, refresh, session) |

## Regles importantes

- Acces console reserve a `canAccessAdminConsole(...)`.
- Les routes `/api/*` ne sont pas gerees par le middleware de page; elles gardent leur propre contrat JSON.
- `route-access.ts` protege aussi les URL directes du workspace client, pas seulement la navigation visible.

## Tests

- `__tests__/client.test.ts`
- `__tests__/middleware.test.ts`
- `__tests__/oidc.test.ts`
- `__tests__/permissions.test.ts`
- `__tests__/route-access.test.ts`
- `__tests__/server.test.ts`
