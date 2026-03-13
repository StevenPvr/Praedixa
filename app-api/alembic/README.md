# `alembic/` - Migrations PostgreSQL Python

## Role

Infrastructure Alembic du schema SQLAlchemy Python.

## Fichiers

- `env.py` : integration Alembic / metadata SQLAlchemy
- `script.py.mako` : template des revisions
- `versions/` : historique versionne des migrations

## Commandes

```bash
cd app-api
uv run alembic upgrade head
uv run alembic current
uv run alembic history
```

## Positionnement

Le schema Python reste la reference historique des tables operationnelles, admin, datasets, MLOps et integrations consommees ailleurs dans le monorepo.

Les migrations recentes couvrent aussi la persistance DecisionOps read-model (`decision_approvals`, `action_dispatches`, `decision_ledger_entries`) avec RLS active des la creation.
