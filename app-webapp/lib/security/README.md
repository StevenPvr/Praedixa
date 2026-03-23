# `lib/security/` - Protections HTTP et navigateur

Ce dossier regroupe les protections transverses du webapp hors auth OIDC stricte.

## Fichiers

| Fichier          | Role                                                                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `csp.ts`         | Generation du nonce CSP et de l'en-tete CSP                                                                                                                                                                                         |
| `headers.ts`     | Headers de securite statiques pour `next.config.ts`                                                                                                                                                                                 |
| `same-origin.ts` | Verification des requetes browser same-origin sur les routes JSON sensibles, avec rejet fail-closed si `Origin` et `Sec-Fetch-Site` sont absents, et priorite au veto `Sec-Fetch-Site` quand il annonce `cross-site` ou `same-site` |

## Usage

- `proxy.ts` s'appuie sur `csp.ts` pour injecter le nonce et recopier la CSP complete dans les headers de requete avant rendu, afin que Next.js applique bien le nonce aux scripts framework et aux flux streames en production.
- Les ecrans proteges sous `app/(app)` restent en rendu dynamique (`dynamic = "force-dynamic"`), car une page prerendue ne peut pas recevoir un nonce CSP request-scoped sans casser l'hydratation Next.js.
- Les route handlers `app/auth/*` et `app/api/v1/*` utilisent `same-origin.ts`.
- `next.config.ts` importe `headers.ts` pour les headers generaux.
- Les handlers JSON comme `/auth/session` et `/api/v1/*` restent stricts; seule une route qui passe `allowNavigate: true` peut accepter un navigateur sans header `Origin`.
- En production, `same-origin.ts` exige une origine publique configuree via `AUTH_APP_ORIGIN` ou `NEXT_PUBLIC_APP_ORIGIN`; il ne doit jamais retomber sur l'host entrant pour autoriser une requete navigateur.
- En developpement local, `same-origin.ts` suit maintenant l'origine auth resolue par requete pour les IP privees et aliases loopback; les routes JSON sensibles restent ainsi coherentes avec le host reel du flow OIDC.

## Tests

- `__tests__/csp.test.ts` couvre la construction de la CSP.
