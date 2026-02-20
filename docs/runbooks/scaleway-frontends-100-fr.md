# Runbook - Migration plateforme 100% Scaleway (FR)

Date de reference: 2026-02-19

## Objectif

Mettre `landing`, `webapp`, `admin`, `api`, `auth` sur une infrastructure FR-only (Scaleway), avec deux environnements (`staging` / `production`) et une bascule DNS progressive sans coupure.

## Etat actuel valide

### 1. Compute (Scaleway Serverless Containers - fr-par)

Namespaces provisionnes:

- `landing-prod`
- `webapp-staging`, `webapp-prod`
- `admin-staging`, `admin-prod`
- `api-staging`, `api-prod`
- `auth-prod`

Containers:

- `webapp-staging`, `webapp-prod`
- `admin-staging`, `admin-prod`
- `api-staging`, `api-prod`
- `auth-prod` (Keycloak, `ready`)

Notes:

- `webapp/admin/api` sont provisionnes mais en `error` tant qu'aucune image applicative n'est deployee (etat attendu).
- `landing-prod` est provisionne sur Scaleway; la bascule publique de `praedixa.com`/`www` reste en attente du transfert domaine.

### 2. Data plane FR

### RDB (PostgreSQL)

- `praedixa-api-staging` (ready)
- `praedixa-api-prod` (ready)

### Redis (rate limit)

- `praedixa-rl-staging` (ready)
- `praedixa-rl-prod` (ready)

### Object Storage prive

- `praedixa-stg-client-files-fr-14b3676c`
- `praedixa-prd-client-files-fr-14b3676c`
- `praedixa-stg-client-exports-fr-14b3676c`
- `praedixa-prd-client-exports-fr-14b3676c`
- `praedixa-stg-model-artifacts-fr-14b3676c`
- `praedixa-prd-model-artifacts-fr-14b3676c`
- `praedixa-stg-model-inference-fr-14b3676c`
- `praedixa-prd-model-inference-fr-14b3676c`

### 3. Auth OIDC (FR)

- Keycloak deployee sur `auth-prod` (Scaleway).
- Domaine OIDC: `auth.praedixa.com`.
- Realm: `praedixa`.
- Clients provisionnes: `praedixa-webapp`, `praedixa-admin`, `praedixa-api`.
- Roles standards: `super_admin`, `org_admin`, `hr_manager`, `manager`, `employee`, `viewer`.

### 4. DNS et domaine (mode transitoire)

Etat actuel:

- NS publics du domaine `praedixa.com`: Cloudflare (`ali/chuck.ns.cloudflare.com`).
- Zone Scaleway `praedixa.com` existe et est active (non autoritative publiquement tant que NS non transferes).

Records publics deja pointes vers Scaleway:

- `auth.praedixa.com`
- `app.praedixa.com`
- `admin.praedixa.com`
- `api.praedixa.com`
- `staging-app.praedixa.com`
- `staging-admin.praedixa.com`
- `staging-api.praedixa.com`

Landing racine:

- `praedixa.com` et `www.praedixa.com` sont prepares cote Scaleway, avec cutover public reporte tant que le transfert domaine/delegation n'est pas finalise.

### 5. Verification infra

Commande:

```bash
pnpm run scw:preflight:deploy
pnpm run scw:preflight:staging
```

Resultat actuel:

- `PASS` avec warnings attendus: delegation NS encore Cloudflare (`DNS_DELEGATION_MODE=transitional`), images applicatives non deployees, et env landing a finaliser.
- Tous les checks critiques staging/prod/auth/data-plane sont `ok`; warning(s) residuels attendus tant qu'aucune image n'est deployee.

## Commandes operationnelles

### Provisioning

```bash
pnpm run scw:bootstrap:frontends
pnpm run scw:bootstrap:api
```

### Configuration runtime

```bash
pnpm run scw:configure:landing:prod
pnpm run scw:configure:webapp:staging
pnpm run scw:configure:webapp:prod
pnpm run scw:configure:admin:staging
pnpm run scw:configure:admin:prod
pnpm run scw:configure:api:staging
pnpm run scw:configure:api:prod
```

### Deploy (quand valide)

```bash
pnpm run scw:deploy:landing:prod
pnpm run scw:deploy:api:staging
pnpm run scw:deploy:webapp:staging
pnpm run scw:deploy:admin:staging
```

### Contraintes importantes

- Les scripts `scw:deploy:*` refusent un workspace git non propre par defaut.
- Pour forcer (non recommande): `SCW_DEPLOY_ALLOW_DIRTY=1`.
- Aucun deploy staging/prod n'est lance tant que non demande explicitement.

### Reste a faire

1. Deployer les images staging (`api`, `webapp`, `admin`) apres validation fonctionnelle.
2. Deployer `landing` sur Scaleway (container `landing-web`) puis basculer `@`/`www` au moment du transfert domaine.
3. Finaliser le transfert de delegation NS vers Scaleway quand le lock registrar le permet.
4. Une fois stable, retirer les bindings Workers historiques devenus inutiles.
