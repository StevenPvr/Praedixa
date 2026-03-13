# `app/api/` - BFF admin vers l'API Praedixa

Comme le webapp, l'admin passe par un proxy Next.js same-origin pour appeler l'API backend avec la session serveur.

## Route presente

| Route               | Fichier                 | Role                                 |
| ------------------- | ----------------------- | ------------------------------------ |
| `/api/v1/[...path]` | `v1/[...path]/route.ts` | Proxy authentifie vers l'API backend |

## Responsabilites

- Autoriser quelques GET publics (`health`).
- Verifier l'origine browser avant de proxifier une requete authentifiee.
- Recuperer la session courante via `resolveRequestSession`.
- Injecter le bearer cote serveur.
- Propager `X-Request-ID`, `traceparent` et `tracestate` vers l'API backend.
- Appliquer `no-store` et reexposer `X-Request-ID` sur les reponses.
- Vider les cookies sur `401`.

## Specificites admin

- `NEXT_PUBLIC_API_URL` est validee strictement avant usage.
- Le proxy s'appuie sur `resolveExpectedOrigin()` pour les controles CSRF/same-origin.
- Les chemins reels consommes par la console sont centralises dans `lib/api/endpoints.ts`.
