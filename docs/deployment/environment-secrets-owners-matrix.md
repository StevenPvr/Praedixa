# Environment, Secrets and Ownership Matrix

## Objectif

Donner une source unique pour:

- les surfaces deployees par environnement;
- les variables runtime et secrets attendus;
- les owners et co-reviews minimaux;
- le chemin standard de release, smoke et evidence.

## Regles

- Le chemin de release standard est `release:build` -> `release:manifest:create` -> `release:deploy` / `release:promote`. Les wrappers `scw:deploy:*` ne sont pas le chemin normal de release build-ready.
- `docs/deployment/runtime-secrets-inventory.json` est la source de verite machine-readable des secrets runtime attendus; cette matrice reste le resume humain qui doit lui rester strictement aligne.
- Les secrets runtime containers sont synchronises dans Scaleway Secret Manager sous `/praedixa/<env>/<container>/runtime` avant application au container.
- Les scripts `scw-configure-*` serialisent maintenant les JSON temporaires depuis l'environnement du process; aucune valeur secrete ne doit passer dans `argv`.
- Pour `webapp` et `admin`, `AUTH_APP_ORIGIN` est la source de verite runtime des redirects OIDC et des controles same-origin; si `NEXT_PUBLIC_APP_ORIGIN` est expose, il doit rester strictement egal a `AUTH_APP_ORIGIN`.
- Aucun secret live n'apparait dans ce document; seule la cle, le path canonique et l'owner sont documentes.
- L'owner principal du service pilote le changement; `Infra/DevOps` tient le process de deploy et de reprise.

## Surface matrix

| Surface           | URL canonique                                                      | Namespace / container                 | Configure script                         | Release path standard                                                                  | Env set    | Secret set | Secret path prefix                          | Owner principal | Co-review minimum                                     | Smoke post-deploy                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------- | ---------- | ---------- | ------------------------------------------- | --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| `landing-staging` | URL temporaire explicite seulement                                 | `landing-staging` / `landing-staging` | `pnpm run scw:configure:landing:staging` | `release:build` + manifest + `release:deploy --env staging`                            | `L-ENV`    | `L-SEC`    | `/praedixa/staging/landing-staging/runtime` | Front marketing | Infra/DevOps, Security review pour secrets formulaire | `./scripts/scw-post-deploy-smoke.sh --env staging --services landing --landing-url <url>` ; l'URL effective doit rester sur ce host et finir sur `/fr` |
| `landing-prod`    | `https://praedixa.com` et `https://www.praedixa.com` apres cutover | `landing-prod` / `landing-web`        | `pnpm run scw:configure:landing:prod`    | `release:build` + manifest + `release:promote --to prod`                               | `L-ENV`    | `L-SEC`    | `/praedixa/prod/landing-web/runtime`        | Front marketing | Infra/DevOps, Security review pour secrets formulaire | `./scripts/scw-post-deploy-smoke.sh --env prod --services landing [--landing-url https://praedixa.com                                                  | https://www.praedixa.com]` |
| `webapp-staging`  | `https://staging-app.praedixa.com`                                 | `webapp-staging` / `webapp-staging`   | `pnpm run scw:configure:webapp:staging`  | `release:build` + manifest + `release:deploy --env staging`                            | `F-ENV`    | `F-SEC`    | `/praedixa/staging/webapp-staging/runtime`  | Front produit   | Platform TS, Infra/DevOps                             | `./scripts/scw-post-deploy-smoke.sh --env staging --services webapp`                                                                                   |
| `webapp-prod`     | `https://app.praedixa.com`                                         | `webapp-prod` / `webapp-prod`         | `pnpm run scw:configure:webapp:prod`     | `release:build` + manifest + `release:promote --to prod`                               | `F-ENV`    | `F-SEC`    | `/praedixa/prod/webapp-prod/runtime`        | Front produit   | Platform TS, Infra/DevOps                             | `./scripts/scw-post-deploy-smoke.sh --env prod --services webapp,auth`                                                                                 |
| `admin-staging`   | `https://staging-admin.praedixa.com`                               | `admin-staging` / `admin-staging`     | `pnpm run scw:configure:admin:staging`   | `release:build` + manifest + `release:deploy --env staging`                            | `F-ENV`    | `F-SEC`    | `/praedixa/staging/admin-staging/runtime`   | Front admin     | Platform TS, Security review, Infra/DevOps            | `./scripts/scw-post-deploy-smoke.sh --env staging --services admin` puis `pnpm test:e2e:smoke` si UI auth/admin touchee                                |
| `admin-prod`      | `https://admin.praedixa.com`                                       | `admin-prod` / `admin-prod`           | `pnpm run scw:configure:admin:prod`      | `release:build` + manifest + `release:promote --to prod`                               | `F-ENV`    | `F-SEC`    | `/praedixa/prod/admin-prod/runtime`         | Front admin     | Platform TS, Security review, Infra/DevOps            | `./scripts/scw-post-deploy-smoke.sh --env prod --services admin,auth` puis `pnpm test:e2e:smoke` si UI auth/admin touchee                              |
| `api-staging`     | `https://staging-api.praedixa.com`                                 | `api-staging` / `api-staging`         | `pnpm run scw:configure:api:staging`     | `release:build` + manifest + `release:deploy --env staging`                            | `API-ENV`  | `API-SEC`  | `/praedixa/staging/api-staging/runtime`     | Platform TS     | Integrations si appel sortant, Infra/DevOps           | `./scripts/scw-post-deploy-smoke.sh --env staging --services api`                                                                                      |
| `api-prod`        | `https://api.praedixa.com`                                         | `api-prod` / `api-prod`               | `pnpm run scw:configure:api:prod`        | `release:build` + manifest + `release:promote --to prod`                               | `API-ENV`  | `API-SEC`  | `/praedixa/prod/api-prod/runtime`           | Platform TS     | Integrations si appel sortant, Infra/DevOps           | `./scripts/scw-post-deploy-smoke.sh --env prod --services api`                                                                                         |
| `auth-prod`       | `https://auth.praedixa.com`                                        | `auth-prod` / `auth-prod`             | `pnpm run scw:configure:auth:prod`       | `release:build --service auth` + manifest + `release:promote --to prod` si auth change | `AUTH-ENV` | `AUTH-SEC` | `/praedixa/prod/auth-prod/runtime`          | Infra/DevOps    | Security review, Platform TS                          | `./scripts/scw-post-deploy-smoke.sh --env prod --services auth`                                                                                        |

## Variable and secret sets

| Set        | Contenu                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `L-ENV`    | `CONTACT_API_BASE_URL`, `LANDING_TRUST_PROXY_IP_HEADERS`, `LANDING_SECURITY_KEY_PREFIX`, `LANDING_SECURITY_REDIS_CONNECT_TIMEOUT_MS`, `LANDING_SECURITY_REDIS_COMMAND_TIMEOUT_MS`, plus `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL`, `ALLOWED_FORM_ORIGINS`, `NEXT_PUBLIC_GA_MEASUREMENT_ID` si utilises                                                                     |
| `L-SEC`    | `CONTACT_API_INGEST_TOKEN`, `RESEND_API_KEY`, `RATE_LIMIT_STORAGE_URI`, `CONTACT_FORM_CHALLENGE_SECRET`                                                                                                                                                                                                                                                                       |
| `F-ENV`    | `NEXT_PUBLIC_API_URL`, `AUTH_OIDC_ISSUER_URL`, `AUTH_OIDC_CLIENT_ID`, `AUTH_OIDC_SCOPE`, `AUTH_APP_ORIGIN`, `NEXT_PUBLIC_APP_ORIGIN` (miroir strict de `AUTH_APP_ORIGIN`), `AUTH_TRUST_X_FORWARDED_FOR`, `AUTH_RATE_LIMIT_KEY_PREFIX`, `AUTH_RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS`, `AUTH_RATE_LIMIT_REDIS_COMMAND_TIMEOUT_MS`, et `AUTH_ADMIN_REQUIRED_AMR` pour `admin-prod` |
| `F-SEC`    | `AUTH_SESSION_SECRET`, `AUTH_RATE_LIMIT_REDIS_URL`, `AUTH_RATE_LIMIT_KEY_SALT`, `AUTH_OIDC_CLIENT_SECRET` si le client OIDC est confidentiel                                                                                                                                                                                                                                  |
| `API-ENV`  | `ENVIRONMENT`, `DEBUG=false`, `LOG_LEVEL`, `KEY_PROVIDER=scaleway`, `AUTH_JWKS_URL`, `AUTH_ISSUER_URL`, `AUTH_AUDIENCE`, `AUTH_ALLOWED_JWKS_HOSTS`, `CORS_ORIGINS`, `SCW_DEFAULT_PROJECT_ID`                                                                                                                                                                                  |
| `API-SEC`  | `DATABASE_URL`, `RATE_LIMIT_STORAGE_URI`, `CONTACT_API_INGEST_TOKEN`, `SCW_SECRET_KEY`                                                                                                                                                                                                                                                                                        |
| `AUTH-ENV` | `KC_DB=postgres`, `KC_DB_URL_HOST`, `KC_DB_URL_PORT`, `KC_DB_URL_DATABASE`, `KC_DB_USERNAME`, `KC_HEALTH_ENABLED`, `KC_METRICS_ENABLED`, `KC_LOG_LEVEL`, `KC_PROXY_HEADERS`, `KC_HTTP_ENABLED`, `KC_HOSTNAME`, `KC_BOOTSTRAP_ADMIN_USERNAME`                                                                                                                                  |
| `AUTH-SEC` | `KC_DB_PASSWORD`, `KC_BOOTSTRAP_ADMIN_PASSWORD`                                                                                                                                                                                                                                                                                                                               |

Note auth staging:

- la baseline staging ne valide plus `auth` via `auth.praedixa.com`;
- si un host auth staging dedie existe, lancer `./scripts/scw-post-deploy-smoke.sh --env staging --services auth --auth-url https://<staging-auth-origin>`;
- le smoke staging refuse explicitement `auth.praedixa.com` pour eviter un faux vert couple a la prod.

Note connectors:

- le smoke connectors existe maintenant via `./scripts/scw-post-deploy-smoke.sh --env <env> --services connectors [--connectors-url <url>]`;
- en staging, `--connectors-url` est obligatoire tant qu'aucun host canonique n'est versionne dans cette matrice;
- en prod, le host canonique attendu est `https://connectors.praedixa.com`;
- le smoke staging refuse explicitement `connectors.praedixa.com` pour eviter un faux vert couple a la prod.

## Owners and evidence cadence

| Sujet                | Accountable                     | Responsible                | Evidence minimale                                                                                  |
| -------------------- | ------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
| Release and rollback | Infra/DevOps                    | owner du service touche    | manifest signe, gate report signe, smoke staging/prod, lien dashboards                             |
| Secrets runtime      | owner du service + Infra/DevOps | Infra/DevOps               | path secret manager, date rotation, verification preflight                                         |
| Backup/restore drill | CTO                             | Ops/Product + Infra/DevOps | template `docs/security/compliance-pack/10-bcp-dr-test-template.md` complete + lien evidence index |
| Owner mapping        | owner du service                | owner du service           | `docs/architecture/ownership-matrix.md` a jour si la frontiere change                              |

## Verification rapide

Avant une release ou un audit:

```bash
node ./scripts/validate-runtime-secret-inventory.mjs
./scripts/scw-preflight-deploy.sh staging
./scripts/scw-preflight-deploy.sh prod
./scripts/scw-post-deploy-smoke.sh --env staging --services api,webapp,admin
./scripts/scw-post-deploy-smoke.sh --env prod --services api,webapp,admin,auth
./scripts/validate-synthetic-monitoring-baseline.mjs
```

Ajouter `landing` uniquement si l'URL cible est explicitement connue et verifiee. Ajouter `auth` ou `connectors` en staging uniquement avec `--auth-url` / `--connectors-url` sur un host dedie non prod.
