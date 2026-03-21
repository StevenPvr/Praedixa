# app-webapp -- Workspace client Praedixa

Application Next.js du workspace client. Elle expose un shell authentifie simple autour de 5 pages metier, un login OIDC, un BFF same-origin vers l'API Praedixa et quelques hooks de fetch browser-aware.

**Stack** : Next.js 16 / React 19 / OIDC PKCE / Tailwind CSS
**Port** : `3001`
**Package** : `@praedixa/webapp`

## README locaux utiles

| Zone                 | README                   |
| -------------------- | ------------------------ |
| App Router           | `app/README.md`          |
| Routes authentifiees | `app/(app)/README.md`    |
| UI login             | `app/(auth)/README.md`   |
| Route handlers auth  | `app/auth/README.md`     |
| BFF same-origin      | `app/api/README.md`      |
| Composants           | `components/README.md`   |
| Hooks                | `hooks/README.md`        |
| Auth                 | `lib/auth/README.md`     |
| Securite             | `lib/security/README.md` |

## Demarrage local

```bash
pnpm install
pnpm dev:api
pnpm dev:webapp
```

Le webapp attend une API Praedixa disponible sur `NEXT_PUBLIC_API_URL`.

## Variables d'environnement utiles

| Variable                                                | Statut                                      | Role                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`                                   | requise                                     | URL publique de l'API backend ou de la pile sandbox externe; HTTPS requis hors local, jamais loopback en staging/prod |
| `AUTH_APP_ORIGIN`                                       | recommandee en local, requise en production | origin publique pour les redirects OIDC et les controles same-origin                                                  |
| `NEXT_PUBLIC_APP_ORIGIN`                                | recommandee en local, requise en production | miroir public de l'origin webapp cote navigateur; meme valeur HTTPS que `AUTH_APP_ORIGIN` en staging/prod             |
| `AUTH_ADMIN_APP_ORIGIN`                                 | optionnelle                                 | override serveur de l'origin admin ciblee quand un `super_admin` doit etre reoriente depuis le webapp                 |
| `NEXT_PUBLIC_ADMIN_APP_ORIGIN`                          | optionnelle                                 | miroir public de l'origin admin; doit matcher `AUTH_ADMIN_APP_ORIGIN` si les deux sont renseignes                     |
| `AUTH_OIDC_ISSUER_URL`                                  | requise                                     | issuer OIDC                                                                                                           |
| `AUTH_OIDC_CLIENT_ID`                                   | requise                                     | client OIDC du webapp                                                                                                 |
| `AUTH_OIDC_CLIENT_SECRET`                               | optionnelle                                 | secret OIDC si client confidentiel                                                                                    |
| `AUTH_OIDC_SCOPE`                                       | optionnelle                                 | scope OIDC                                                                                                            |
| `AUTH_SESSION_SECRET`                                   | requise                                     | secret de signature de session                                                                                        |
| `AUTH_TRUST_X_FORWARDED_FOR`                            | optionnelle                                 | active la confiance proxy pour l'isolement IP du rate limit                                                           |
| `AUTH_RATE_LIMIT_REDIS_URL` ou `RATE_LIMIT_STORAGE_URI` | requise hors developpement                  | store distribue du rate limit auth                                                                                    |
| `AUTH_RATE_LIMIT_KEY_SALT`                              | requise hors developpement                  | salt explicite de pseudonymisation des cles de rate limit                                                             |
| `AUTH_RATE_LIMIT_KEY_PREFIX`                            | optionnelle                                 | prefix Redis du rate limit auth                                                                                       |
| `AUTH_RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS`              | optionnelle                                 | timeout connexion Redis                                                                                               |
| `AUTH_RATE_LIMIT_REDIS_COMMAND_TIMEOUT_MS`              | optionnelle                                 | timeout commande Redis                                                                                                |
| `API_PROXY_MAX_BODY_BYTES`                              | optionnelle                                 | taille max acceptee par le proxy `/api/v1/*`                                                                          |

## Image et deploiement Scaleway

Le chemin container de production passe par `app-webapp/Dockerfile.scaleway`.

- le build Docker cible `linux/amd64` sur une base glibc `node:22-bookworm-slim`
- le builder purge d'abord tous les `*.tsbuildinfo`, puis fait un `pnpm install --frozen-lockfile` propre sur le workspace complet apres `COPY . .`, au lieu de restaurer un `node_modules` racine partiel ou de reutiliser un cache TypeScript incremental sans `dist/`
- l'image finale ne garde que `app-webapp/.next/standalone`, `app-webapp/.next/static` et `app-webapp/public`
- le dossier `app-webapp/public/` reste versionne meme s'il est vide, pour que le chemin standalone Docker reste stable quand aucun asset public n'est encore embarque
- le runtime demarre via `node server.js` sur `0.0.0.0:8080`
- le healthcheck conteneur sonde `/login`, qui reste une route publique et ne depend pas d'une session active

Contrat runtime a respecter pour staging/prod:

- `AUTH_APP_ORIGIN` et `NEXT_PUBLIC_APP_ORIGIN` doivent etre renseignes avec l'origin HTTPS publique reelle du webapp
- pour le handoff `super_admin`, le webapp derive par defaut l'origine admin canonique (`app` -> `admin`, `staging-app` -> `staging-admin`, local `3001` -> `3002`); `AUTH_ADMIN_APP_ORIGIN`/`NEXT_PUBLIC_ADMIN_APP_ORIGIN` permettent de surcharger ce mapping si besoin
- `NEXT_PUBLIC_API_URL` doit pointer vers une API HTTPS reachable depuis l'exterieur; pour une boucle complete avec CRM/Salesforce sandbox, on pointe vers la pile sandbox cible, pas vers `localhost`
- `AUTH_RATE_LIMIT_REDIS_URL` et `AUTH_RATE_LIMIT_KEY_SALT` restent obligatoires hors developpement

Verification locale recommandee avant release image:

```bash
pnpm --dir app-webapp build
docker buildx build --platform linux/amd64 --file app-webapp/Dockerfile.scaleway .
```

`app-webapp/open-next.config.ts` reste reserve au chemin OpenNext/Cloudflare (`pnpm --dir app-webapp preview|deploy`). Le deploiement Scaleway Containers repose sur `next.config.ts` avec `output: "standalone"` et n'utilise pas `.open-next`.

## Routes reelles

La source de verite des chemins supportes par le middleware vit dans [`lib/auth/route-policy.ts`](./lib/auth/route-policy.ts).

| Surface             | Chemins presents                                                    |
| ------------------- | ------------------------------------------------------------------- |
| Entree              | `/` -> redirect vers `/dashboard`                                   |
| Pages authentifiees | `/dashboard`, `/previsions`, `/actions`, `/messages`, `/parametres` |
| UI publique         | `/login`                                                            |
| Handlers auth       | `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/session`    |
| BFF                 | `/api/v1/[...path]`                                                 |

## Patterns reels du shell

- `app/(app)/layout.tsx` ne contient pas de logique metier: il monte `AppShell`.
- `AppShell` porte la sidebar, les breadcrumbs simples, le profil/logout, l'i18n client et le `SiteScopeProvider`.
- Les roles `manager` et `hr_manager` ont un site verrouille via le shell; les autres roles n'ont pas de selection de site imposee par `AppShell`.
- Le root layout monte `RuntimeErrorShield` et le skip-link `#main-content`.

## Fetch, auth et etats de reauth

- Le navigateur ne parle pas directement a l'API cible: `useApiGet`, `useApiGetPaginated`, `useApiPost` et `useApiPatch` passent par le BFF same-origin `/api/v1/*`.
- `useApiGet` remet `data` a `null` si l'URL devient `null`.
- Les hooks GET supportent `pollInterval`, annulent les requetes obsoletes et auto-retry sur `408`, `429` et `5xx` hors polling.
- Un `401` non silencieux force une reauth via `/login?reauth=1&reason=api_unauthorized...`.
- `/auth/session` est no-store, same-origin only, renvoie `429` en cas de rate limit et `401` si la session ne peut pas etre resolue.
- Hors developpement, le rate limit auth est fail-close: pas de Redis distribue ou pas de `AUTH_RATE_LIMIT_KEY_SALT` => refus explicite, pas de fallback memoire.

## Etats degrades documentes par le code

- `dashboard` delegue a `WarRoomDashboard`; son comportement detaille vit surtout dans les composants `components/dashboard/*`.
- `previsions` affiche une banniere inline avec bouton `Reessayer`, un etat "Aucun horizon actif configure", un etat "Aucune prevision disponible" et un etat "Aucune alerte active".
- `actions` garde deux onglets (`A traiter`, `Historique`) et affiche les erreurs d'alertes, de workspace ou d'historique en inline plutot qu'avec un fallback global.
- `messages` affiche un bandeau `error-fallback`, un etat "Selectionnez une conversation" et masque la saisie tant qu'aucune conversation n'est selectionnee.
- `parametres` desactive le selecteur de langue quand la synchronisation des preferences est `loading`, `saving` ou `unavailable`, puis expose l'erreur inline si besoin.
