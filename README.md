# Praedixa

**DecisionOps multi-sites pour operations terrain** — federer les donnees, predire, calculer les meilleures decisions, declencher une premiere action assistee et prouver le ROI.

## Structure

```
praedixa/
├── app-landing/         # Landing page marketing (Next.js 15)
├── app-webapp/          # Dashboard client (Next.js 15)
├── app-admin/           # Back-office super admin (Next.js 15)
├── app-api-ts/          # API backend applicatif (TypeScript)
├── app-api/             # Data/ML engine Python (medallion + jobs)
├── marketing/           # Contenus, assets commerciaux et presentations
├── packages/
│   ├── ui/              # Composants React partages
│   └── shared-types/    # Types TypeScript partages
├── infra/               # docker-compose local (PostgreSQL)
├── testing/             # E2E tests, shared test utils
├── scripts/             # Dev setup, infra, auth et gates locaux
└── docs/                # Architecture docs, security reports
```

## Documentation distribuée

Le repo n'utilise pas seulement une documentation centrale. Les dossiers importants embarquent aussi leur propre `README.md` local pour expliquer :

- leur rôle ;
- les fichiers clés ;
- les flux ou commandes associés ;
- leur intégration avec le reste du monorepo.

Points d'entrée utiles :

- `docs/cto/README.md` pour le parcours CTO orienté architecture, donnees, runtimes et sources de verite ;
- `docs/README.md` pour distinguer la documentation durable du cadrage/PRD ;
- `docs/governance/build-ready-status.json` pour le verdict machine-readable `Go/No-Go` du socle monorepo ;
- `docs/specs/README.md` pour les contrats documentaires Symphony ;
- `scripts/README.md` pour l'automatisation ;
- `docs/specs/ticket.md` pour le format exact des tickets Linear executables par Symphony ;
- `marketing/` pour les contenus et assets business hors runtime applicatif ;
- `testing/README.md` pour les tests partagés ;
- `infra/README.md` pour les artefacts d'infrastructure ;
- `contracts/README.md` pour les contrats techniques ;
- les `README.md` présents dans chaque app, package et sous-dossier versionné.

## Commencer ici pour comprendre les données

Si l'objectif est de comprendre rapidement la base et les flux de données, suivre ce parcours :

1. `docs/cto/README.md`
2. `docs/cto/01-systeme-et-runtimes.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATABASE.md`
5. `docs/cto/08-contrats-et-types-partages.md`

Ce parcours sert de carte de lecture. Les vérités d'exécution restent ensuite dans :

- `app-api/app/models/*` et `app-api/alembic/versions/*` pour le schéma PostgreSQL ;
- `contracts/*` et `packages/shared-types/*` pour les contrats et types partagés ;
- `app-api-ts/*`, `app-connectors/*` et `app-api/*` pour les frontieres runtime et la verite d'execution.

Les documents de cadrage produit vivent desormais sous `docs/prd/*`; ils ne remplacent pas les sources API/runtime normatives. La reference API publique versionnee reste `contracts/openapi/public.yaml`.

## Artefacts business

- `marketing/sales-assets/pitch-deck-v2.html` : pitch investisseur HTML autonome, réécrit en langage simple avec une mise en page calibrée sur le contenu, répartie sur la hauteur de chaque slide et uniformisée carte par carte à l’échelle de la slide. La cover met explicitement en avant l’anticipation des besoins opérationnels, l’optimisation des décisions, l’appui sur l’état de l’art du machine learning et l’incubation du projet à EuraTechnologies dans la verticale IA / Data, avec des exemples concrets de charge, demande, saisonnalité, pics et creux. Le volet bootstrap précise aussi une discipline commerciale fondée sur des apporteurs d’affaires payés au succès, sur client signé et non sur simple prospect. La slide DeepTech expose désormais une vraie feuille de route R&D autour du decision-focused learning, de l’optimisation discrète, de l’endogénéité, du board scientifique, des dossiers BPI de juin 2026, d’un doctorat CIFRE visé pour septembre 2026 et de l’accompagnement Euratechnologies. La slide finale précise aussi la composition cible de l’équipe, les recrutements actifs CTO / Head of Research et le socle d’écosystème vérifié autour d’EuraTechnologies et d’Inria à Lille. Le header du deck réutilise maintenant le monogramme actuel de Praedixa, aligné sur `@praedixa/ui`.

## Prerequis

- `.nvmrc` epingle Node 22 pour les shells compatibles `nvm`.
- Node.js 22+
- pnpm 9+
- Python 3.12+ et [uv](https://docs.astral.sh/uv/)
- prek (installe via `./scripts/dev/install-prek.sh`)
- Outils de gate local exhaustif: `semgrep`, `checkov`, `trivy`, `codeql`, `osv-scanner`, `k6`

## Installation locale

```bash
pnpm install
```

## Qualite

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Les commandes racine `pnpm build`, `pnpm lint` et `pnpm typecheck` derivent maintenant du graphe Turbo/workspaces au lieu d'une enumeration manuelle fragile des packages courants. Avant d'executer la tache, le garde-fou `scripts/check-workspace-scripts.mjs` verifie que chaque workspace declare bien les scripts attendus, ce qui empeche un nouveau package `app-*` ou `packages/*` de rester hors radar du socle par oubli de la liste racine.

`pnpm test` couvre maintenant la suite Vitest racine puis les tests de tous les workspaces du monorepo via `turbo run test`. Le garde-fou workspace bloque aussi toute absence silencieuse de tests sur les surfaces critiques (`app-landing`, `app-webapp`, `app-admin`, `app-api-ts`, `app-connectors`, `app-symphony`, `packages/shared-types`, `packages/telemetry`, `packages/ui`) avant meme de lancer les tests.

Le profil TypeScript du monorepo est maintenant durci au niveau racine: toutes les apps Next.js partagent la meme base stricte (`strict`, `strictNullChecks`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noImplicitOverride`, `useUnknownInCatchVariables`, `noFallthroughCasesInSwitch`, `noEmitOnError`) et le lint TypeScript est desormais type-aware sur le code source pour attraper les promesses oubliees, les `switch` non exhaustifs et les assertions de type inutiles avant revue.

Le monorepo applique maintenant aussi `exactOptionalPropertyTypes` et `noPropertyAccessFromIndexSignature` dans `tsconfig.base.json`. Les contrats, apps et runtimes refusent donc repo-wide les objets "optionnels ambigus" et les acces pointes fragiles sur des records indexes; les packages partages `@praedixa/shared-types`, `@praedixa/ui`, `@praedixa/api-hooks` et `@praedixa/telemetry` gardent ce palier explicitement visible dans leurs configs locales.

## Developpement

### Landing page (port 3000)

```bash
pnpm dev:landing
```

### Web app frontend (port 3001)

```bash
pnpm dev:auth
pnpm dev:webapp
```

### Base de donnees PostgreSQL (port 5433)

```bash
docker compose -f infra/docker-compose.yml up -d postgres
```

PostgreSQL 16 demarre sur `localhost:5433` (credentials : `praedixa` / `praedixa_local_dev_pg_2026` / db `praedixa`).

Pour arreter :

```bash
docker compose -f infra/docker-compose.yml down
```

### API backend TypeScript (port 8000)

```bash
# Option 1 (raccourci depuis la racine)
pnpm dev:api

# Option 2 (commande package explicite)
pnpm --filter @praedixa/api-ts dev
```

### Data/ML Python (medallion + jobs)

```bash
cd app-api
uv sync --active --extra dev
uv run --active python -m scripts.medallion_pipeline --force-rebuild
```

Contrat OpenAPI backend TS: `contracts/openapi/public.yaml`.

### Migrer la base de donnees

```bash
docker compose -f infra/docker-compose.yml up -d postgres
cd app-api
uv run --active alembic upgrade head
```

### Back-office admin (port 3002)

```bash
pnpm dev:auth
pnpm dev:admin
```

Accessible sur http://localhost:3002. Necessite un compte OIDC avec le role `super_admin`.

### Auth OIDC locale (Keycloak, port 8081)

```bash
# Mode attache avec logs
pnpm dev:auth

# Ou en fond
pnpm dev:auth:bg
pnpm dev:auth:status
```

Le dev local pointe maintenant vers `http://localhost:8081/realms/praedixa` dans `app-admin/.env.local` et `app-webapp/.env.local`, pour ne plus dependre de `auth.praedixa.com` pendant le debug. Le service importe le realm versionne `infra/auth/realm-praedixa.json`, persiste son stockage en volume Docker, et provisionne par defaut le compte `admin@praedixa.com` avec le secret admin Keycloak local deja charge depuis les `.env.local` standards.

Si Keycloak rejette `redirect_uri` pour `praedixa-admin` en local:

```bash
# Admin local sur un callback deja autorise (3001)
pnpm dev:admin:local-auth

# Et deplacer temporairement la webapp sur 3004
pnpm dev:webapp:3004
```

### Comptes OIDC (Keycloak)

Commandes utiles via le wrapper local `scripts/keycloak/kcadm` :

```bash
# 1) Connexion admin Keycloak (master realm)
scripts/keycloak/kcadm config credentials \
  --server "https://auth.praedixa.com" \
  --realm master \
  --user kcadmin \
  --password "<KCADMIN_PASSWORD>"

# 2) Lister les comptes du realm applicatif
scripts/keycloak/kcadm get users -r praedixa --fields id,username,email,enabled,emailVerified --format csv

# 3) Voir un compte par email
scripts/keycloak/kcadm get users -r praedixa -q email='<utilisateur@client.com>'

# 4) Voir les roles realm d'un utilisateur
scripts/keycloak/kcadm get users/<USER_ID>/role-mappings/realm -r praedixa

# 5) Recaler les claims canoniques d'un compte client cree depuis app-admin
TARGET_USER_EMAIL='<utilisateur@client.com>' \
TARGET_ROLE='org_admin' \
TARGET_ORGANIZATION_ID='<uuid-organisation>' \
pnpm auth:keycloak:ensure-api-contract

# 6) Recaler un compte scope site
TARGET_USER_EMAIL='<manager@client.com>' \
TARGET_ROLE='manager' \
TARGET_ORGANIZATION_ID='<uuid-organisation>' \
TARGET_SITE_ID='<uuid-site>' \
pnpm auth:keycloak:ensure-api-contract

# 7) Provisionner le super admin back-office
SUPER_ADMIN_EMAIL='admin@praedixa.com' \
SUPER_ADMIN_PASSWORD='<mot-de-passe-super-admin>' \
./scripts/keycloak/keycloak-ensure-super-admin.sh

# 8) Recaler le contrat OIDC canonique des clients frontend/admin (idempotent)
pnpm auth:keycloak:ensure-api-contract

# 9) Verifier le mapper d'audience pour le client webapp
WEBAPP_CLIENT_ID="$(scripts/keycloak/kcadm get clients -r praedixa -q clientId=praedixa-webapp | jq -r '.[0].id')"
scripts/keycloak/kcadm get "clients/${WEBAPP_CLIENT_ID}/protocol-mappers/models" -r praedixa \
  | jq '.[] | select(.name=="claim-role" or .name=="audience-praedixa-api") | {name, protocolMapper, config}'
```

Notes:

- Les comptes client ne doivent plus etre seeds ou documentes comme des comptes fake: la creation normale passe par `app-admin` -> `Clients` -> `Equipe`, ce qui provisionne l'identite Keycloak et le lien DB ensemble.
- Les comptes `manager` et `hr_manager` doivent etre crees avec un `site_id` explicite; le backoffice refuse maintenant toute invitation site-scopee sans site.
- Les scripts Keycloak relisent automatiquement `KEYCLOAK_ADMIN_PASSWORD` ou `KC_BOOTSTRAP_ADMIN_PASSWORD` depuis `app-landing/.env.local`, `app-webapp/.env.local`, `app-admin/.env.local`, puis `.env.local` racine si la variable n'est pas deja exportee.
- L'assignation d'un realm role seule ne suffit plus pour les apps Next strictes: synchroniser aussi les attributs utilisateur canoniques (`role`, `organization_id`, `site_id`, et `permissions` admin) via `pnpm auth:keycloak:ensure-api-contract` ou `./scripts/keycloak/keycloak-ensure-super-admin.sh`.
- `super_admin` doit se connecter sur `app-admin` (pas sur `app-webapp`).
- `org_admin`/`manager` se connectent sur `app-webapp`.
- `manager`/`hr_manager` doivent avoir un `site_id` dans le token OIDC (sinon acces API refuse en `403`).

### Visibilite Gold (webapp)

La webapp expose la couche Gold complete via `/donnees/gold` en lisant :

- `/api/v1/live/gold/schema`
- `/api/v1/live/gold/rows`
- `/api/v1/live/gold/coverage`
- `/api/v1/live/gold/provenance`

Le endpoint de provenance controle la politique data stricte : seules les colonnes forecasting peuvent rester mock.

### Tout en parallele

Lancer les 6 services dans des terminaux separes :

```bash
# Terminal 1 — Landing
pnpm dev:landing

# Terminal 2 — Web app client
pnpm dev:webapp

# Terminal 3 — Back-office admin
pnpm dev:admin

# Terminal 4 — Auth locale Keycloak
pnpm dev:auth:bg

# Terminal 5 - Camunda
pnpm camunda:up

# Terminal 6 — API TS
pnpm dev:api
# ou, en explicite :
pnpm --filter @praedixa/api-ts dev
```

### Symphony automation service (port 7788 par defaut)

```bash
pnpm dev:symphony
```

Prerequis locaux pour un demarrage utile:

- renseigner `LINEAR_API_KEY` et `LINEAR_PROJECT_SLUG` dans `app-symphony/.env.local` ou `app-symphony/.env`
- verifier que `WORKFLOW.md` a la racine du repo pointe vers le bon projet Linear
- `pnpm dev:symphony` passe explicitement `../WORKFLOW.md` au runtime pour respecter le contrat de path precedence du spec

Surface HTTP locale:

- `http://127.0.0.1:7788/`
- `http://127.0.0.1:7788/api/v1/state`

## Tests

### Tests unitaires frontend (Vitest)

```bash
# Lancer les suites web Vitest puis les packages backend TypeScript critiques
pnpm test

# Mode watch (re-execute a chaque modification)
pnpm test:watch

# Gate stricte de couverture unitaire (bloque si < 100%)
pnpm test:coverage

# Un seul fichier
pnpm vitest run app-webapp/hooks/__tests__/use-api.test.ts

# Un seul pattern
pnpm vitest run --reporter=verbose -t "renders loading"
```

### Tests backend TypeScript (API)

```bash
pnpm --filter @praedixa/api-ts typecheck
pnpm --filter @praedixa/api-ts lint
pnpm --filter @praedixa/api-ts test
```

### Tests Python Data/ML (optionnel)

```bash
cd app-api
uv sync --active --extra dev
# Ajoutez ici vos tests data/ml si necessaire
```

### Tests E2E (Playwright)

```bash
# Installer les navigateurs (une seule fois)
pnpm exec playwright install

# Smoke local reproductible (webapp + admin)
pnpm test:e2e:smoke

# Lancer la suite E2E par projet (RECOMMANDÉ pour la stabilité)
# Lance uniquement les tests landing (nettoie les ports avant)
pnpm test:e2e:landing

# Lance uniquement les tests webapp
pnpm test:e2e:webapp

# Lance la suite admin officielle (inclut aussi la vérification cross-app admin/webapp)
PW_WORKERS=1 pnpm test:e2e:admin

# Lance uniquement la spec cross-app admin/webapp
pnpm test:e2e:admin:cross-app

# Lancer toute la suite E2E (peut nécessiter beaucoup de RAM/CPU)
pnpm test:e2e

# Debugger un fichier spécifique (nettoie les ports automatiquement)
pnpm test:e2e:admin testing/e2e/admin/login.spec.ts

# Mode UI interactif (debug visuel)
pnpm exec playwright test --ui

# Avec couverture de code V8 (génère e2e-coverage/report.html)
pnpm test:e2e:coverage

# Couverture par projet individuel
COVERAGE=1 pnpm test:e2e:admin

# Gestion des ressources (Parallélisme)
# En cas d'erreurs "Connection refused" ou timeouts, réduire le nombre de workers :
PW_WORKERS=1 pnpm test:e2e:admin
```

> Les serveurs dev requis sont lances automatiquement par Playwright selon la suite executee.
> Les scripts `pnpm test:e2e*` nettoient ces ports avant execution et desactivent la reutilisation des serveurs pour garantir des runs reproductibles.
> Pour le debug sur des serveurs deja lances volontairement, utilisez `PW_REUSE_SERVER=1`.

### Tout verifier (gate complet)

```bash
pnpm gate:exhaustive
```

## Qualite & Securite (gate local exhaustif)

```bash
./scripts/dev/install-prek.sh
pnpm gate:exhaustive
pnpm gate:verify
```

Les hooks couvrent:

- format/lint/typecheck/tests/build
- scans secrets/SAST/SCA/IaC
- e2e critiques
- audits dynamiques API
- budgets perf, a11y et schema markup

Le `pre-push` bloque si le rapport signe du commit courant est absent, stale, invalide, ou genere en dry-run.

## Verification & Deploiement (etat actuel)

### Verification bloquante

- Les hooks locaux (`pre-commit` + `pre-push`) restent les accelerateurs developpeur.
- `CI - Autorite` et son job `Autorite - Required` sont la source de verite finale pour le merge.
- Le merge sur `main` doit etre protege par `Autorite - Required`, au moins une review obligatoire et `enforce_admins = true`; toute autre CI par surface reste du feedback rapide, pas le juge final.
- Le verdict structurel `Go/No-Go` est versionne dans `docs/governance/build-ready-status.json` et rejoue par `CI - Autorite` sous forme de rapport SHA.

### Deploiement production

- Le chemin nominal de release est maintenant GitHub Actions via `Release - Platform`.
- Ce workflow de release doit partir du SHA du run GitHub, sans `workflow_dispatch.inputs` capables de changer `ref`, `services`, `tag` ou la promotion.
- Les scripts `scw:*` restent des wrappers versionnes pour preflight, bootstrap, debug local et break-glass, pas le control plane de production.

### Deploiement

| Service              | Hebergement actuel                       | URL principale                          | Config / scripts                                                 |
| -------------------- | ---------------------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| Landing              | Scaleway Serverless Container (`fr-par`) | `praedixa.com` (cutover DNS en attente) | `app-landing/Dockerfile.scaleway`, workflow `Release - Platform` |
| Web app client       | Scaleway Serverless Container (`fr-par`) | `app.praedixa.com`                      | `app-webapp/Dockerfile.scaleway`, workflow `Release - Platform`  |
| Admin back-office    | Scaleway Serverless Container (`fr-par`) | `admin.praedixa.com`                    | `app-admin/Dockerfile.scaleway`, workflow `Release - Platform`   |
| API backend          | Scaleway Serverless Container (`fr-par`) | `api.praedixa.com`                      | `app-api-ts/Dockerfile`, workflow `Release - Platform`           |
| Auth OIDC (Keycloak) | Scaleway Serverless Container (`fr-par`) | `auth.praedixa.com`                     | `infra/auth/Dockerfile.scaleway`, workflow `Release - Platform`  |

Preflight complet sans deploy:

```bash
pnpm run scw:preflight:deploy
```

Voir aussi :

- `docs/runbooks/scaleway-frontends-100-fr.md`
- `docs/deployment/scaleway-container.md`
