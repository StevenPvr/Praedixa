# `lib/auth/` - Authentification, session et garde d'acces

Le webapp utilise OIDC Authorization Code + PKCE avec cookies httpOnly et session signee. Ce dossier porte tout le cycle de vie d'auth: middleware, lecture serveur, lecture client, rafraichissement et protections d'origine/rate limit.

## Fichiers principaux

| Fichier              | Role                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `middleware.ts`      | Garde d'entree du webapp, refresh et redirections                                                                                                               |
| `route-policy.ts`    | Source de verite explicite des routes webapp acceptees par le middleware (`/`, pages app, `/login`, `/auth/*`, `/api/*`)                                        |
| `request-session.ts` | Resolution centralisee de la session a partir de la requete                                                                                                     |
| `server.ts`          | Helpers serveur pour lire l'utilisateur courant                                                                                                                 |
| `client.ts`          | Hook client pour recuperer l'utilisateur via `/auth/session`                                                                                                    |
| `roles.ts`           | Mapping des roles pour la navigation client                                                                                                                     |
| `origin.ts`          | Resolution de l'origine publique pour OIDC/same-origin, avec rejet fail-closed des JSON routes sans metadata d'origine et opt-in explicite pour les navigations |
| `rate-limit.ts`      | Facade de rate limit pour les endpoints auth                                                                                                                    |
| `oidc.ts`            | Barrel export du sous-systeme OIDC                                                                                                                              |

## Sous-dossier `oidc/`

| Fichier         | Role                                           |
| --------------- | ---------------------------------------------- |
| `env.ts`        | Validation des variables d'environnement OIDC  |
| `discovery.ts`  | Resolution des endpoints OIDC de confiance     |
| `jwt.ts`        | Decode/validation locale du JWT utile a l'app  |
| `cookies.ts`    | Ecriture et suppression des cookies d'auth     |
| `session.ts`    | Signature et verification de la session signee |
| `tokens.ts`     | Echange et refresh de tokens                   |
| `navigation.ts` | Sanitize du `next`/redirect cible              |
| `types.ts`      | Types et constantes du domaine auth            |

## Regles produit

- `super_admin` n'utilise pas le webapp et est redirige vers le login.
- Les composants n'accedent jamais directement au bearer token.
- Les refreshs sont faits cote serveur ou via `/auth/session`.
- Les parseurs JWT et la session signee n'acceptent plus que les claims top-level canoniques `sub`, `email`, `role`, `organization_id` et `site_id` pour les roles scopes.
- Les aliases legacy (`preferred_username`, `org_id`, `organizationId`, `siteId`, `site_ids`, `roles`, `groups`, `realm_access`, `resource_access`, `app_metadata`) sont rejetes explicitement.
- `jwt.ts` expose aussi un diagnostic de claim minimal pour remonter un `token_reason` explorable quand le callback finit en `auth_claims_invalid`, sans journaliser le bearer token.
- Hors developpement, le rate limit auth doit avoir un store distribue et un `AUTH_RATE_LIMIT_KEY_SALT` explicites; aucune degradation implicite vers un mode local plus faible n'est acceptee.
- Le middleware fail-close pour tout chemin app inconnu: seuls les paths declares dans `route-policy.ts` sont traites comme surface webapp valide.
- Les prefixes `/auth/*` et `/api/*` restent des frontieres speciales et ne sont pas bloques par la policy des pages app.
- `Sec-Fetch-Site: none` n'est jamais accepte par defaut sur les routes JSON cookie-authentifiees; un handler doit l'ouvrir explicitement pour une navigation de confiance comme `/auth/logout`.
- En production, `AUTH_APP_ORIGIN` ou `NEXT_PUBLIC_APP_ORIGIN` doit etre defini explicitement pour les redirects OIDC; aucun fallback implicite vers `request.nextUrl.origin` n'est accepte.
- Si `AUTH_APP_ORIGIN` et `NEXT_PUBLIC_APP_ORIGIN` sont tous deux definis, ils doivent etre strictement identiques et representer une origine nue sans path, query, fragment ni credentials.

## Tests

- Les tests sont regroupes dans `__tests__/` et couvrent middleware, origin, OIDC, session, rate limit et helpers client/serveur.
