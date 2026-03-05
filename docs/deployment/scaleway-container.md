# Guide de deploiement Scaleway Containers (FR-only)

Ce document decrit le deploiement cible sur Scaleway Serverless Containers pour:

- `app-landing`
- `app-webapp`
- `app-admin`
- `app-api`
- `auth` (Keycloak)

La landing est prete sur Scaleway en `staging` et `prod`; le cutover public de `praedixa.com`/`www.praedixa.com` reste en attente tant que le transfert domaine/delegation n'est pas termine.

## Etat de reference (2026-02-19)

- Region compute/data cible: `fr-par`.
- Environnements prepares: `staging` et `production`.
- Namespaces existants: `landing-staging`, `landing-prod`, `webapp-staging`, `webapp-prod`, `admin-staging`, `admin-prod`, `api-staging`, `api-prod`, `auth-prod`.
- `auth-prod` (Keycloak) est deployee et `ready`.
- Containers `landing/webapp/admin/api` sont provisionnes mais restent en `error` tant qu'aucune image n'est deployee (normal).
- Preflight staging: `pnpm run scw:preflight:staging` passe, avec warning attendu si delegation NS encore Cloudflare.
- Preflight global deploy readiness: `pnpm run scw:preflight:deploy` (sans deploy).

## Prerequis

- CLI Scaleway configuree (`scw init`, projet actif).
- `scw`, `jq`, `pnpm`, Docker disponibles localement.
- Acces DNS du domaine `praedixa.com` (mode transitoire Cloudflare ou delegation complete Scaleway).

## Scripts de reference

| Commande                                | Role                                                          |
| --------------------------------------- | ------------------------------------------------------------- |
| `pnpm run scw:bootstrap:frontends`      | Cree namespaces/containers frontends + buckets frontends      |
| `pnpm run scw:bootstrap:api`            | Cree namespaces/containers API                                |
| `pnpm run scw:configure:landing:staging` | Injecte env vars/secrets landing staging                     |
| `pnpm run scw:configure:landing:prod`   | Injecte env vars/secrets landing prod                         |
| `pnpm run scw:configure:webapp:staging` | Injecte env vars/secrets webapp staging                       |
| `pnpm run scw:configure:webapp:prod`    | Injecte env vars/secrets webapp prod                          |
| `pnpm run scw:configure:admin:staging`  | Injecte env vars/secrets admin staging                        |
| `pnpm run scw:configure:admin:prod`     | Injecte env vars/secrets admin prod                           |
| `pnpm run scw:configure:api:staging`    | Injecte env vars/secrets API staging                          |
| `pnpm run scw:configure:api:prod`       | Injecte env vars/secrets API prod                             |
| `pnpm run scw:preflight:deploy`         | Controle readiness globale staging+prod+landing (sans deploy) |
| `pnpm run scw:preflight:prod`           | Controle readiness prod+landing (sans deploy)                 |
| `pnpm run scw:preflight:staging`        | Controle readiness infra + DNS staging (sans deploy)          |
| `pnpm run scw:deploy:landing:staging`   | Build + deploy landing staging                                |
| `pnpm run scw:deploy:landing:prod`      | Build + deploy landing prod                                   |
| `pnpm run scw:deploy:webapp:staging`    | Build + deploy webapp staging                                 |
| `pnpm run scw:deploy:webapp:prod`       | Build + deploy webapp prod                                    |
| `pnpm run scw:deploy:admin:staging`     | Build + deploy admin staging                                  |
| `pnpm run scw:deploy:admin:prod`        | Build + deploy admin prod                                     |
| `pnpm run scw:deploy:api:staging`       | Build + deploy API staging                                    |
| `pnpm run scw:deploy:api:prod`          | Build + deploy API prod                                       |

## Sequence recommandee (sans surprise)

1. Provisionner (idempotent):

```bash
pnpm run scw:bootstrap:frontends
pnpm run scw:bootstrap:api
```

2. Configurer les variables runtime/secrets.

3. Verifier avant deploy:

```bash
pnpm run scw:preflight:deploy
pnpm run scw:preflight:staging
```

4. Deployer quand valide:

```bash
pnpm run scw:deploy:landing:staging
pnpm run scw:deploy:api:staging
pnpm run scw:deploy:webapp:staging
pnpm run scw:deploy:admin:staging
pnpm run scw:deploy:landing:prod
```

## Variables requises (configuration containers)

### Frontends (`scw-configure-frontend-env.sh`)

Variables shell requises:

- `NEXT_PUBLIC_API_URL`
- `AUTH_OIDC_ISSUER_URL`
- `AUTH_SESSION_SECRET`

Variables shell requises pour `webapp` uniquement (rate limit distribue):

- `AUTH_RATE_LIMIT_REDIS_URL` (ou `RATE_LIMIT_STORAGE_URI`)

Variables optionnelles:

- `AUTH_OIDC_CLIENT_ID` (defaut selon app)
- `AUTH_OIDC_SCOPE` (defaut: `openid profile email offline_access`)
- `AUTH_OIDC_CLIENT_SECRET`
- `AUTH_TRUST_X_FORWARDED_FOR` (`0` ou `1`, defaut: `0`)
- `AUTH_RATE_LIMIT_KEY_PREFIX` (defaut: `prx:auth:rl`)
- `AUTH_RATE_LIMIT_KEY_SALT` (recommande)
- `AUTH_RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS` (defaut: `300`)
- `AUTH_RATE_LIMIT_REDIS_COMMAND_TIMEOUT_MS` (defaut: `300`)

### Landing (`scw-configure-landing-env.sh`)

Variables shell requises:

- `CONTACT_API_BASE_URL`
- `CONTACT_API_INGEST_TOKEN`
- `RESEND_API_KEY`

Variables optionnelles:

- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO_EMAIL`
- `ALLOWED_FORM_ORIGINS`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

### API (`scw-configure-api-env.sh`)

Variables shell requises:

- `DATABASE_URL`
- `AUTH_JWKS_URL`
- `AUTH_ISSUER_URL`
- `AUTH_AUDIENCE`
- `AUTH_ALLOWED_JWKS_HOSTS`
- `CORS_ORIGINS`
- `RATE_LIMIT_STORAGE_URI`
- `CONTACT_API_INGEST_TOKEN`
- `SCW_SECRET_KEY`
- `SCW_DEFAULT_PROJECT_ID`

## DNS: deux modes supportes

### 1) Mode transitoire (actuel)

- Delegation NS publique: Cloudflare.
- CNAME publics pointes vers Scaleway pour:
  - `auth.praedixa.com`
  - `app.praedixa.com`
  - `admin.praedixa.com`
  - `api.praedixa.com`
  - `staging-app.praedixa.com`
  - `staging-admin.praedixa.com`
  - `staging-api.praedixa.com`
- `praedixa.com` / `www.praedixa.com` peuvent rester sur Workers pendant la transition landing.

### 2) Mode delegation complete

- Delegation NS publique vers Scaleway (`ns0.dom.scw.cloud`, `ns1.dom.scw.cloud`).
- Le preflight peut etre force en mode strict:

```bash
DNS_DELEGATION_MODE=full ./scripts/scw-preflight-staging.sh
```

## Authentification OIDC (FR)

- IdP: Keycloak self-hosted sur Scaleway (`auth-prod`).
- Realm: `praedixa`.
- Clients: `praedixa-webapp`, `praedixa-admin`, `praedixa-api`.
- Roles: `super_admin`, `org_admin`, `hr_manager`, `manager`, `employee`, `viewer`.

### Provisionner le super admin Praedixa

Script idempotent fourni:

```bash
KEYCLOAK_ADMIN_PASSWORD='<mot-de-passe-admin-keycloak>' \
SUPER_ADMIN_PASSWORD='praedixa2026!' \
SUPER_ADMIN_EMAIL='admin@praedixa.com' \
./scripts/keycloak-ensure-super-admin.sh
```

Notes:
- `KEYCLOAK_ADMIN_USERNAME` est `kcadmin` par defaut (surcharge possible en variable d'environnement).
- Le script cree le compte s'il n'existe pas, force le mot de passe et garantit le role `super_admin`.

## Stockage et data plane FR

Buckets object storage prives prepares:

- `praedixa-stg-client-files-fr-14b3676c`
- `praedixa-prd-client-files-fr-14b3676c`
- `praedixa-stg-client-exports-fr-14b3676c`
- `praedixa-prd-client-exports-fr-14b3676c`
- `praedixa-stg-model-artifacts-fr-14b3676c`
- `praedixa-prd-model-artifacts-fr-14b3676c`
- `praedixa-stg-model-inference-fr-14b3676c`
- `praedixa-prd-model-inference-fr-14b3676c`

## Garde-fous deployment

- Les scripts `scw:deploy:*` refusent un workspace git `dirty` par defaut.
- Override explicite possible uniquement si necessaire:

```bash
SCW_DEPLOY_ALLOW_DIRTY=1 pnpm run scw:deploy:api:staging
```

## Runbook associe

- `docs/runbooks/scaleway-frontends-100-fr.md`
