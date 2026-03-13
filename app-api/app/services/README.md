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
  - `medallion_reprocessing.py`
  - `raw_inserter.py`
  - `transform_engine.py`
  - `schema_manager.py`
  - `ingestion_log_watermark.py`

- Integrations et workers runtime
  - `integration_event_ingestor.py`
  - `integration_runtime_worker.py`
  - `org_provisioning.py`
  - `organization_foundation.py`

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
- `medallion_reprocessing.py` porte les interfaces append-only de quarantaine/replay/backfill (`quarantine/_manifests/*.json`, `reports/reprocessing/*.json`) et doit rester disjoint du control plane TS.
- `app-connectors` via les workers d'integration runtime.

## Points d'attention

- Tout ce qui touche aux integrations et aux payloads bruts est sensible.
- `organization_foundation.py` porte maintenant a lui seul les etapes persistantes 1-4 du bootstrap (organisation, sites, departements, datasets).
- `org_provisioning.py` consomme directement `organization_foundation.py` sans flags legacy de bootstrap; `seed_full_demo.py` le reutilise ensuite pour rajouter uniquement les artefacts operationnels de demo.
- `gold_live_data.py` doit echouer explicitement si le Gold contient encore des colonnes runtime legacy `mock_*`; il ne canonicalise plus ces colonnes silencieusement.
- `gold_live_data.py` resolve maintenant le scope client/site en mode strict: pas d'alias demo, pas d'heuristique d'overlap, pas de code site hors allowlist.
- `scenario_engine_service.py` exige une configuration de cout explicite et marque `selection_state=no_gap` quand aucun gap n'est present; aucun zero par defaut n'est accepte pour combler une config manquante.
- `file_parser.py`, `proof_pack_pdf_service.py` et `integration_runtime_worker.py` doivent rester compatibles `mypy` strict: ces services sont executes dans les hooks qualite et servent de frontieres de confiance.
- `model_registry.py` et `model_inference_jobs.py` doivent aussi rester compatibles `mypy` strict: ils portent les controles d'integrite MLOps et les jobs batch verifies par les gates locaux.
- `integration_runtime_worker.py`, `transform_engine.py` et les scripts batch qui les pilotent doivent emettre des logs JSON via le helper `structlog` de `app.core.telemetry`, avec les champs `request_id`, `run_id`, `connector_run_id`, `organization_id` et `trace_id` laisses a `null` quand ils ne s'appliquent pas.
