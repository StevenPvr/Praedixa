# `app/auth/` - Handlers auth de l'admin

Handlers Next.js server-side du flow OIDC de la console super-admin.

## Routes

| Route                   | Fichier                    | Comportement reel                                                                   |
| ----------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| `/auth/login`           | `login/route.ts`           | prepare le flow OIDC et redirige vers l'issuer                                      |
| `/auth/provider-status` | `provider-status/route.ts` | health-check no-store du provider OIDC pour eliminer les erreurs stale sur `/login` |
| `/auth/callback`        | `callback/route.ts`        | echange le `code`, cree la session admin et refuse les permissions insuffisantes    |
| `/auth/session`         | `session/route.ts`         | GET same-origin only qui renvoie l'utilisateur admin courant et ses permissions     |
| `/auth/logout`          | `logout/route.ts`          | nettoie la session et ferme le parcours                                             |

## Invariants verifies par le code

- les reponses de session renvoient `permissions` en plus du role
- le callback exige l'acces `admin:console:access`
- apres login, le callback ne conserve `next` que si la page est autorisee; sinon il bascule vers la premiere page admin accessible a la session
- en production, le callback refuse aussi tout token admin sans preuve MFA compatible avec `AUTH_ADMIN_REQUIRED_AMR`
- quand la decouverte OIDC ou la validation de l'issuer echoue, `/auth/login` garde la redirection generique `oidc_provider_untrusted` cote navigateur mais journalise maintenant la cause exacte cote serveur pour accelerer le debug ops
- `/auth/provider-status` permet a la page `/login` de verifier si un `oidc_provider_untrusted` encore present dans l'URL est devenu stale, puis de relancer une seule tentative propre sans boucle infinie
- `/auth/session` est no-store et same-origin only
- `/auth/session` et `/auth/logout` refusent aussi toute requete browser dont `Sec-Fetch-Site` annonce `cross-site` ou `same-site`, meme si un header `Origin` semble legitime
- `/auth/session` renvoie `403` sur echec CSRF, `401` si la session ne peut pas etre resolue et `429` si le rate limit refuse
- le rate limit auth est fail-close hors developpement: sans store distribue explicite ou sans `AUTH_RATE_LIMIT_KEY_SALT`, les handlers refusent
- les handlers server gardent maintenant des gardes positives explicites sur les etats `allowed` / `ok` / `csrf` pour rester lisibles et alignes avec les checks statiques du repo
