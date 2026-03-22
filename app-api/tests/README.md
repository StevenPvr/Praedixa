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
- `test_integration_sftp_runtime_worker.py`
  - chemin `sftpPull` : listing, import dataset et persistance du curseur runtime
- `test_integration_sync_queue_worker.py`
  - orchestration batch `sync queue` au-dessus du runtime connectors
- `test_provider_sync_salesforce.py`
  - premier adaptateur `Salesforce` `L2`: dispatcher provider, client REST pagine et batching d'ingestion runtime
- `test_provider_sync_ukg.py`
  - second adaptateur `UKG` `L2`: dispatcher provider, client REST pagine, headers tenant et batching d'ingestion runtime
- `test_provider_sync_toast.py`
  - troisieme adaptateur `Toast` `L2`: dispatcher provider, client REST pagine, header restaurant et batching d'ingestion runtime
- `test_provider_sync_geotab.py`
  - quatrieme adaptateur `Geotab` `L2`: dispatcher provider, client JSON-RPC `Authenticate` / `GetFeed`, bootstrap `Device` et persistance `fromVersion`
- `test_provider_sync_olo.py`
  - cinquieme adaptateur `Olo` `L2`: dispatcher provider, client REST pagine et batching d'ingestion runtime
- `test_provider_sync_fourth.py`
  - sixieme adaptateur `Fourth` `L2`: dispatcher provider, client REST pagine et batching d'ingestion runtime
- `test_provider_sync_oracle_tm.py`
  - septieme adaptateur `Oracle TM` `L2`: dispatcher provider, client REST pagine `oauth2` et batching d'ingestion runtime
- `test_provider_sync_sap_tm.py`
  - huitieme adaptateur `SAP TM` `L2`: dispatcher provider, client OData/REST pagine `oauth2` et batching d'ingestion runtime
- `test_provider_sync_manhattan.py`
  - neuvieme adaptateur `Manhattan` `L2`: dispatcher provider, client REST pagine `api_key` et batching d'ingestion runtime
- `test_provider_sync_blue_yonder.py`
  - dixieme adaptateur `Blue Yonder` `L2`: dispatcher provider, client REST pagine `api_key` et batching d'ingestion runtime
- `test_provider_sync_ncr_aloha.py`
  - onzieme adaptateur `NCR Aloha` `L2`: dispatcher provider, client REST pagine `api_key` et batching d'ingestion runtime
- `test_provider_sync_cdk.py`
  - douzieme adaptateur `CDK` `L2`: dispatcher provider, client REST pagine `service_account`, auth Basic runtime scellee et batching d'ingestion runtime
- `test_provider_sync_reynolds.py`
  - treizieme adaptateur `Reynolds` `L2`: dispatcher provider, client REST pagine `service_account`, auth Basic runtime scellee et batching d'ingestion runtime
- `test_org_provisioning.py`
  - garde-fou contre le couplage entre bootstrap reel d'organisation et seeds operationnels de demo, y compris le contrat direct sans flags legacy entre `org_provisioning` et `organization_foundation`
- `test_telemetry.py`
  - format JSON et preservation des champs de correlation Python
- `test_security_hardening.py`
  - garde-fous securite et invariants
- `test_medallion_reprocessing.py`
  - manifests de quarantaine append-only, planning replay/backfill et reprocess medaillon cible
- `test_medallion_pipeline_base.py`
  - helpers de coercition scalaire `to_float` / `coerce_scalar`
- `test_medallion_pipeline_quality.py`
  - construction Silver dense, heuristique de valeurs manquantes, ridge causal et clamp outlier
- `test_medallion_pipeline_features.py`
  - cache/intervalles vacances scolaires, features externes et lag/rolling Gold
- `test_decision_contracts.py`
  - invariants no-legacy du Gold/medallion, blueprints scenario fail-close et preuve explicite `proved` / `cannot_prove_yet`
- `test_gold_live_data_resolution.py`
  - resolution stricte du scope client/site sans alias demo ni heuristiques hors allowlist

## Commandes

```bash
cd app-api
uv run pytest -q
uv run pytest tests/test_integration_runtime_worker.py -q
uv run pytest tests/test_integration_sftp_runtime_worker.py -q
uv run pytest tests/test_integration_sync_queue_worker.py -q
uv run pytest tests/test_provider_sync_salesforce.py -q
uv run pytest tests/test_provider_sync_ukg.py -q
uv run pytest tests/test_provider_sync_toast.py -q
uv run pytest tests/test_provider_sync_geotab.py -q
uv run pytest tests/test_provider_sync_olo.py -q
uv run pytest tests/test_provider_sync_fourth.py -q
uv run pytest tests/test_provider_sync_oracle_tm.py -q
uv run pytest tests/test_provider_sync_sap_tm.py -q
uv run pytest tests/test_provider_sync_manhattan.py -q
uv run pytest tests/test_provider_sync_blue_yonder.py -q
uv run pytest tests/test_provider_sync_ncr_aloha.py -q
uv run pytest tests/test_org_provisioning.py -q
uv run pytest tests/test_telemetry.py -q
uv run pytest tests/test_medallion_reprocessing.py -q
uv run pytest tests/test_medallion_pipeline_base.py -q
uv run pytest tests/test_medallion_pipeline_quality.py -q
uv run pytest tests/test_medallion_pipeline_features.py -q
```

## Ce que ces tests couvrent

- compatibilite entre le control plane connecteurs et l'ingestion Python
- orchestration claim -> traitement -> completion/echec des `integration_sync_runs`
- extraction provider `Salesforce -> raw events runtime -> drain dataset`, y compris pagination REST et batching d'ingestion interne
- extraction provider `UKG -> raw events runtime -> drain dataset`, y compris pagination REST, `global-tenant-id` et endpoints edition-aware
- extraction provider `Toast -> raw events runtime -> drain dataset`, y compris pagination REST, `Toast-Restaurant-External-ID` et endpoints configures par objet
- extraction provider `Geotab -> raw events runtime -> drain dataset`, y compris auth `session`, `GetFeed`, bootstrap `Device` et persistance `fromVersion`
- extraction provider `Olo -> raw events runtime -> drain dataset`, y compris pagination REST et endpoints configures par objet
- extraction provider `Fourth -> raw events runtime -> drain dataset`, y compris pagination REST et endpoints configures par objet
- extraction provider `Oracle TM -> raw events runtime -> drain dataset`, y compris pagination REST `oauth2` et endpoints configures par objet
- extraction provider `SAP TM -> raw events runtime -> drain dataset`, y compris pagination OData/REST `oauth2` et endpoints configures par objet
- extraction provider `Manhattan -> raw events runtime -> drain dataset`, y compris pagination REST `api_key` et endpoints configures par objet
- extraction provider `Blue Yonder -> raw events runtime -> drain dataset`, y compris pagination REST `api_key` et endpoints configures par objet
- extraction provider `NCR Aloha -> raw events runtime -> drain dataset`, y compris pagination REST `api_key` et endpoints configures par objet
- extraction provider `CDK -> raw events runtime -> drain dataset`, y compris pagination REST `service_account` et endpoints configures par objet
- extraction provider `Reynolds -> raw events runtime -> drain dataset`, y compris pagination REST `service_account` et endpoints configures par objet
- execution `SFTP CSV/TSV/XLSX -> dataset/raw` avec curseur runtime et archivage best-effort
- securite de la config et des workers
- robustesse du pipeline medallion
- coercition scalaire, construction Silver dense, heuristique de valeurs manquantes et ridge causal
- features externes, vacances scolaires et lag/rolling Gold
- quarantaine append-only et commandes de replay/backfill sur le data-plane Python
- separation entre bootstrap foundation d'organisation et donnees operationnelles de demo
- format des logs structures et propagation des champs de correlation sur les frontieres Python
- rejection fail-close des datasets/colonnes runtime legacy et resolution stricte du scope Gold
