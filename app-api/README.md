# Praedixa Data/ML Engine (Python)

Socle Python reserve aux pipelines Data/ML, aux jobs batch et aux primitives de persistance partagees.

## Objectif

- Industrialiser l'ingestion et la transformation Bronze -> Silver -> Gold.
- Maintenir les modeles SQLAlchemy et les migrations PostgreSQL du domaine.
- Fournir les services batch utilises par l'orchestration data, l'inference et l'integration runtime.
- Supporter le bootstrap et certains jobs operationnels sans exposer de backend HTTP produit.

## Ce que ce sous-arbre contient

- `app/`
  - primitives coeur: config, base de donnees, securite tenant/site, validation
  - modeles SQLAlchemy
  - services data, operational, admin batch, integration runtime
- `scripts/`
  - pipeline medallion
  - orchestrateur long-running
  - seeds et jobs utilitaires
- `config/medallion/`
  - aliases colonnes, geographie sites, config d'orchestrateur
- `alembic/`
  - migrations versionnees Postgres
- `tests/`
  - tests Pytest du moteur data et des garde-fous securite

## Sous-docs

- [app/README.md](./app/README.md)
- [app/core/README.md](./app/core/README.md)
- [app/models/README.md](./app/models/README.md)
- [app/services/README.md](./app/services/README.md)
- [app/services/quality/README.md](./app/services/quality/README.md)
- [app/integrations/README.md](./app/integrations/README.md)
- [app/integrations/core/README.md](./app/integrations/core/README.md)
- [app/schemas/README.md](./app/schemas/README.md)
- [scripts/README.md](./scripts/README.md)
- [config/medallion/README.md](./config/medallion/README.md)
- [alembic/README.md](./alembic/README.md)
- [alembic/versions/README.md](./alembic/versions/README.md)
- [tests/README.md](./tests/README.md)

## Workflows importants

Installation:

```bash
cd app-api
uv sync --extra dev
```

Pipeline:

```bash
cd app-api
uv run python -m scripts.medallion_pipeline --force-rebuild
uv run python -m scripts.medallion_orchestrator --config config/medallion/orchestrator.json
```

Tests:

```bash
cd app-api
uv run pytest -q
```

Qualite statique:

```bash
cd app-api
uv run ruff check .
uv run mypy app
```

Observabilite:

```bash
cd app-api
uv run pytest tests/test_telemetry.py -q
uv run python scripts/run_inference_job.py --org-id <uuid> --job-id <uuid> --request-id <req-id>
```

`app/core/telemetry.py` configure maintenant un logger `structlog` JSON pour les frontieres batch les plus sensibles du data plane. Les services `integration_runtime_worker.py`, `transform_engine.py` et le script `run_inference_job.py` bindent explicitement `request_id`, `run_id`, `connector_run_id`, `organization_id` et `trace_id` quand ils sont connus, et laissent ces champs a `null` sinon.

Le bootstrap reel d'une nouvelle organisation passe maintenant par `app/services/organization_foundation.py`; il s'arrete au socle persistant minimum et n'injecte plus les forecasts/alerts/decisions de `seed_full_demo.py`.
