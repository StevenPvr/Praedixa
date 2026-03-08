# Praedixa

**Pilotage economique de la couverture multi-sites pour PME/ETI** — boucle fermee: prevision, decision optimale, 1re action assistee, preuve ROI mensuelle.

## Structure

```
praedixa/
├── app-landing/         # Landing page marketing (Next.js 15)
├── app-webapp/          # Dashboard client (Next.js 15)
├── app-admin/           # Back-office super admin (Next.js 15)
├── app-api-ts/          # API backend applicatif (TypeScript)
├── app-api/             # Data/ML engine Python (medallion + jobs)
├── packages/
│   ├── ui/              # Composants React partages
│   └── shared-types/    # Types TypeScript partages
├── infra/               # docker-compose local (PostgreSQL)
├── testing/             # E2E tests, shared test utils
├── scripts/             # Dev setup, migrations, seed scripts
└── docs/                # Architecture docs, security reports
```

## Documentation distribuée

Le repo n'utilise pas seulement une documentation centrale. Les dossiers importants embarquent aussi leur propre `README.md` local pour expliquer :

- leur rôle ;
- les fichiers clés ;
- les flux ou commandes associés ;
- leur intégration avec le reste du monorepo.

Points d'entrée utiles :

- `docs/README.md` pour la documentation longue durée ;
- `scripts/README.md` pour l'automatisation ;
- `testing/README.md` pour les tests partagés ;
- `infra/README.md` pour les artefacts d'infrastructure ;
- `contracts/README.md` pour les contrats techniques ;
- les `README.md` présents dans chaque app, package et sous-dossier versionné.

## Prerequis

- Node.js 22+
- pnpm 9+
- Python 3.12+ et [uv](https://docs.astral.sh/uv/)
- prek (installe via `./scripts/install-prek.sh`)
- Outils de gate local exhaustif: `semgrep`, `checkov`, `trivy`, `codeql`, `osv-scanner`, `k6`

## Installation locale

```bash
pnpm install
```

## Developpement

### Landing page (port 3000)

```bash
pnpm dev:landing
```

### Web app frontend (port 3001)

```bash
pnpm dev:webapp
```

### Base de donnees PostgreSQL (port 5433)

```bash
docker compose -f infra/docker-compose.yml up -d postgres
```

PostgreSQL 16 demarre sur `localhost:5433` (credentials : `praedixa` / `changeme` / db `praedixa`).

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
cd app-api
uv run --active alembic upgrade head
```

### Back-office admin (port 3002)

```bash
pnpm dev:admin
```

Accessible sur http://localhost:3002. Necessite un compte OIDC avec le role `super_admin`.

Si Keycloak rejette `redirect_uri` pour `praedixa-admin` en local:

```bash
# Admin local sur un callback deja autorise (3001)
pnpm dev:admin:local-auth

# Et deplacer temporairement la webapp sur 3004
pnpm dev:webapp:3004
```

### Comptes OIDC (Keycloak)

Commandes utiles via le wrapper local `scripts/kcadm` :

```bash
# 1) Connexion admin Keycloak (master realm)
scripts/kcadm config credentials \
  --server "https://auth.praedixa.com" \
  --realm master \
  --user kcadmin \
  --password "<KCADMIN_PASSWORD>"

# 2) Lister les comptes du realm applicatif
scripts/kcadm get users -r praedixa --fields id,username,email,enabled,emailVerified --format csv

# 3) Voir un compte par email
scripts/kcadm get users -r praedixa -q email=ops.client@praedixa.com

# 4) Voir les roles realm d'un utilisateur
scripts/kcadm get users/<USER_ID>/role-mappings/realm -r praedixa

# 5) Creer un compte client (org_admin)
scripts/kcadm create users -r praedixa \
  -s username=ops.client@praedixa.com \
  -s email=ops.client@praedixa.com \
  -s firstName=Ops \
  -s lastName=Client \
  -s enabled=true \
  -s emailVerified=true
scripts/kcadm set-password -r praedixa --username ops.client@praedixa.com --new-password "praedixa2026!"
scripts/kcadm add-roles -r praedixa --uusername ops.client@praedixa.com --rolename org_admin

# 6) Reset mot de passe
scripts/kcadm set-password -r praedixa --username ops.client@praedixa.com --new-password "praedixa2026!"

# 7) Creer un compte back-office (super_admin)
scripts/kcadm create users -r praedixa \
  -s username=ops.admin@praedixa.com \
  -s email=ops.admin@praedixa.com \
  -s firstName=Ops \
  -s lastName=Admin \
  -s enabled=true \
  -s emailVerified=true
scripts/kcadm set-password -r praedixa --username ops.admin@praedixa.com --new-password "praedixa2026!"
scripts/kcadm add-roles -r praedixa --uusername ops.admin@praedixa.com --rolename super_admin

# 8) Garantir l'audience API dans les access tokens frontend (idempotent)
scripts/keycloak-ensure-api-audience-mapper.sh

# 9) Verifier le mapper d'audience pour le client webapp
WEBAPP_CLIENT_ID="$(scripts/kcadm get clients -r praedixa -q clientId=praedixa-webapp | jq -r '.[0].id')"
scripts/kcadm get "clients/${WEBAPP_CLIENT_ID}/protocol-mappers/models" -r praedixa \
  | jq '.[] | select(.name=="audience-praedixa-api") | {name, protocolMapper, config}'
```

Notes:

- Compte client fake (demo): `ops.client@praedixa.com` / `praedixa2026!`
- Compte admin fake (demo): `ops.admin@praedixa.com` / `praedixa2026!`
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

Lancer les 4 services dans des terminaux separes :

```bash
# Terminal 1 — Landing
pnpm dev:landing

# Terminal 2 — Web app client
pnpm dev:webapp

# Terminal 3 — Back-office admin
pnpm dev:admin

# Terminal 4 — API TS
pnpm dev:api
# ou, en explicite :
pnpm --filter @praedixa/api-ts dev
```

## Tests

### Tests unitaires frontend (Vitest)

```bash
# Lancer tous les tests (landing + webapp + admin + packages)
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

# Smoke local reproductible (admin)
pnpm test:e2e:smoke

# Lancer la suite E2E par projet (RECOMMANDÉ pour la stabilité)
# Lance uniquement les tests landing (nettoie les ports avant)
pnpm test:e2e:landing

# Lance uniquement les tests webapp
pnpm test:e2e:webapp

# Lance uniquement les tests admin (avec 1 worker pour éviter les crashs mémoire)
PW_WORKERS=1 pnpm test:e2e:admin

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
./scripts/install-prek.sh
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

- Les verifications bloquantes sont locales (hooks `pre-commit` + `pre-push`).
- Les workflows GitHub de verification generaliste (`ci.yml`, `audit.yml`) ne sont plus la source d'autorite.

### Deploiement production

- Non automatise par GitHub Actions.
- Deploiement local via scripts `scw:*`.

### Deploiement

| Service              | Hebergement actuel                       | URL principale                          | Config / scripts                                                      |
| -------------------- | ---------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| Landing              | Scaleway Serverless Container (`fr-par`) | `praedixa.com` (cutover DNS en attente) | `app-landing/Dockerfile.scaleway`, `pnpm run scw:deploy:landing:*` |
| Web app client       | Scaleway Serverless Container (`fr-par`) | `app.praedixa.com`                      | `app-webapp/Dockerfile.scaleway`, `pnpm run scw:deploy:webapp:*`      |
| Admin back-office    | Scaleway Serverless Container (`fr-par`) | `admin.praedixa.com`                    | `app-admin/Dockerfile.scaleway`, `pnpm run scw:deploy:admin:*`        |
| API backend          | Scaleway Serverless Container (`fr-par`) | `api.praedixa.com`                      | `app-api-ts/Dockerfile`, `pnpm run scw:deploy:api:*`                  |
| Auth OIDC (Keycloak) | Scaleway Serverless Container (`fr-par`) | `auth.praedixa.com`                     | configuration manuelle + env secrets                                  |

Preflight complet sans deploy:

```bash
pnpm run scw:preflight:deploy
```

Voir aussi :

- `docs/runbooks/scaleway-frontends-100-fr.md`
- `docs/deployment/scaleway-container.md`
