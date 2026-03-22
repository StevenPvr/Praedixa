# `app/auth/` - Handlers auth du webapp

Handlers Next.js server-side du cycle OIDC et de la session browser. Rien ici n'expose le bearer token aux composants client.

## Routes

| Route            | Fichier             | Comportement reel                                                                                                         |
| ---------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/auth/login`    | `login/route.ts`    | prepare le flow OIDC PKCE et redirige vers l'issuer                                                                       |
| `/auth/callback` | `callback/route.ts` | echange le `code`, valide les claims utiles a l'API, signe la session ou bascule un `super_admin` vers le flow admin      |
| `/auth/session`  | `session/route.ts`  | GET same-origin only, renvoie l'utilisateur courant et rafraichit la session si necessaire                                |
| `/auth/logout`   | `logout/route.ts`   | nettoie les cookies, tente une revocation best-effort et accepte seulement une navigation browser explicitement autorisee |

## Invariants verifies par le code

- reponses `no-store` sur les flux de session/redirect sensibles
- protection same-origin stricte sur `/auth/session`
- `/auth/logout` n'accepte `Sec-Fetch-Site:none` que via un opt-in navigation explicite; pas de fallback implicite pour les autres JSON routes
- les handlers auth refusent aussi toute requete browser dont `Sec-Fetch-Site` annonce `cross-site` ou `same-site`, meme si `Origin` semble coherent
- `401` pour une session introuvable ou invalide, `403` si la requete browser n'est pas same-origin, `429` si le rate limit auth refuse la requete
- le callback refuse les tokens incompatibles avec le contrat API attendu
- un `super_admin` authentifie sur le client webapp n'est pas garde dans le workspace client: il est reoriente vers `/auth/login` de l'app admin avec `next=/clients`
- le rate limit auth est browser-facing et fail-close hors developpement: sans store distribue explicite ou sans `AUTH_RATE_LIMIT_KEY_SALT`, les handlers refusent au lieu de degrader localement
- `login` et `callback` exigent une origine publique explicite et valide via `AUTH_APP_ORIGIN` ou `NEXT_PUBLIC_APP_ORIGIN` en production
- aucun handler auth ne reconstruit l'origine publique depuis `request.nextUrl.origin` en production
- quand la decouverte OIDC ou la validation d'issuer echoue, `/auth/login` garde un code erreur navigateur stable mais journalise maintenant la cause exacte cote serveur pour accelerer le diagnostic ops

## Dependances directes

- `@/lib/auth/oidc`
- `@/lib/auth/request-session`
- `@/lib/auth/rate-limit`
- `@/lib/security/same-origin`
