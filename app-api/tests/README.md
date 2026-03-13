# `tests/` - Tests Pytest du moteur Python

## Role

Ce dossier verifie les briques Python data, integration runtime et hardening securite.

## Fichiers actuels

- `test_data_engine_core.py`
  - coeur pipeline/data engine
- `test_integration_core.py`
  - primitives integrations
- `test_integration_event_ingestor.py`
  - ingestion des evenements issus du runtime connecteurs
- `test_integration_runtime_worker.py`
  - worker de drainage/traitement runtime
- `test_org_provisioning.py`
  - garde-fou contre le couplage entre bootstrap reel d'organisation et seeds operationnels de demo, y compris le contrat direct sans flags legacy entre `org_provisioning` et `organization_foundation`
- `test_telemetry.py`
  - format JSON et preservation des champs de correlation Python
- `test_security_hardening.py`
  - garde-fous securite et invariants
- `test_medallion_reprocessing.py`
  - manifests de quarantaine append-only, planning replay/backfill et reprocess medaillon cible
- `test_decision_contracts.py`
  - invariants no-legacy du Gold/medallion, blueprints scenario fail-close et preuve explicite `proved` / `cannot_prove_yet`
- `test_gold_live_data_resolution.py`
  - resolution stricte du scope client/site sans alias demo ni heuristiques hors allowlist

## Commandes

```bash
cd app-api
uv run pytest -q
uv run pytest tests/test_integration_runtime_worker.py -q
uv run pytest tests/test_org_provisioning.py -q
uv run pytest tests/test_telemetry.py -q
uv run pytest tests/test_medallion_reprocessing.py -q
```

## Ce que ces tests couvrent

- compatibilite entre le control plane connecteurs et l'ingestion Python
- securite de la config et des workers
- robustesse du pipeline medallion
- quarantaine append-only et commandes de replay/backfill sur le data-plane Python
- separation entre bootstrap foundation d'organisation et donnees operationnelles de demo
- format des logs structures et propagation des champs de correlation sur les frontieres Python
- rejection fail-close des datasets/colonnes runtime legacy et resolution stricte du scope Gold
