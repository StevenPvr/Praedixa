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
- Preflight staging/prod versionne: `./scripts/scw/scw-preflight-deploy.sh staging|prod`, strict par defaut sur la delegation DNS.
- Preflight global deploy readiness: `./scripts/scw/scw-preflight-deploy.sh all` (sans deploy).
- Inventaire runtime secrets versionne: `node ./scripts/validate-runtime-secret-inventory.mjs`.

## Prerequis

- CLI Scaleway configuree (`scw init`, projet actif).
- `scw`, `jq`, `pnpm`, Docker disponibles localement.
- Acces DNS du domaine `praedixa.com`; le chemin build-ready suppose une verification stricte de la delegation publique vers Scaleway. Un mode `DNS_DELEGATION_MODE=transitional` n'est autorise que comme override explicite et temporaire.

Reference complementaire a garder a cote:

- `docs/deployment/runtime-secrets-inventory.json`
- `docs/deployment/rollback-targets.json`
- `docs/deployment/environment-secrets-owners-matrix.md`

## Scripts de reference

| Commande                                                            | Role                                                                                     |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm run scw:bootstrap:frontends`                                  | Cree namespaces/containers frontends + buckets frontends                                 |
| `pnpm run scw:bootstrap:api`                                        | Cree namespaces/containers API                                                           |
| `pnpm run scw:configure:landing:staging`                            | Injecte env vars/secrets landing staging                                                 |
| `pnpm run scw:configure:landing:prod`                               | Injecte env vars/secrets landing prod                                                    |
| `pnpm run scw:configure:webapp:staging`                             | Injecte env vars/secrets webapp staging                                                  |
| `pnpm run scw:configure:webapp:prod`                                | Injecte env vars/secrets webapp prod                                                     |
| `pnpm run scw:configure:admin:staging`                              | Injecte env vars/secrets admin staging                                                   |
| `pnpm run scw:configure:admin:prod`                                 | Injecte env vars/secrets admin prod                                                      |
| `pnpm run scw:configure:api:staging`                                | Injecte env vars/secrets API staging                                                     |
| `pnpm run scw:configure:api:prod`                                   | Injecte env vars/secrets API prod                                                        |
| `./scripts/scw/scw-preflight-deploy.sh all`                         | Controle readiness globale staging+prod+landing (sans deploy)                            |
| `./scripts/scw/scw-preflight-deploy.sh prod`                        | Controle readiness prod+landing (sans deploy)                                            |
| `./scripts/scw/scw-preflight-deploy.sh staging`                     | Controle readiness infra + DNS staging (sans deploy)                                     |
| `pnpm release:build -- --service <service> ...`                     | Build/push image immuable par digest                                                     |
| `pnpm release:manifest:create -- ...`                               | Cree un manifest signe pour la release multi-service                                     |
| `pnpm release:deploy -- --manifest ... --env <env>`                 | Deploie depuis un manifest signe, avec fallback tag journalise si l'API refuse le digest |
| `./scripts/scw/scw-rollback-plan.sh --current-manifest ...`         | Selectionne et verifie le manifest precedent pour rollback                               |
| `./scripts/scw/scw-rollback-execute.sh --current-manifest ...`      | Redeploie le manifest precedent et peut enchainer le smoke                               |
| `./scripts/scw/scw-post-deploy-smoke.sh --env <env> --services ...` | Smoke CLI canonique post-deploy ou post-rollback                                         |

Regle d'exploitation:

- le chemin de release build-ready est `release:build` -> `release:manifest:create` -> `release:deploy` / `release:promote`;
- les wrappers `scw:deploy:webapp:*`, `scw:deploy:admin:*`, `scw:deploy:api:*` et `scw:deploy:auth:prod` ne sont pas le chemin de release evidencable de reference;
- `scw-release-deploy.sh` prend toujours la reference `tag@sha256` signee du manifest comme source de verite; si l'API Scaleway Container refuse encore cette syntaxe, il retombe sur le tag deja signe derive de cette meme reference et journalise explicitement ce fallback fournisseur;
- les scripts `scw:configure:*` synchronisent maintenant aussi les secrets runtime vers Scaleway Secret Manager sous `/praedixa/<env>/<container>/runtime`.
- `scw-preflight-deploy.sh` valide d'abord l'inventaire machine-readable `runtime-secrets-inventory.json`, puis controle sur les containers les cles marquees `preflight_required` dans cet inventaire.
- le chemin rollback standard est maintenant `scw-rollback-plan.sh` puis `scw-rollback-execute.sh`; un rollback image ne doit plus etre reconstruit a la main depuis `scw container update`.
- `docs/deployment/rollback-targets.json` est la source de verite des targets rollback connues. Tant qu'une surface reste marquee `requires_target_override`, il faut fournir `--target <service>=<container-name>[@region]` a la commande de rollback.

## Sequence recommandee (sans surprise)

1. Provisionner (idempotent):

```bash
pnpm run scw:bootstrap:frontends
pnpm run scw:bootstrap:api
```

2. Configurer les variables runtime/secrets.

3. Verifier avant deploy:

```bash
node ./scripts/validate-runtime-secret-inventory.mjs
./scripts/scw/scw-preflight-deploy.sh all
./scripts/scw/scw-preflight-deploy.sh staging
```

4. Deployer quand valide via runner immuable:

```bash
pnpm release:build -- --service landing --ref <git-ref> --tag <tag> --registry-prefix <registry> --output /tmp/landing.json
pnpm release:build -- --service webapp --ref <git-ref> --tag <tag> --registry-prefix <registry> --output /tmp/webapp.json
pnpm release:build -- --service admin --ref <git-ref> --tag <tag> --registry-prefix <registry> --output /tmp/admin.json
pnpm release:build -- --service api --ref <git-ref> --tag <tag> --registry-prefix <registry> --output /tmp/api.json

pnpm release:manifest:create -- \
  --ref <git-ref> \
  --gate-report .git/gate-reports/<sha>.json \
  --output /tmp/release-manifest.json \
  --image "landing=$(jq -r '.registry_image' /tmp/landing.json)" \
  --image "webapp=$(jq -r '.registry_image' /tmp/webapp.json)" \
  --image "admin=$(jq -r '.registry_image' /tmp/admin.json)" \
  --image "api=$(jq -r '.registry_image' /tmp/api.json)"

pnpm release:deploy -- --manifest /tmp/release-manifest.json --env staging --services landing,webapp,admin,api
./scripts/scw/scw-post-deploy-smoke.sh --env staging --services api,webapp,admin

pnpm release:promote -- --manifest /tmp/release-manifest.json --to prod --services landing,webapp,admin,api
./scripts/scw/scw-post-deploy-smoke.sh --env prod --services api,webapp,admin,auth
```

Note de build frontend:

- pour les images Next.js ciblees en `linux/amd64`, preferer une base glibc (`node:*bookworm-slim` ou equivalent) si un build Docker Alpine casse sur des binaires natifs pendant `next build`.
- pour un monorepo PNPM avec packages workspace utilises par Next (`@praedixa/ui`, `@praedixa/shared-types`, etc.), faire un `pnpm install --frozen-lockfile` propre dans le builder apres `COPY . .`; restaurer seulement le `node_modules` racine depuis un stage precedent ne suffit pas, car les liens package-local de PNPM peuvent manquer et rendre les packages workspace introuvables uniquement dans Docker.
- exclure aussi les `*.tsbuildinfo` du contexte Docker, ou les supprimer explicitement dans le builder avant compilation: conserver un cache TypeScript incremental sans copier `dist/` peut faire croire a `tsc` que les packages workspace sont deja buildes alors qu'aucun artefact n'existe dans l'image.
- pour `app-webapp`, l'image runtime cible copie seulement la sortie `standalone` Next.js (`.next/standalone`, `.next/static`, `public`) et demarre via `node server.js`; le bundle `OpenNext` reste reserve au chemin Cloudflare et ne sert pas au deploiement Scaleway.
- si aucun asset public n'est encore livre par le webapp, garder quand meme `app-webapp/public/` versionne (meme vide) pour que le `COPY` runtime reste deterministe dans l'image.

## One-pagers prospects proteges: bootstrap DNS sans zone grise

Les sources prospect vivent sous `marketing/presentations-clients/` a la racine du repo; les commandes ci-dessous restent inchangées et s'appuient sur les scripts `scw:*` du monorepo.

Les bootstrap prospects `centaurus` et `skolae` n'acceptent plus un chemin "semi-manuel" ou le container est provisionne mais le DNS resterait a finir plus tard.

Deux modes seulement sont autorises:

1. `SCW_BOOTSTRAP_DNS_MODE=scaleway-managed`
   - le script cree ou met a jour le `container domain`
   - il ecrit le CNAME dans la zone DNS Scaleway
   - il verifie ensuite le binding container, le record dans Scaleway et la resolution publique effective

2. `SCW_BOOTSTRAP_DNS_MODE=external-verified`
   - le script cree ou rebinde le `container domain`
   - il n'ecrit pas le DNS
   - il exige cependant que le CNAME public existe deja et resolve vers la cible attendue avant de reussir

Variables utiles:

- `SCW_BOOTSTRAP_DNS_MODE=scaleway-managed|external-verified`
- `SCW_BOOTSTRAP_VERIFY_ATTEMPTS` pour la fenetre de verification
- `SCW_BOOTSTRAP_VERIFY_SLEEP_SECONDS` pour l'intervalle entre deux controles

Exemple avec DNS externe deja prepare:

```bash
SCW_BOOTSTRAP_DNS_MODE=external-verified \
SCW_BOOTSTRAP_VERIFY_ATTEMPTS=30 \
SCW_BOOTSTRAP_VERIFY_SLEEP_SECONDS=5 \
pnpm run scw:bootstrap:centaurus
```

Regle d'exploitation:

- si la resolution publique attendue n'est pas observable, le bootstrap doit echouer
- aucun warning de type "ajouter le CNAME manuellement plus tard" n'est un resultat acceptable

## Variables requises (configuration containers)

### Frontends (`scw-configure-frontend-env.sh`)

Variables shell requises:

- `NEXT_PUBLIC_API_URL`
- `AUTH_APP_ORIGIN`
- `NEXT_PUBLIC_APP_ORIGIN`
- `AUTH_OIDC_ISSUER_URL`
- `AUTH_OIDC_CLIENT_ID`
- `AUTH_SESSION_SECRET`
- `AUTH_RATE_LIMIT_REDIS_URL` (ou `RATE_LIMIT_STORAGE_URI`)
- `AUTH_RATE_LIMIT_KEY_SALT`

Variables optionnelles:

- `AUTH_OIDC_SCOPE` (defaut: `openid profile email offline_access`)
- `AUTH_OIDC_CLIENT_SECRET`
- `AUTH_TRUST_X_FORWARDED_FOR` (`0` ou `1`, defaut: `0`)
- `AUTH_RATE_LIMIT_KEY_PREFIX` (defaut: `prx:auth:rl`)
- `AUTH_RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS` (defaut: `300`)
- `AUTH_RATE_LIMIT_REDIS_COMMAND_TIMEOUT_MS` (defaut: `300`)

Regle d'exploitation:

- `AUTH_APP_ORIGIN` et `NEXT_PUBLIC_APP_ORIGIN` doivent etre l'origin HTTPS publique effective du frontend cible (`staging-app.praedixa.com`, `app.praedixa.com`, etc.);
- `NEXT_PUBLIC_API_URL` doit pointer vers une API reachable en HTTPS; pour une boucle complete avec integrations sandbox externes, on utilise une pile sandbox explicite, jamais une URL loopback;
- hors developpement, `webapp` comme `admin` ne doivent plus deployer sans store distribue explicite ni sans `AUTH_RATE_LIMIT_KEY_SALT` ;
- les preflights staging/deploy controlent maintenant cette exigence a partir de l'inventaire runtime versionne; la cle runtime attendue sur le container reste `AUTH_RATE_LIMIT_REDIS_URL`.
- les secrets frontend sont synchronises sous `/praedixa/<env>/<container>/runtime` avant application au container;
- la generation des JSON temporaires ne passe plus aucune valeur secrete dans `argv`.

### Landing (`scw-configure-landing-env.sh`)

Variables shell requises:

- `CONTACT_API_BASE_URL`
- `CONTACT_API_INGEST_TOKEN`
- `RESEND_API_KEY`
- `RATE_LIMIT_STORAGE_URI`
- `CONTACT_FORM_CHALLENGE_SECRET`
- `LANDING_ASSET_SIGNING_SECRET`

Variables optionnelles:

- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO_EMAIL`
- `ALLOWED_FORM_ORIGINS`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `LANDING_TRUST_PROXY_IP_HEADERS` (`0` ou `1`, defaut: `1`)
- `LANDING_SECURITY_KEY_PREFIX` (defaut: `prx:landing:sec`)
- `LANDING_SECURITY_REDIS_CONNECT_TIMEOUT_MS` (defaut: `300`)
- `LANDING_SECURITY_REDIS_COMMAND_TIMEOUT_MS` (defaut: `300`)

Regle d'exploitation:

- les secrets landing runtime sont synchronises sous `/praedixa/<env>/<container>/runtime` avant application au container;
- la generation des JSON temporaires ne passe plus aucune valeur secrete dans `argv`.

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
- `KEYCLOAK_ADMIN_PASSWORD`
- `SCW_SECRET_KEY`
- `SCW_DEFAULT_PROJECT_ID`

Variables optionnelles:

- `KEYCLOAK_ADMIN_USERNAME` (defaut: `kcadmin`)

Regle d'exploitation:

- les secrets API runtime sont synchronises sous `/praedixa/<env>/<container>/runtime` avant application au container;
- l'API TS utilise maintenant `KEYCLOAK_ADMIN_USERNAME` + `KEYCLOAK_ADMIN_PASSWORD` pour provisionner les comptes client depuis le backoffice avant d'ecrire `users.auth_user_id`;
- la generation des JSON temporaires ne passe plus aucune valeur secrete dans `argv`.

### Auth (`scw-configure-auth-env.sh`)

Variables shell requises:

- `PRIVATE_NETWORK_ID`
- `KC_DB_URL_HOST`
- `KC_DB_URL_PORT` (defaut pratique: `5432`)
- `KC_DB_URL_DATABASE`
- `KC_DB_USERNAME`
- `KC_DB_PASSWORD`
- `KEYCLOAK_ADMIN_PASSWORD`

Variables optionnelles:

- `AUTH_HOSTNAME` (defaut: `auth.praedixa.com`)
- `KEYCLOAK_ADMIN_USERNAME` (defaut: `kcadmin`)
- `SUPER_ADMIN_EMAIL` (defaut: `admin@praedixa.com`)
- `SUPER_ADMIN_PASSWORD` (si fourni, reprovisionne aussi le compte bootstrap admin dans le realm live)

Regle d'exploitation:

- `KC_DB` est force a `postgres` par le script de configuration;
- `PRIVATE_NETWORK_ID` est applique au container `auth-prod` dans le meme passage pour garantir l'acces prive a la base auth;
- le secret bootstrap admin runtime est synchronise sous `/praedixa/prod/auth-prod/runtime` avant application au container;
- `KC_DB_PASSWORD` est synchronise sur le meme path secret manager que `KC_BOOTSTRAP_ADMIN_PASSWORD`;
- si `SUPER_ADMIN_PASSWORD` est fourni explicitement, le script reapplique aussi `keycloak-ensure-super-admin.sh` juste apres la reconciliation email/theme pour qu'un realm reimporte ne reste pas avec `0` utilisateur admin;
- la generation des JSON temporaires ne passe plus aucune valeur secrete dans `argv`;
- le smoke staging n'utilise plus `auth-prod` comme preuve implicite: il faut un `--auth-url` dedie pour valider un host auth staging.

## DNS: modes supportes

Le mode par defaut est `strict`.

### 1) Mode strict (par defaut)

- Delegation NS publique attendue vers Scaleway (`ns0.dom.scw.cloud`, `ns1.dom.scw.cloud`).
- Sans `dig`, le preflight echoue au lieu de passer silencieusement.
- Si la delegation n'est pas en place, le preflight echoue.

### 2) Mode transitoire (override explicite)

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

Le preflight ne tolere ce mode qu'avec un override explicite:

```bash
DNS_DELEGATION_MODE=transitional ./scripts/scw/scw-preflight-deploy.sh staging
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
SUPER_ADMIN_PASSWORD='<mot-de-passe-super-admin-a-recuperer-depuis-le-gestionnaire-de-secrets>' \
SUPER_ADMIN_EMAIL='admin@praedixa.com' \
./scripts/keycloak/keycloak-ensure-super-admin.sh
```

Notes:

- `KEYCLOAK_ADMIN_USERNAME` est `kcadmin` par defaut (surcharge possible en variable d'environnement).
- Le script cree le compte s'il n'existe pas, force le mot de passe et garantit le role `super_admin`.
- Par defaut, il synchronise aussi toutes les permissions admin versionnees dans `contracts/admin/permission-taxonomy.v1.json`; `admin:console:access` seul n'est pas suffisant pour ouvrir la home admin `/`.
- Le mot de passe du super admin doit provenir d'un secret hors repo; ne documentez jamais une valeur realiste dans `docs/`.

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
- le claim top-level canonique `role`
- le claim `organization_id`
- le claim `site_id` pour les roles scopes par site
- le claim `permissions` pour `praedixa-admin` quand la console admin doit etre accessible

Script idempotent fourni:

```bash
KEYCLOAK_ADMIN_PASSWORD='<mot-de-passe-admin-keycloak>' \
TARGET_USER_EMAIL='<utilisateur@client.com>' \
TARGET_ORGANIZATION_ID='<uuid-org>' \
TARGET_SITE_ID='<uuid-site>' \
pnpm auth:keycloak:ensure-api-contract
```

Notes:

- `TARGET_SITE_ID` peut etre omis pour `org_admin` et `super_admin`.
- Le script configure les protocol mappers sur `praedixa-webapp` et `praedixa-admin` a partir du realm export versionne `infra/auth/realm-praedixa.json`, y compris `claim-role` et `claim-permissions` pour l'admin.
- En local, si `KEYCLOAK_ADMIN_PASSWORD` n'est pas exporte, le script relit aussi `KEYCLOAK_ADMIN_PASSWORD` ou `KC_BOOTSTRAP_ADMIN_PASSWORD` depuis `app-landing/.env.local`, `app-webapp/.env.local`, `app-admin/.env.local`, puis `.env.local` racine.
- Si un utilisateur cible est fourni, il synchronise aussi les attributs Keycloak canoniques `role`, `organization_id` et `site_id`.
- `TARGET_ROLE` est optionnel: si absent, le script derive le role canonique depuis le plus prioritaire des realm roles connus deja assignes a l'utilisateur.
- `TARGET_PERMISSIONS='admin:console:access,...'` permet aussi de synchroniser explicitement l'attribut multivalue `permissions` pour les comptes admin.
- Un simple redeploiement du container auth n'importe pas automatiquement le realm existant; pour un realm deja cree, appliquez explicitement ce script ou un import Keycloak admin equivalent.
- Le chemin normal pour les comptes client n'est plus `kcadm` manuel ni un compte fake seed: `app-admin` -> `Clients` -> `Equipe` cree maintenant l'identite Keycloak, envoie l'email `UPDATE_PASSWORD`, puis persiste le lien `users.auth_user_id`.

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
