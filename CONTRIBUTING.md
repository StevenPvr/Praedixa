# Contribuer a Praedixa

Praedixa est une plateforme SaaS multi-tenant de prevision de capacite pour sites logistiques (absences + charge de travail). Le projet est organise en monorepo pnpm avec 4 applications et 2 packages partages.

Pour une vue d'ensemble du projet, consultez le [`README.md`](README.md).

## Prerequis

| Outil   | Version  | Installation                                                 |
| ------- | -------- | ------------------------------------------------------------ |
| Node.js | 22+      | [nodejs.org](https://nodejs.org/)                            |
| pnpm    | 9+       | `corepack enable && corepack prepare pnpm@latest --activate` |
| Python  | 3.12+    | [python.org](https://www.python.org/)                        |
| uv      | derniere | [docs.astral.sh/uv](https://docs.astral.sh/uv/)              |
| Docker  | derniere | [docker.com](https://www.docker.com/) (pour PostgreSQL)      |
| Git     | derniere | [git-scm.com](https://git-scm.com/)                          |

## Installation complete

```bash
# 1. Cloner le depot
git clone git@github.com:your-org/praedixa.git
cd praedixa

# 2. Installer les dependances JavaScript (toutes les apps + packages)
pnpm install

# 3. Installer les dependances Python (API backend)
cd app-api && uv sync --extra dev && cd ..

# 4. Demarrer PostgreSQL 16 (port 5433, credentials: praedixa / changeme)
docker compose -f infra/docker-compose.yml up -d postgres

# 5. Appliquer les migrations de base de donnees
cd app-api && uv run alembic upgrade head && cd ..
```

Chaque application a son propre README avec les instructions specifiques :

- [`app-landing/README.md`](app-landing/README.md) -- Site marketing
- [`app-webapp/README.md`](app-webapp/README.md) -- Dashboard client
- [`app-admin/README.md`](app-admin/README.md) -- Back-office super-admin
- [`app-api/README.md`](app-api/README.md) -- API backend

## Structure du monorepo

```
praedixa/
├── app-landing/            # Site marketing (Next.js 15, Cloudflare Workers) -- port 3000
├── app-webapp/             # Dashboard client (Next.js 15, Cloudflare Workers) -- port 3001
├── app-admin/              # Back-office super-admin (Next.js 15, Cloudflare Workers) -- port 3002
├── app-api/                # API backend (FastAPI + SQLAlchemy 2.0 async + PostgreSQL) -- port 8000
├── packages/
│   ├── ui/                 # Bibliotheque composants React partagee (@praedixa/ui)
│   └── shared-types/       # Types TypeScript partages (@praedixa/shared-types)
├── infra/                  # Docker Compose, config deploiement (render.yaml)
├── testing/                # Setup Vitest, E2E Playwright, utilitaires de test
│   ├── e2e/                # Tests Playwright (landing/, webapp/, admin/)
│   └── vitest.setup.ts     # Configuration globale Vitest
├── scripts/                # Scripts de dev setup, migrations, seed
├── docs/                   # Architecture, securite, deploiement, UX
│   ├── security/           # 9 rapports d'audit securite
│   ├── deployment/         # Guides deploiement Scaleway
│   └── plans-web-app/      # Specs de design et planification
├── .github/workflows/      # CI/CD (ci.yml, ci-api.yml, ci-admin.yml)
├── .pre-commit-config.yaml # Hooks pre-commit (prek)
├── CLAUDE.md               # Reference technique pour Claude Code
└── package.json            # Scripts racine du monorepo
```

Le workspace pnpm est configure dans [`pnpm-workspace.yaml`](pnpm-workspace.yaml) avec les patterns `"app-*"` et `"packages/*"`.

## Conventions de code

### Python (app-api)

- **Linter + formatter** : [Ruff](https://docs.astral.sh/ruff/) (line-length 88)
- **Type hints** obligatoires sur toutes les fonctions publiques
- **Schemas Pydantic** : heritent de `CamelModel` (conversion automatique snake_case Python vers camelCase JSON). Les schemas d'entree utilisent `extra="forbid"` pour rejeter les champs inconnus
- **Modeles ORM** : utilisent `TenantMixin` (ajoute `organization_id` + timestamps) ou `TimestampMixin`
- **Enums PostgreSQL** : utiliser le helper `sa_enum()` qui stocke `.value` (lowercase), pas `.name`
- **Erreurs** : hierarchie `PraedixaError` (`NotFoundError`, `ForbiddenError`, `ConflictError`)

### TypeScript (apps + packages)

- **Linter** : ESLint 9 avec config TypeScript stricte
- **Formatter** : Prettier
- **TypeScript strict** active sur tous les projets
- **Props** : camelCase dans `packages/shared-types/`, coherent avec la convention JSON de l'API
- **Imports** : `@praedixa/ui` pour les composants, `@praedixa/shared-types` pour les types

### CSS / Design system

- **Couleurs** : espace colorimetrique OKLCH dans tous les fichiers Tailwind
- **Limitation connue** : ne pas utiliser `@apply` avec des modifiers d'opacite oklch -- utiliser du CSS brut a la place
- **Polices** : Plus Jakarta Sans (sans-serif), DM Serif Display (serif, titres H2)
- **Tokens** : `shadow-soft` (cards), `shadow-card` (tables), `shadow-glow` (amber)
- **Arrondis** : `rounded-2xl` (cards/tables), `rounded-lg` (boutons)

### Git

- Commits conventionnels encourages (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- Pull requests contre `main`
- Branches de feature : `feat/nom-de-la-feature`, `fix/description-du-bug`

## Workflow de developpement

### Cycle de travail

1. Creer une branche depuis `main` : `git checkout -b feat/ma-feature`
2. Developper avec les serveurs de dev (`pnpm dev:landing`, `pnpm dev:webapp`, etc.)
3. Ecrire les tests (100% de couverture obligatoire des deux cotes)
4. Verifier localement : `pnpm pre-commit`
5. Pousser et ouvrir une PR contre `main`

### Pre-commit hooks

Le projet utilise [prek](https://github.com/nicolo-ribaudo/prek) (Rust, rapide) pour executer tous les hooks. La configuration complete se trouve dans [`.pre-commit-config.yaml`](.pre-commit-config.yaml).

Les hooks executes, dans l'ordre :

| Hook                      | Description                                                              |
| ------------------------- | ------------------------------------------------------------------------ |
| `end-of-file-fixer`       | Assure un saut de ligne en fin de fichier                                |
| `trailing-whitespace`     | Supprime les espaces en fin de ligne                                     |
| `check-merge-conflict`    | Detecte les marqueurs de conflit Git oublies                             |
| `check-yaml`              | Valide la syntaxe YAML (sauf `pnpm-lock.yaml`)                           |
| `detect-private-key`      | Bloque les cles privees commitees par erreur                             |
| `check-added-large-files` | Refuse les fichiers > 500 KB                                             |
| `actionlint`              | Valide les workflows GitHub Actions                                      |
| `gitleaks`                | Detecte les secrets dans le code                                         |
| `bandit`                  | Analyse de securite Python (niveau LOW+)                                 |
| `ruff`                    | Lint Python (app-api)                                                    |
| `ruff-format`             | Verification du formatage Python                                         |
| `clean-artifacts`         | Supprime les artefacts de build obsoletes (`.next/`, `dist/`)            |
| `prettier`                | Verification du formatage TypeScript/JSON/Markdown                       |
| `eslint`                  | Lint TypeScript/JSX                                                      |
| `typecheck`               | Verification des types TypeScript (`tsc --build`)                        |
| `test`                    | Tests unitaires frontend (Vitest)                                        |
| `pytest`                  | Tests unitaires + integration + securite backend (Pytest, 100% coverage) |
| `build`                   | Build complet Next.js (shared-types -> ui -> landing -> webapp -> admin) |
| `pip-audit`               | Audit des dependances Python                                             |
| `pnpm audit`              | Audit des dependances JavaScript (high/critical)                         |

Pour tout lancer d'un coup :

```bash
pnpm pre-commit
```

### CI/CD

La CI execute les memes verifications sur chaque PR et chaque push sur `main`. Trois workflows GitHub Actions :

| Workflow       | Fichier                                                            | Declencheur                                  |
| -------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| CI (principal) | [`.github/workflows/ci.yml`](.github/workflows/ci.yml)             | PR + push sur `main`                         |
| CI -- API      | [`.github/workflows/ci-api.yml`](.github/workflows/ci-api.yml)     | Changements dans `app-api/`                  |
| CI -- Admin    | [`.github/workflows/ci-admin.yml`](.github/workflows/ci-admin.yml) | Changements dans `app-admin/` ou `packages/` |

Le workflow principal inclut : pre-commit checks, security audit, secret scanning (Gitleaks), bundle size check, frontend coverage gate, E2E Playwright, et deploiement Cloudflare Workers (sur push `main` uniquement).

## Cookbook : ajouter une feature backend

Suivre cet ordre pour chaque nouvelle fonctionnalite API :

```
1. Model        app-api/app/models/mon_model.py       (SQLAlchemy, TenantMixin)
2. Migration    uv run alembic revision --autogenerate -m "add mon_model"
3. Schema       app-api/app/schemas/mon_schema.py      (Pydantic, CamelModel)
4. Service      app-api/app/services/mon_service.py     (logique metier)
5. Router       app-api/app/routers/mon_router.py       (endpoints FastAPI)
6. Tests        app-api/tests/unit/test_mon_service.py
                app-api/tests/integration/test_mon_router.py
                app-api/tests/security/test_mon_isolation.py
```

Enregistrer le router dans [`app-api/app/main.py`](app-api/app/main.py) :

```python
from app.routers import mon_router
app.include_router(mon_router.router, prefix="/api/v1/mon-endpoint", tags=["mon-endpoint"])
```

Pour les routes admin, composer sous le routeur `admin_backoffice` (prefix `/api/v1/admin/`).

## Cookbook : ajouter une feature frontend

```
1. Types        packages/shared-types/src/       (si nouveau type metier)
2. Composant    packages/ui/src/components/      (si composant reutilisable)
3. Page/hook    app-webapp/app/ ou app-admin/app/
4. Tests        Co-localises dans __tests__/
```

L'ordre de build est critique : **shared-types -> ui -> apps**. Apres modification d'un package partage :

```bash
pnpm build   # Recompile tout dans le bon ordre
```

## Cookbook : ajouter un composant UI

```bash
# 1. Creer le composant
#    packages/ui/src/components/MonComposant.tsx

# 2. L'exporter depuis l'index
#    packages/ui/src/index.ts  →  export { MonComposant } from "./components/MonComposant";

# 3. Ecrire les tests
#    packages/ui/src/components/__tests__/MonComposant.test.tsx

# 4. Recompiler le package
pnpm --filter @praedixa/ui build

# 5. Utiliser dans les apps
import { MonComposant } from "@praedixa/ui";
```

Points d'attention sur les composants existants :

- `DataTable` : utilise `label` (pas `header`) pour les definitions de colonnes
- `StatCard` : `.value` doit etre `String()`, `.icon` doit etre un element JSX (pas une reference de composant)

## Cookbook : ajouter une migration Alembic

```bash
cd app-api

# Generer la migration automatiquement depuis les changements de models
uv run alembic revision --autogenerate -m "description claire et concise"

# Verifier qu'il n'y a qu'une seule tete (obligatoire)
uv run alembic heads

# Appliquer
uv run alembic upgrade head
```

**Piege connu avec les ENUM PostgreSQL** : `sa.Enum(create_type=False)` est silencieusement ignore. Utiliser a la place :

```python
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM

# Dans la migration, creer l'enum via SQL brut :
op.execute("""
    DO $$ BEGIN
        CREATE TYPE mon_enum AS ENUM ('valeur_a', 'valeur_b');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
""")

# Puis referencer avec create_type=False :
sa.Column("status", PG_ENUM("valeur_a", "valeur_b", name="mon_enum", create_type=False))
```

Si plusieurs developpeurs creent des migrations en parallele, verifier `alembic heads` apres merge et corriger la chaine manuellement si necessaire.

## Qualite obligatoire

Toute PR doit satisfaire ces criteres avant d'etre fusionnee :

- **100% de couverture de tests** frontend (Vitest) ET backend (Pytest) -- sans exception
- **Tests de securite** obligatoires pour tout nouvel endpoint touchant des donnees multi-tenant (isolation tenant, IDOR, escalade de role)
- **Pre-commit complet** : `pnpm pre-commit` doit passer sans erreur
- **Pas de secrets dans le code** : gitleaks bloque automatiquement
- **Pas de vulnerabilites connues** : pip-audit et pnpm audit verifient les dependances

Pour les tests backend, utiliser `SimpleNamespace` (pas `MagicMock`) pour les mocks ORM -- c'est requis pour la compatibilite `Pydantic.model_validate`. Les helpers `make_mock_session()`, `make_scalar_result()`, `make_scalars_result()` sont disponibles dans [`app-api/tests/unit/conftest.py`](app-api/tests/unit/conftest.py).

## Index de la documentation

| Document                                                                                   | Contenu                                            |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| [`README.md`](README.md)                                                                   | Vue d'ensemble et setup complet                    |
| [`CLAUDE.md`](CLAUDE.md)                                                                   | Reference technique (architecture, auth, patterns) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)                                                       | Ce fichier -- guide de contribution                |
| [`docs/deployment/scaleway-container.md`](docs/deployment/scaleway-container.md)           | Deploiement API sur Scaleway                       |
| [`docs/deployment/scaleway-setup.md`](docs/deployment/scaleway-setup.md)                   | Configuration infra Scaleway                       |
| [`docs/security/backend-audit.md`](docs/security/backend-audit.md)                         | Audit de securite backend                          |
| [`docs/security/frontend-audit.md`](docs/security/frontend-audit.md)                       | Audit de securite frontend                         |
| [`docs/security/stride-threat-model.md`](docs/security/stride-threat-model.md)             | Modele de menaces STRIDE                           |
| [`docs/security/rgpd-checklist.md`](docs/security/rgpd-checklist.md)                       | Checklist conformite RGPD                          |
| [`docs/security/pii-classification.md`](docs/security/pii-classification.md)               | Classification des donnees personnelles            |
| [`docs/security/security-posture-report.md`](docs/security/security-posture-report.md)     | Rapport de posture securite                        |
| [`docs/security/infra-hardening-checklist.md`](docs/security/infra-hardening-checklist.md) | Checklist durcissement infra                       |
| [`docs/security/devops-audit.md`](docs/security/devops-audit.md)                           | Audit DevOps                                       |
| [`docs/security/test-gap-analysis.md`](docs/security/test-gap-analysis.md)                 | Analyse des lacunes de tests                       |
| [`docs/ux-redesign-webapp.md`](docs/ux-redesign-webapp.md)                                 | Specs UX redesign webapp                           |
| [`docs/project-context.md`](docs/project-context.md)                                       | Contexte projet et vision                          |
| [`docs/presentation-praedixa.md`](docs/presentation-praedixa.md)                           | Presentation Praedixa                              |
| [`docs/runbooks/incident-freeze-unfreeze.md`](docs/runbooks/incident-freeze-unfreeze.md)   | Runbook gel/degel incident                         |
| [`app-landing/README.md`](app-landing/README.md)                                           | Documentation landing page                         |
| [`app-webapp/README.md`](app-webapp/README.md)                                             | Documentation webapp client                        |
| [`app-admin/README.md`](app-admin/README.md)                                               | Documentation back-office admin                    |
| [`app-api/README.md`](app-api/README.md)                                                   | Documentation API backend                          |
