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
- `test_security_hardening.py`
  - garde-fous securite et invariants

## Commandes

```bash
cd app-api
uv run pytest -q
uv run pytest tests/test_integration_runtime_worker.py -q
```

## Ce que ces tests couvrent

- compatibilite entre le control plane connecteurs et l'ingestion Python
- securite de la config et des workers
- robustesse du pipeline medallion
