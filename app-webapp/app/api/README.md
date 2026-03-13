# `app/api/` - BFF same-origin

Le webapp ne parle pas directement au backend depuis le navigateur. Ce dossier contient le proxy Next.js qui transfere les appels `/api/v1/*` vers `NEXT_PUBLIC_API_URL` avec les credentials serveur.

## Route presente

| Route               | Fichier                 | Role                                  |
| ------------------- | ----------------------- | ------------------------------------- |
| `/api/v1/[...path]` | `v1/[...path]/route.ts` | Proxy authentifie vers l'API Praedixa |

## Responsabilites du proxy

- Accepter un petit ensemble de endpoints publics en GET (`health`).
- Verifier la session pour les autres appels.
- Refaire le refresh si necessaire via `resolveRequestSession`.
- Injecter `Authorization: Bearer ...` cote serveur.
- Propager `X-Request-ID`, `traceparent` et `tracestate` vers l'API amont.
- Bloquer les requetes browser cross-site.
- Refuser `Sec-Fetch-Site:none` sur le proxy JSON; seul un handler qui opt-in explicitement a ce mode peut l'accepter.
- Copier la reponse upstream en retirant les hop-by-hop headers.
- Poser `no-store`, reexposer `X-Request-ID` et vider les cookies en cas de `401`.

## Limites et garde-fous

- Corps de requete limites par `API_PROXY_MAX_BODY_BYTES`.
- Pas d'acces direct au token depuis React.
- Les wrappers typed lives dans `lib/api/`.

## Tests

- `v1/[...path]/__tests__/route.test.ts` couvre le proxying, l'auth et les cas d'erreur.
