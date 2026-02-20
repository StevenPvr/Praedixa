# Praedixa API

Backend de la plateforme Praedixa -- prevision de capacite pour sites logistiques. API multi-tenant avec back-office super-admin.

**Stack** : FastAPI 0.115+ | SQLAlchemy 2.0 async | PostgreSQL 16 | Alembic | Pydantic 2.10+ | PyJWT | structlog | slowapi

---

## Demarrage rapide

```bash
cp .env.example .env                                           # Adapter DATABASE_URL, AUTH_*
uv sync --extra dev                                            # Dependances Python
docker compose -f ../infra/docker-compose.yml up -d postgres   # PG 16 sur port 5433
uv run alembic upgrade head                                    # Migrations
uv run uvicorn app.main:app --reload --port 8000               # Serveur dev
```

OpenAPI docs : [localhost:8000/docs](http://localhost:8000/docs) (desactivee en production).

---

## Pipeline medaillon (Data Engineering)

Pipeline metadata-driven pour `bronze -> silver -> gold`:

- **Bronze** : landing immuable des fichiers bruts + manifest/checksum.
- **Silver** : dataset unique `site-jour` standardise, dedup, imputation causale,
  outliers robustes, indicateurs `is_imputed` / `imputation_method`.
- **Gold** : features ML (calendar encoding, meteo, vacances scolaires, lags, rolling)
  exportees en CSV dans `data-ready/gold/`.

Commande:

```bash
cd app-api
uv run python -m scripts.medallion_pipeline --force-rebuild
```

Mode event-driven (polling local):

```bash
cd app-api
uv run python -m scripts.medallion_pipeline --watch --poll-seconds 30
```

Orchestration production (scheduler + retries + alerting webhook):

```bash
cd app-api
uv run python -m scripts.medallion_orchestrator --config config/medallion/orchestrator.json
```

Metadonnees editables (intervention humaine minimale):

- `app-api/config/medallion/column_aliases.json`
- `app-api/config/medallion/site_locations.json`
- `app-api/config/medallion/orchestrator.json`

Anti-leakage temporel:

- Pas de backfill retroactif par defaut (fichiers anciens en quarantaine).
- Features et imputations **point-in-time** (pas d'information future).
- Agrégats mensuels injectés via **mois precedent uniquement**.

Template systemd:

- `infra/systemd/praedixa-medallion.service`

---

## Architecture en couches

```
app/
  routers/     Couche HTTP : validation, orchestration
  services/    Logique metier : queries DB, regles de gestion
  models/      ORM SQLAlchemy 2.0 : modeles, enums, mixins
  schemas/     Pydantic 2 : serialisation camelCase, validation
  core/        Transverse : auth, security, database, exceptions, config, middleware
scripts/       CLI : seed, ingestion
alembic/       Migrations (001 → 018)
tests/         unit/ | integration/ | security/
```

Flux d'une requete :

```
Request → Middleware (rate limit, audit, request-id)
        → Router (JWT, dependencies)
        → Service (TenantFilter, logique metier)
        → Models (ORM, PostgreSQL)
        → Response (CamelModel → JSON camelCase)
```

---

## Authentification & Autorisation

### Flux JWT

Chaque requete protegee suit la chaine : `extract_token(request)` → `verify_jwt(token)` → `JWTPayload` (frozen dataclass : `user_id`, `email`, `organization_id`, `role`, `site_id`).

**Algorithmes** : RS256 / ES256 / EdDSA (JWKS OIDC avec cache 5 min). `none` toujours rejete.

### Roles

Six roles dans `app_metadata` du JWT :

| Role          | Portee               | Acces type                           |
| ------------- | -------------------- | ------------------------------------ |
| `super_admin` | Cross-tenant         | Back-office admin complet            |
| `org_admin`   | Organisation entiere | Config, datasets, utilisateurs       |
| `hr_manager`  | Organisation / site  | Absences, decisions, previsions      |
| `manager`     | Site specifique      | Arbitrage, decisions operationnelles |
| `employee`    | Site specifique      | Lecture (limitee)                    |
| `viewer`      | Site specifique      | Lecture seule                        |

Protection par role, extrait de `app/core/security.py` :

```python
def require_role(*allowed_roles: str) -> Callable[..., JWTPayload]:
    from app.core.dependencies import get_current_user

    def _check_role(current_user: JWTPayload = Depends(get_current_user)) -> JWTPayload:
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return _check_role
```

Usage : `current_user: JWTPayload = Depends(require_role("org_admin", "manager"))`

---

## Multi-tenancy

Trois mecanismes complementaires assurent l'isolation des donnees.

**1. TenantFilter** (couche applicative) -- ajoute `WHERE organization_id = ?` a chaque query :

```python
class TenantFilter:
    def __init__(self, organization_id: str) -> None:
        self.organization_id = organization_id

    def apply(self, query: Select[Any], model: Any) -> Select[Any]:
        return query.where(model.organization_id == self.organization_id)
```

`get_tenant_filter` construit le filtre depuis le JWT de l'utilisateur ; `get_admin_tenant_filter` permet au `super_admin` de cibler n'importe quelle org via le path parameter `target_org_id`.

**2. SiteFilter** (couche site) -- restreint les resultats au `site_id` du JWT. `None` = pas de filtrage (cas `org_admin`).

**3. RLS PostgreSQL** (couche DB) -- `SET LOCAL app.current_organization_id` execute a chaque transaction via `ContextVar`. Policies dans les migrations 007 et 013.

---

## Inventaire des routers

### API Client (`/api/v1/`)

| Router                  | Prefix                   | Description                            | Role min                            |
| ----------------------- | ------------------------ | -------------------------------------- | ----------------------------------- |
| `health`                | `/health`                | Health check                           | --                                  |
| `dashboard`             | `/dashboard`             | KPI tableau de bord                    | Auth                                |
| `forecasts`             | `/forecasts`             | Runs de prevision, series journalieres | Auth                                |
| `alerts`                | `/alerts`                | Alertes dashboard, dismiss             | Auth                                |
| `organizations`         | `/`                      | Org courante, sites, departements      | Auth                                |
| `decisions`             | `/decisions`             | Decisions RH (create, review, outcome) | Auth                                |
| `arbitrage`             | `/arbitrage`             | Options d'arbitrage, validation        | `org_admin` / `manager`             |
| `datasets`              | `/datasets`              | Catalog, ingestion fichiers            | R: Auth, W: `org_admin`             |
| `transforms`            | `/transforms`            | Transformations incrementales, refit   | Auth                                |
| `canonical`             | `/canonical`             | Donnees canoniques (charge, capacite)  | R: Auth, W: `org_admin` / `manager` |
| `cost_parameters`       | `/cost-parameters`       | Couts par site (versions)              | R: Auth, W: `org_admin`             |
| `coverage_alerts`       | `/coverage-alerts`       | Alertes couverture (ack, resolve)      | Auth                                |
| `scenarios`             | `/scenarios`             | Scenarios par alerte, generation       | Auth                                |
| `operational_decisions` | `/operational-decisions` | Decisions ops (override, stats)        | Auth                                |
| `proof`                 | `/proof`                 | Proof records, summary, PDF            | R: Auth, W: `org_admin`             |
| `mock_forecast`         | `/mock-forecast`         | Previsions mock (dev/demo)             | Auth                                |
| `conversations`         | `/conversations`         | Messagerie tenant-scoped               | `org_admin`+                        |

### API Admin (`/api/v1/admin/`) -- `super_admin` requis

| Router                     | Sous-prefix                         | Description                                              |
| -------------------------- | ----------------------------------- | -------------------------------------------------------- |
| `admin` (RGPD)             | `erasure/`                          | Effacement RGPD (initier, approuver, executer, verifier) |
| `admin_orgs`               | `organizations`                     | CRUD orgs, suspend/reactivate/churn, hierarchie          |
| `admin_users`              | `organizations/{org_id}/users`      | Invite, role, desactivation                              |
| `admin_billing`            | `billing/organizations/{org_id}`    | Facturation, changement de plan                          |
| `admin_monitoring`         | `monitoring/`                       | Metriques plateforme, tendances, erreurs, ROI            |
| `admin_data`               | `organizations/{org_id}/`           | Datasets, ingestion, forecasts, decisions, absences      |
| `admin_onboarding`         | `onboarding`                        | Etats d'onboarding, progression par etape                |
| `admin_operational`        | `organizations/{org_id}/`           | Canonical, couts, alertes, proof par org                 |
| `admin_canonical`          | `organizations/{org_id}/canonical/` | Qualite canonique, couverture cross-org                  |
| `admin_alerts_overview`    | `monitoring/alerts/`                | Synthese alertes cross-org                               |
| `admin_scenarios`          | `monitoring/scenarios/`             | Synthese scenarios                                       |
| `admin_decisions_enhanced` | `monitoring/decisions/`             | Decisions, overrides, adoption                           |
| `admin_proof_packs`        | `monitoring/proof-packs/`           | Synthese proof packs                                     |
| `admin_cost_params`        | `monitoring/cost-params/`           | Couts manquants                                          |
| `admin_conversations`      | `conversations`                     | Messagerie cross-tenant                                  |
| audit-log                  | `audit-log`                         | Journal d'audit (filtre user, org, action, dates)        |

---

## Inventaire des modeles ORM

Les modeles heritent de `TenantMixin` (organization_id + timestamps) ou `TimestampMixin` (timestamps seuls). Definis dans `app/models/base.py`.

| Domaine          | Modeles (Mixin)                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Organisation** | `Organization` (Timestamp), `Site` (Tenant), `Department` (Tenant), `User` (Tenant)                                                                               |
| **RH**           | `Employee` (Tenant), `Absence` (Tenant)                                                                                                                           |
| **Previsions**   | `ForecastRun` (Tenant), `DailyForecast` (Tenant)                                                                                                                  |
| **Decisions**    | `Decision` (Tenant), `DashboardAlert` (Tenant), `ActionPlan` (Tenant)                                                                                             |
| **Operationnel** | `CanonicalRecord` (Tenant), `CostParameter` (Tenant), `CoverageAlert` (Tenant), `ScenarioOption` (Tenant), `OperationalDecision` (Tenant), `ProofRecord` (Tenant) |
| **Data Catalog** | `ClientDataset` (Tenant), `DatasetColumn` (Timestamp), `FitParameter` (--), `IngestionLog` (Timestamp), `QualityReport` (Timestamp), `PipelineConfigHistory` (--) |
| **Admin**        | `AdminAuditLog` (Timestamp), `PlanChangeHistory` (Timestamp), `OnboardingState` (Timestamp)                                                                       |
| **Messagerie**   | `Conversation` (Tenant), `Message` (Timestamp)                                                                                                                    |

27 modeles au total, regroupes dans `app/models/__init__.py` pour la decouverte Alembic.

---

## Conventions schemas

Tous les schemas heritent de `CamelModel` (`app/schemas/base.py`) :

```python
class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,   # snake_case → camelCase en JSON
        populate_by_name=True,      # Accepte les deux en entree
        from_attributes=True,       # Compatible model_validate(orm_object)
    )
```

- **Entree** : `extra="forbid"` (rejette les champs inconnus)
- **Sortie** : `TenantEntitySchema` (id + org_id + timestamps) ou `TimestampSchema`
- **Pagination** : `PaginationParams` (page, page*size, sort_by avec regex `^[a-z*]+$`, sort_order)
- **Reponses** : `SuccessResponse[T]` / `PaginatedResponse[T]` + `PaginationMeta`

---

## Gestion d'erreurs

| Exception        | Code        | HTTP | Usage                                           |
| ---------------- | ----------- | ---- | ----------------------------------------------- |
| `NotFoundError`  | `NOT_FOUND` | 404  | Ressource introuvable (ne reflete que les UUID) |
| `ForbiddenError` | `FORBIDDEN` | 403  | Acces refuse                                    |
| `ConflictError`  | `CONFLICT`  | 409  | Doublon, contrainte violee                      |

Format normalise de toutes les reponses d'erreur :

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Site not found" },
  "timestamp": "2026-02-10T14:30:00+00:00",
  "requestId": "abc-123"
}
```

Les 422 incluent `validationErrors` (field, message, code). Les stack traces ne sont **jamais** exposees en production.

---

## Base de donnees & Migrations

PostgreSQL 16 via `asyncpg` (pool: `pool_pre_ping=True`, `pool_size=5`, `max_overflow=10`).

```bash
uv run alembic upgrade head                                  # Appliquer
uv run alembic revision --autogenerate -m "description"      # Nouvelle migration
```

18 migrations (`001_initial_schema` → `018_daily_forecast_capacity_curves`). Convention : `NNN_description.py`.

**Piege PG ENUM** : `sa.Enum(create_type=False)` est silencieusement ignore. Utiliser `PG_ENUM(name=..., create_type=False)` avec creation raw SQL : `DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`. Le helper `sa_enum()` stocke les `.value` (lowercase), pas les `.name`.

---

## Tests

**Couverture 100% obligatoire** (`--cov-fail-under=100`). Trois niveaux :

```bash
uv run pytest                              # Tout
uv run pytest tests/unit/                  # Unitaires
uv run pytest tests/integration/           # Integration
uv run pytest tests/security/              # Securite
uv run pytest --no-cov                     # Sans couverture (rapide)
```

Mock helpers dans `tests/unit/conftest.py` : `make_mock_session()`, `make_scalar_result()`, `make_scalars_result()`, `make_all_result()`. Utiliser `SimpleNamespace` (pas `MagicMock`) pour les mocks ORM -- requis par `model_validate` de Pydantic.

Voir [`docs/security/test-gap-analysis.md`](../docs/security/test-gap-analysis.md) pour l'analyse de couverture.

---

## Docker & Deploiement

Dockerfile multi-stage : **builder** (`python:3.12-slim` + uv) → **production** (venv + app, user non-root `uid 65532`).

```bash
docker build -t praedixa-api .
docker run -p 8000:8000 --env-file .env praedixa-api
```

`docker-entrypoint.sh` execute `alembic upgrade head` puis lance uvicorn (2 workers prod, reload dev).

**Variables cles** : `DATABASE_URL`, `AUTH_JWKS_URL`, `AUTH_ISSUER_URL`, `AUTH_AUDIENCE`, `AUTH_ALLOWED_JWKS_HOSTS`, `CORS_ORIGINS`, `ENVIRONMENT`, `KEY_PROVIDER` (`scaleway` obligatoire en prod). Voir `.env.example`.

Deploiement Scaleway : [`docs/deployment/scaleway-container.md`](../docs/deployment/scaleway-container.md).

---

## Liens utiles

- [Architecture projet](../docs/project-context.md) | [Audit securite backend](../docs/security/backend-audit.md)
- [Deploiement Scaleway](../docs/deployment/scaleway-container.md) | [Modele STRIDE](../docs/security/stride-threat-model.md)
- [Classification PII / RGPD](../docs/security/pii-classification.md)
