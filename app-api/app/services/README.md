# `app/services/` - Services batch, data et operations Python

## Role

Les services ici encapsulent la logique metier Python: transformations, bootstrap, lecture Gold, ingestion connecteurs et workflows admin batch.

## Grandes familles

- Couches operationnelles exposees indirectement a l'API TS
  - `dashboard.py`
  - `alerts.py`
  - `forecasts.py`
  - `datasets.py`
  - `decisions.py`
  - `decision_log_service.py`
  - `cost_parameter_service.py`
  - `proof_service.py`
  - `canonical_data_service.py`

- Lecture Gold et projection
  - `gold_live_data.py`
  - `scenario_engine_service.py`
  - `mock_forecast_service.py`

- Ingestion et transformation
  - `file_parser.py`
  - `column_mapper.py`
  - `raw_inserter.py`
  - `transform_engine.py`
  - `schema_manager.py`
  - `ingestion_log_watermark.py`

- Integrations et workers runtime
  - `integration_event_ingestor.py`
  - `integration_runtime_worker.py`
  - `org_provisioning.py`

- Admin et gouvernance
  - `admin_billing.py`
  - `admin_monitoring.py`
  - `admin_onboarding.py`
  - `admin_orgs.py`
  - `admin_users.py`
  - `rgpd_erasure.py`
  - `medical_masking.py`

- MLOps
  - `model_registry.py`
  - `model_inference_jobs.py`

## Dependances transverses

- `app/core/` pour config, securite, DB et exceptions.
- `app/models/` pour la persistance.
- `app/services/quality/` pour la qualite de donnees Silver.
- `app-connectors` via les workers d'integration runtime.

## Points d'attention

- Tout ce qui touche aux integrations et aux payloads bruts est sensible.
- `org_provisioning.py` est branche au bootstrap d'organisation.
- Certains services restent des ponts de compatibilite avec des contrats historiques encore lus par `app-api-ts`.
