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
| `pnpm release:build -- --service landing ...` | Build/push image landing immuable par digest           |
| `pnpm release:manifest:create -- ...`   | Cree un manifest signe pour la release landing                |
| `pnpm release:deploy -- --manifest ... --env <staging|prod>` | Deploie landing par digest depuis un manifest signe |
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

4. Deployer quand valide via runner immuable:

```bash
pnpm release:build -- --service landing --ref <git-ref> --tag <tag> --registry-prefix <registry>
pnpm release:manifest:create -- --ref <git-ref> --output /tmp/landing-manifest.json --image "landing=<registry-image@sha256>"
pnpm release:deploy -- --manifest /tmp/landing-manifest.json --env staging
pnpm run scw:deploy:api:staging
pnpm run scw:deploy:webapp:staging
pnpm run scw:deploy:admin:staging
pnpm release:deploy -- --manifest /tmp/landing-manifest.json --env prod
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
- `RATE_LIMIT_STORAGE_URI`
- `CONTACT_FORM_CHALLENGE_SECRET`

Variables optionnelles:

- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO_EMAIL`
- `ALLOWED_FORM_ORIGINS`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `LANDING_TRUST_PROXY_IP_HEADERS` (`0` ou `1`, defaut: `1`)
- `LANDING_SECURITY_KEY_PREFIX` (defaut: `prx:landing:sec`)
- `LANDING_SECURITY_REDIS_CONNECT_TIMEOUT_MS` (defaut: `300`)
- `LANDING_SECURITY_REDIS_COMMAND_TIMEOUT_MS` (defaut: `300`)

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

### Mot de passe admin Keycloak: source de verite et rotation

Le vrai mot de passe admin Keycloak ne doit jamais etre committe dans le repo.
La source de verite canonique est le secret Scaleway:

- chemin: `/praedixa/prod/auth-prod/runtime`
- nom: `KC_BOOTSTRAP_ADMIN_PASSWORD`
- utilisateur admin par defaut: `kcadmin`

Pour reinitialiser proprement le mot de passe admin et resynchroniser le secret canonique:

```bash
NEW_KEYCLOAK_ADMIN_PASSWORD='<nouveau-mot-de-passe-fort>' \
pnpm auth:keycloak:reset-admin-password
```

Comportement:

- le script lit le mot de passe actuel depuis Scaleway Secret Manager si `CURRENT_KEYCLOAK_ADMIN_PASSWORD` n'est pas fourni
- il change le mot de passe du compte admin Keycloak via `kcadm`
- il met a jour la version active du secret `KC_BOOTSTRAP_ADMIN_PASSWORD`

Regles:

- ne jamais ecrire le vrai mot de passe dans `docs/`, `README.md`, `.env.example` ou un script versionne
- si vous devez partager l'acces, partagez le chemin du secret, jamais sa valeur
- apres rotation, utilisez toujours la valeur du Secret Manager comme reference unique

### Garantir le contrat de claims pour `webapp` / `admin`

Pour que l'API accepte les tokens OIDC, les clients `praedixa-webapp` et `praedixa-admin`
doivent emettre:

- l'audience `praedixa-api`
- le claim `organization_id`
- le claim `site_id` pour les roles scopes par site

Script idempotent fourni:

```bash
KEYCLOAK_ADMIN_PASSWORD='<mot-de-passe-admin-keycloak>' \
TARGET_USER_EMAIL='ops.client@praedixa.com' \
TARGET_ORGANIZATION_ID='<uuid-org>' \
TARGET_SITE_ID='site-lyon' \
pnpm auth:keycloak:ensure-api-contract
```

Notes:

- `TARGET_SITE_ID` peut etre omis pour `org_admin` et `super_admin`.
- Le script configure les protocol mappers sur `praedixa-webapp` et `praedixa-admin`.
- Si un utilisateur cible est fourni, il met aussi a jour ses attributs Keycloak `organization_id` et `site_id`.
- Un simple redeploiement du container auth n'importe pas automatiquement le realm existant; pour un realm deja cree, appliquez explicitement ce script ou un import Keycloak admin equivalent.

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

Pour la landing, aucun override local n'est accepte en staging/prod: le chemin supporte est uniquement le release runner avec images par digest.

## Runbook associe

- `docs/runbooks/scaleway-frontends-100-fr.md`
