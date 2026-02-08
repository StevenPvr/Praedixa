# Praedixa

**Pilotage economique des absences pour PME/ETI** — forecast de capacite globale (humain + marchandise) pour sites logistiques.

## Structure

```
praedixa/
├── apps/
│   ├── landing/           # Landing page marketing (Next.js 15)
│   ├── webapp/            # Dashboard client (Next.js 15)
│   ├── admin/             # Back-office super admin (Next.js 15)
│   └── api/               # API backend (FastAPI + SQLAlchemy)
├── packages/
│   ├── ui/                # Composants React partages
│   └── shared-types/      # Types TypeScript partages
```

## Prerequis

- Node.js 22+
- pnpm 9+
- Python 3.12+ et [uv](https://docs.astral.sh/uv/)
- pre-commit (recommande)

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
docker compose up -d postgres
```

PostgreSQL 16 demarre sur `localhost:5433` (credentials : `praedixa` / `changeme` / db `praedixa`).

Pour arreter :

```bash
docker compose down
```

### API backend (port 8000)

```bash
cd apps/api
cp .env.example .env          # configurer DATABASE_URL, SUPABASE_JWT_SECRET, etc.
uv sync --extra dev            # installer les dependances Python
uv run uvicorn app.main:app --reload --port 8000
```

Ou depuis la racine :

```bash
pnpm dev:api
```

L'API expose sa documentation OpenAPI sur http://localhost:8000/docs.

### Back-office admin (port 3002)

```bash
pnpm dev:admin
```

Accessible sur http://localhost:3002. Necessite un compte Supabase avec le role `super_admin` dans `app_metadata`.

### Tout en parallele

Lancer les 4 services dans des terminaux separes :

```bash
# Terminal 1 — Landing
pnpm dev:landing

# Terminal 2 — Web app client
pnpm dev:webapp

# Terminal 3 — Back-office admin
pnpm dev:admin

# Terminal 4 — API
pnpm dev:api
```

## Tests

### Tests unitaires frontend (Vitest)

```bash
# Lancer tous les tests (landing + webapp + admin + packages)
pnpm test

# Mode watch (re-execute a chaque modification)
pnpm test:watch

# Avec couverture de code (seuil 100%)
pnpm test:coverage

# Un seul fichier
pnpm vitest run apps/webapp/hooks/__tests__/use-api.test.ts

# Un seul pattern
pnpm vitest run --reporter=verbose -t "renders loading"
```

### Tests unitaires backend (Pytest)

```bash
# Lancer tous les tests Python avec couverture (seuil 100%)
cd apps/api && uv run pytest

# Tests d'un seul fichier
cd apps/api && uv run pytest tests/unit/test_services_decisions.py

# Tests d'un seul dossier
cd apps/api && uv run pytest tests/unit/
cd apps/api && uv run pytest tests/integration/
cd apps/api && uv run pytest tests/security/

# Verbose avec details des echecs
cd apps/api && uv run pytest -v --tb=short

# Sans couverture (plus rapide pour le dev)
cd apps/api && uv run pytest --no-cov
```

### Tests E2E (Playwright)

```bash
# Installer les navigateurs (une seule fois)
pnpm exec playwright install

# Lancer tous les E2E (demarre automatiquement les serveurs dev)
pnpm test:e2e

# Par projet
pnpm test:e2e:landing
pnpm test:e2e:webapp
pnpm test:e2e:admin

# Avec couverture de code V8 (genere e2e-coverage/report.html)
pnpm test:e2e:coverage

# Couverture par projet individuel
COVERAGE=1 pnpm test:e2e:webapp

# Mode UI interactif (debug visuel)
pnpm exec playwright test --ui

# Un seul fichier
pnpm exec playwright test e2e/webapp/dashboard.spec.ts

# Avec trace pour debug
pnpm exec playwright test --trace on
```

> Les serveurs dev (landing :3000, webapp :3001) sont lances automatiquement par Playwright.
> Si un serveur tourne deja, Playwright le reutilise (`reuseExistingServer: true` en local).

### Tout verifier (pre-commit complet)

```bash
pnpm pre-commit
```

## Qualite & Securite (pre-commit)

```bash
pipx install pre-commit
pre-commit install --install-hooks
pnpm pre-commit
```

Les hooks couvrent : formatting, lint, typecheck, tests (vitest + pytest), build, ruff, bandit, actionlint, gitleaks.

## CI/CD (automatise)

### Declencheurs

- **PR vers main** : execute les checks pre-commit
- **Push sur main** : checks + build + deploiement Cloudflare Workers

### Secrets GitHub requis

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `SCW_ACCESS_KEY`
- `SCW_SECRET_KEY`
- `SCW_PROJECT_ID`
- `SCW_ORGANIZATION_ID`

### Deploiement

| Service | Hebergement                 | URL                | Config                        |
| ------- | --------------------------- | ------------------ | ----------------------------- |
| Landing | Cloudflare Workers          | praedixa.com       | `apps/landing/wrangler.jsonc` |
| Web app | Cloudflare Workers          | app.praedixa.com   | `apps/webapp/wrangler.jsonc`  |
| Admin   | Cloudflare Workers          | admin.praedixa.com | `apps/admin/wrangler.jsonc`   |
| API     | Scaleway Container (France) | api.praedixa.com   | `apps/api/Dockerfile`         |
