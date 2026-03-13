# app-admin -- Console super-admin Praedixa

Application Next.js du back-office Praedixa. Elle expose une console authentifiee par OIDC, un workspace multi-tenant par organisation, un BFF same-origin et un shell pilote par une registry de permissions.

**Stack** : Next.js 16 / React 19 / OIDC PKCE / Tailwind CSS
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
pnpm dev:api
pnpm dev:admin
```

Un utilisateur OIDC avec acces `super_admin` / `admin:console:access` est requis pour les flux reels.

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
