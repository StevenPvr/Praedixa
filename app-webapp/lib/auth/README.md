# `lib/auth/` - Authentification, session et garde d'acces

Le webapp utilise OIDC Authorization Code + PKCE avec cookies httpOnly et session signee. Ce dossier porte tout le cycle de vie d'auth: middleware, lecture serveur, lecture client, rafraichissement et protections d'origine/rate limit.

## Fichiers principaux

| Fichier | Role |
| --- | --- |
| `middleware.ts` | Garde d'entree du webapp, refresh et redirections |
| `request-session.ts` | Resolution centralisee de la session a partir de la requete |
| `server.ts` | Helpers serveur pour lire l'utilisateur courant |
| `client.ts` | Hook client pour recuperer l'utilisateur via `/auth/session` |
| `roles.ts` | Mapping des roles pour la navigation client |
| `origin.ts` | Resolution de l'origine publique pour OIDC/same-origin |
| `rate-limit.ts` | Facade de rate limit pour les endpoints auth |
| `oidc.ts` | Barrel export du sous-systeme OIDC |

## Sous-dossier `oidc/`

| Fichier | Role |
| --- | --- |
| `env.ts` | Validation des variables d'environnement OIDC |
| `discovery.ts` | Resolution des endpoints OIDC de confiance |
| `jwt.ts` | Decode/validation locale du JWT utile a l'app |
| `cookies.ts` | Ecriture et suppression des cookies d'auth |
| `session.ts` | Signature et verification de la session signee |
| `tokens.ts` | Echange et refresh de tokens |
| `navigation.ts` | Sanitize du `next`/redirect cible |
| `types.ts` | Types et constantes du domaine auth |

## Regles produit

- `super_admin` n'utilise pas le webapp et est redirige vers le login.
- Les composants n'accedent jamais directement au bearer token.
- Les refreshs sont faits cote serveur ou via `/auth/session`.

## Tests

- Les tests sont regroupes dans `__tests__/` et couvrent middleware, origin, OIDC, session, rate limit et helpers client/serveur.
