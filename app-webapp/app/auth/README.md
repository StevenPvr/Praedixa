# `app/auth/` - Route handlers OIDC et session

Ce dossier contient les endpoints Next.js qui gerent le cycle de vie de la session webapp. Ils sont appeles par le navigateur ou par `lib/auth/client.ts`, mais restent server-side pour ne jamais exposer directement le bearer token aux composants.

## Routes

| Route | Fichier | Role |
| --- | --- | --- |
| `/auth/login` | `login/route.ts` | Demarre le flow OIDC Authorization Code + PKCE |
| `/auth/callback` | `callback/route.ts` | Echange `code` contre tokens, cree les cookies et la session signee |
| `/auth/session` | `session/route.ts` | Retourne l'utilisateur courant, refresh best-effort, rate limit et same-origin |
| `/auth/logout` | `logout/route.ts` | Nettoie les cookies et revoque si possible le refresh token |

## Invariants de securite

- Verification same-origin pour les routes JSON/browser sensibles.
- Cache desactive (`no-store`) pour les reponses de session.
- Cookies signes et rotatifs via `lib/auth/oidc`.
- Rate limiting sur les endpoints auth browser-facing.

## Dependances

- `@/lib/auth/request-session`
- `@/lib/auth/oidc`
- `@/lib/auth/rate-limit`
- `@/lib/security/same-origin`

## Tests

- Les tests sont colocalises dans `callback/__tests__/`, `login/__tests__/`, `logout/__tests__/` et `session/__tests__/`.
