# `app/models/` - Modele de donnees SQLAlchemy

## Role

Source de verite Python sur le schema PostgreSQL durable du domaine Praedixa.

Lire aussi:

- `docs/DATABASE.md` pour la synthese durable schema/runtime.
- `docs/cto/04-schema-public-postgres.md` pour le dictionnaire CTO table par table.
- `docs/cto/07-connecteurs-et-sync-runs.md` et `docs/architecture/adr/ADR-004-source-de-verite-runtime-integrations.md` pour la lecture correcte du domaine integrations.

## Fichiers de base

- `base.py` : `Base`, `TimestampMixin`, `TenantMixin`
- `organization.py`, `site.py`, `department.py`, `user.py` : coeur tenant, structure client et RBAC

## Domaines couverts

- Operationnel
  - `operational.py` : `canonical_records`, `cost_parameters`, `coverage_alerts`, `scenario_options`, `operational_decisions`, `proof_records`
  - `decisionops_runtime.py` : read-models persistants DecisionOps (`decision_approvals`, `action_dispatches`, `decision_ledger_entries`)
  - `daily_forecast.py`, `forecast_run.py`
- Donnees et ingestion
  - `data_catalog.py` : datasets client, colonnes, logs d'ingestion, rapports qualite, historique de configuration pipeline
- Admin et gouvernance
  - `admin.py` : audit admin, onboarding, RGPD, historique de plan
  - `contact_request.py`
- Collaboration et support
  - `conversation.py`
- MLOps
  - `mlops.py` : registry, inference jobs, lineage, access logs
- Integrations
  - `integration.py` : cible relationnelle durable du control plane des integrations (`integration_connections`, `integration_sync_runs`, `integration_raw_events`, etc.)

## Comment s'integre ce dossier

- Alembic versionne ces modeles.
- Les services Python lisent/ecrivent ces tables dans le data plane Python.
- `app-api-ts` interroge surtout les tables exposees comme read-models ou mutations persistantes aux apps web et admin.
- `app-connectors` ne doit pas etre lu comme source de verite schema; son runtime operable converge vers ce modele durable pour les integrations, avec exceptions explicites pour secrets scelles et payloads bruts.
- `admin.py` ne doit plus supposer qu'un acteur admin OIDC existe toujours dans `users.id`; l'audit admin et l'historique de plan peuvent maintenant stocker aussi l'identite auth opaque separement du FK local.
- `admin.py` versionne aussi maintenant l'action d'audit `delete_org`, necessaire pour tracer la suppression definitive reservee aux clients test.
- `admin.py` garde maintenant `admin_audit_log.target_org_id` comme reference historique simple, sans FK vers `organizations`, afin que la suppression d'un tenant ne tente plus de muter un journal append-only.
