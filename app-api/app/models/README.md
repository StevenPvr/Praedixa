# `app/models/` - Modele de donnees SQLAlchemy

## Role

Source de verite Python sur la structure Postgres du domaine Praedixa.

## Fichiers de base

- `base.py` : `Base`, `TimestampMixin`, `TenantMixin`
- `organization.py`, `site.py`, `department.py`, `user.py` : coeur tenant, structure client et RBAC

## Domaines couverts

- Operationnel
  - `operational.py` : canonical, cost parameters, coverage alerts, scenarios, operational decisions, proof records
  - `daily_forecast.py`, `forecast_run.py`
- Donnees et ingestion
  - `data_catalog.py` : datasets client, colonnes, ingestion logs, rapports qualite, historique config pipeline
- Admin et gouvernance
  - `admin.py` : audit admin, onboarding, RGPD, historique de plan
  - `contact_request.py`
- Collaboration et support
  - `conversation.py`
- MLOps
  - `mlops.py` : registry, inference jobs, lineage, access logs
- Integrations
  - `integration.py` : connexions, sync runs, raw events, mappings, dead letters, webhooks, audit

## Comment s'integre ce dossier

- Alembic versionne ces modeles.
- Les services Python lisent/ecrivent ces tables.
- `app-api-ts` interroge surtout les tables exposees aux apps web.
