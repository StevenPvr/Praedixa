# Praedixa

**Pilotage economique des absences pour PME/ETI** — forecast de capacite globale (humain + marchandise) pour sites logistiques.

## Structure

```
praedixa/
├── apps/
│   ├── landing/           # Landing page marketing (Next.js 15)
│   ├── webapp/            # Dashboard client (Next.js 15)
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

### Tout en parallele

Lancer les 3 services dans des terminaux separes :

```bash
# Terminal 1 — Landing
pnpm dev:landing

# Terminal 2 — Web app
pnpm dev:webapp

# Terminal 3 — API
pnpm dev:api
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

| Service | Hebergement                 | Config                        |
| ------- | --------------------------- | ----------------------------- |
| Landing | Cloudflare Workers          | `apps/landing/wrangler.jsonc` |
| Web app | Cloudflare Workers          | `apps/webapp/wrangler.jsonc`  |
| API     | Scaleway Container (France) | `apps/api/Dockerfile`         |
