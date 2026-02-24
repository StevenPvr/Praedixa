# Praedixa Data/ML Engine (Python)

Ce package Python ne contient plus de backend HTTP applicatif.

## Scope

- Pipeline medallion `bronze -> silver -> gold`
- Data quality batch
- Orchestration medallion
- Jobs inference/model registry (ML)

## Exemples

```bash
cd app-api
uv sync --extra dev
uv run python -m scripts.medallion_pipeline --force-rebuild
uv run python -m scripts.medallion_orchestrator --config config/medallion/orchestrator.json
uv run pytest tests/
```

## Structure

- `scripts/` : pipelines et jobs Data/ML
- `config/medallion/` : configuration des pipelines
- `app/models`, `app/services`, `app/core` : primitives data/ML
- `alembic/` : migrations PostgreSQL
