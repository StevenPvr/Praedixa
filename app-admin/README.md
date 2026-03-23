# app-admin -- Console super-admin Praedixa

Application Next.js du back-office Praedixa. Elle expose une console authentifiee par OIDC, un workspace multi-tenant par organisation, un BFF same-origin et un shell pilote par une registry de permissions.

**Stack** : Next.js 16 / React 19 / OIDC PKCE / Tailwind CSS v4
**Port** : `3002`
**Package** : `@praedixa/admin`

## README locaux utiles

| Zone                 | README                          |
| -------------------- | ------------------------------- |
| App Router           | `app/README.md`                 |
| Console authentifiee | `app/(admin)/README.md`         |
| Workspace client     | `app/(admin)/clients/README.md` |
| UI login             | `app/(auth)/README.md`          |
| Handlers auth        | `app/auth/README.md`            |
| BFF admin            | `app/api/README.md`             |
| Composants           | `components/README.md`          |
| Auth / permissions   | `lib/auth/README.md`            |
| Securite             | `lib/security/README.md`        |

## Demarrage local

```bash
pnpm install
pnpm dev:auth
pnpm dev:api
pnpm dev:admin
```

`pnpm dev:api`, `pnpm dev:auth` et `pnpm dev:admin` restent maintenant attaches au terminal local pour afficher les logs runtime en direct. Si un mode background est prefere, utiliser `pnpm dev:api:bg`, `pnpm dev:auth:bg` ou `pnpm dev:admin:bg`, puis `pnpm dev:api:logs`, `pnpm dev:auth:logs` ou `pnpm dev:admin:logs`.

En local, `app-admin/.env.local` pointe maintenant par defaut sur l'issuer `http://localhost:8081/realms/praedixa`, pas sur `https://auth.praedixa.com`. Redemarrer `pnpm dev:admin` apres tout changement de `.env.local`.
Le `next.config.ts` admin autorise maintenant aussi les IPv4 locales detectees du poste dans `allowedDevOrigins`; un acces via l'IP LAN (`http://10.x.x.x:3002`) ne doit plus casser `/_next/*`.

Un utilisateur OIDC `super_admin` avec `admin:console:access` et les permissions de page/admin associees est requis pour les flux reels. `admin:console:access` seul ne suffit pas a ouvrir `/`.

## Variables d'environnement utiles

| Variable                                                | Statut                                      | Role                                                  |
| ------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`                                   | requise                                     | URL de l'API backend                                  |
| `AUTH_APP_ORIGIN`                                       | recommandee en local, requise en production | origin publique du back-office                        |
| `AUTH_OIDC_ISSUER_URL`                                  | requise                                     | issuer OIDC                                           |
| `AUTH_OIDC_CLIENT_ID`                                   | requise                                     | client OIDC admin                                     |
| `AUTH_OIDC_CLIENT_SECRET`                               | optionnelle                                 | secret OIDC si client confidentiel                    |
| `AUTH_OIDC_SCOPE`                                       | optionnelle                                 | scope OIDC                                            |
| `AUTH_SESSION_SECRET`                                   | requise                                     | secret de signature de session                        |
| `AUTH_TRUST_X_FORWARDED_FOR`                            | optionnelle                                 | confiance proxy pour le rate limit auth               |
| `AUTH_RATE_LIMIT_REDIS_URL` ou `RATE_LIMIT_STORAGE_URI` | requise hors developpement                  | store distribue du rate limit auth                    |
| `AUTH_RATE_LIMIT_KEY_SALT`                              | requise hors developpement                  | salt explicite de pseudonymisation des cles auth      |
| `AUTH_RATE_LIMIT_KEY_PREFIX`                            | optionnelle                                 | prefix Redis auth                                     |
| `AUTH_RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS`              | optionnelle                                 | timeout connexion Redis                               |
| `AUTH_RATE_LIMIT_REDIS_COMMAND_TIMEOUT_MS`              | optionnelle                                 | timeout commande Redis                                |
| `AUTH_ADMIN_REQUIRED_AMR`                               | requise en production admin                 | preuves MFA (`amr`) exigees avant session super-admin |

## Proxy & CSP

- `proxy.ts` porte le nonce CSP par requete et doit garder un `matcher` exporte comme chaine statique Next-compatible; ne pas reintroduire de `String.raw` ou autre expression non litterale dans `config.matcher`.

## Tailwind v4

- `app/globals.css` pilote maintenant Tailwind en mode CSS-first via `@import "tailwindcss"` en premier, puis `@import "@praedixa/ui/tailwind-theme.css"` et enfin `@theme inline`.
- Le socle de tokens partages vient de `@praedixa/ui/tailwind-theme.css`; les alias admin specifiques (`sidebar`, `plan`, `shadow-soft`, `h-topbar`, etc.) restent declares localement dans `app/globals.css`.
- `postcss.config.mjs` doit utiliser `@tailwindcss/postcss`; ne pas reintroduire `tailwind.config.js`, le preset JS historique ou `autoprefixer` pour cette app.

## Routes reelles

| Surface       | Chemins presents                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Console       | `/`, `/clients`, `/clients/[orgId]/*`, `/demandes-contact`, `/journal`, `/parametres`, `/coverage-harness`, `/unauthorized` |
| UI login      | `/login`                                                                                                                    |
| Handlers auth | `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/session`                                                            |
| BFF           | `/api/v1/[...path]`                                                                                                         |

## Patterns de shell, permissions et etats degrades

- Le shell authentifie vit dans `components/admin-shell.tsx`.
- Les items de sidebar, la palette de commandes et les verifications de rendu s'alignent sur `lib/auth/admin-route-policies.ts`.
- Pendant le chargement des permissions, le shell affiche `Verification des permissions en cours...`.
- Si la page demandee a une policy explicite mais que l'utilisateur ne la satisfait pas, le shell rend un panneau `Acces restreint` au lieu du contenu.
- `/auth/session` est same-origin only, no-store, renvoie `429` quand le rate limit refuse et `401` si la session ne peut pas etre resolue.
- Hors developpement, le rate limit auth admin est fail-close: pas de store distribue ou pas de `AUTH_RATE_LIMIT_KEY_SALT` => refus explicite.
