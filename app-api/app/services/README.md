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
  - `integration_dataset_file_ingestor.py`
  - `integration_sftp_runtime_worker.py`
  - `medallion_reprocessing.py`
  - `raw_inserter.py`
  - `transform_engine.py`
  - `schema_manager.py`
  - `ingestion_log_watermark.py`

- Integrations et workers runtime
  - `integration_event_ingestor.py`
  - `integration_runtime_worker.py`
  - `integration_sync_queue_worker.py`
  - `integration_sftp_runtime_worker.py`
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
- `app-connectors` via les workers d'integration runtime, les routes internes `provider access-context` / `provider-events` et la queue `sync_runs`.
- `integration_sync_queue_worker.py` orchestre la consommation batch de `sync_runs` en s'appuyant sur `integration_runtime_worker.py`, et `scripts/integration_sync_worker.py` expose ce worker comme point d'entree batch.

## Points d'attention

- Tout ce qui touche aux integrations et aux payloads bruts est sensible.
- `organization_foundation.py` porte maintenant a lui seul les etapes persistantes 1-4 du bootstrap (organisation, sites, departements, datasets).
- `org_provisioning.py` consomme directement `organization_foundation.py` sans flags legacy de bootstrap; `seed_full_demo.py` le reutilise ensuite pour rajouter uniquement les artefacts operationnels de demo.
- `gold_live_data.py` doit echouer explicitement si le Gold contient encore des colonnes runtime legacy `mock_*`; il ne canonicalise plus ces colonnes silencieusement.
- `gold_live_data.py` resolve maintenant le scope client/site en mode strict: pas d'alias demo, pas d'heuristique d'overlap, pas de code site hors allowlist.
- `scenario_engine_service.py` exige une configuration de cout explicite et marque `selection_state=no_gap` quand aucun gap n'est present; aucun zero par defaut n'est accepte pour combler une config manquante.
- `file_parser.py`, `proof_pack_pdf_service.py` et `integration_runtime_worker.py` doivent rester compatibles `mypy` strict: ces services sont executes dans les hooks qualite et servent de frontieres de confiance.
- `file_parser.py` est une frontiere de confiance stricte: seuls les fichiers explicitement suffixes en `csv`, `tsv` ou `xlsx` sont acceptes; les fichiers sans extension, `xls`, `xlsm` et `xlsb` doivent echouer ferme meme si un appelant tente de forcer `format_hint="xlsx"`.
- `integration_runtime_worker.py` ne doit plus laisser une queue `sync_runs` purement declarative: toute nouvelle evolution de `triggerSync(...)` doit rester compatible avec `integration_sync_queue_worker.py` et `scripts/integration_sync_worker.py`.
- `integration_runtime_worker.py` porte maintenant deux chemins runtime distincts:
  - `provider pull` pour les adaptateurs vendor-specifiques (`Salesforce`, `UKG`, `Toast`, `Geotab`, `Olo`, `Fourth`, `Oracle TM`, `SAP TM`, `Manhattan`, `Blue Yonder`, `NCR Aloha`, `CDK`, `Reynolds`) via `app/integrations/provider_sync.py` et `app/integrations/connectors/<vendor>/`
  - `sftpPull` pour les imports fichiers orchestrés par `integration_sftp_runtime_worker.py`
- pour `UKG`, le runtime passe maintenant aussi des headers provider additionnels (notamment `global-tenant-id`) et un `audience` OAuth client-credentials, afin de rester compatible avec les editions WFM qui exigent ces metadonnees.
- pour `Toast`, le runtime passe maintenant aussi le header provider additionnel `Toast-Restaurant-External-ID`; sans lui, l'adaptateur reste fail-close et ne demarre pas le pull POS.
- pour `Geotab`, le runtime passe maintenant des `credentialFields` internes de type `session` (`database`, `userName`, `password`) et l'adaptateur persiste un curseur `fromVersion` par `sourceObject` via `sync-state`.
- pour `Olo`, le runtime reste volontairement pilote par endpoints configures par objet (`Orders`, `Stores`, `Products`, `Promotions`) afin de rester compatible avec les contrats partenaires plus fermes.
- pour `Fourth`, le runtime separe maintenant explicitement le pull API `api_key` du chemin `sftpPull`; les deux existent, mais ne doivent pas etre confondus dans le control plane ni dans les workers Python.
- pour `Oracle TM`, le runtime reste volontairement pilote par endpoints configures par objet (`Shipment`, `OrderRelease`, `Route`, `Stop`) afin de rester compatible avec des tenants OTM tres personnalises.
- pour `SAP TM`, le runtime reste volontairement pilote par endpoints configures par objet (`FreightOrder`, `FreightUnit`, `Resource`, `Stop`) afin de rester compatible avec les variations OData/REST et le customizing SAP par client.
- pour `Manhattan`, le runtime reste volontairement pilote par endpoints configures par objet (`Wave`, `Task`, `Inventory`, `Shipment`) afin de rester compatible avec les variations Manhattan Active et les conventions process client.
- pour `Blue Yonder`, le runtime reste volontairement pilote par endpoints configures par objet (`DemandPlan`, `LaborPlan`, `Store`, `SKU`) afin de rester compatible avec la variete des modules et editions clientes.
- pour `NCR Aloha`, le runtime separe maintenant explicitement le pull API cloud `api_key` du chemin `sftpPull`; les deux existent, mais ne doivent pas etre confondus dans le control plane ni dans les workers Python.
- pour `CDK`, le runtime expose maintenant des `credentialFields` internes `service_account` (`clientId`, `clientSecret`) au worker Python, tout en gardant explicitement separe le chemin `sftpPull` fallback tant qu'il n'est pas certifie en `L2`.
- pour `Reynolds`, le runtime expose maintenant des `credentialFields` internes `service_account` (`clientId`, `clientSecret`) au worker Python, tout en gardant explicitement separe le chemin `sftpPull` fallback tant qu'il n'est pas certifie en `L2`.
- `integration_sftp_runtime_worker.py` ferme maintenant le cas `SFTP CSV/TSV/XLSX`: host-key pinning obligatoire au format OpenSSH `SHA256:<base64 sans padding>`, import direct vers dataset/raw, puis persistance d'un curseur runtime `sourceObject`.
- `model_registry.py` et `model_inference_jobs.py` doivent aussi rester compatibles `mypy` strict: ils portent les controles d'integrite MLOps et les jobs batch verifies par les gates locaux.
- `integration_runtime_worker.py`, `integration_sync_queue_worker.py`, `transform_engine.py` et les scripts batch qui les pilotent doivent emettre des logs JSON via le helper `structlog` de `app.core.telemetry`, avec les champs `request_id`, `run_id`, `connector_run_id`, `organization_id` et `trace_id` laisses a `null` quand ils ne s'appliquent pas.
- `integration_sync_queue_worker.py` pilote maintenant les claims runtime `sync-runs` dans des sessions DB isolees par tenant, puis delegue l'execution fine a `process_claimed_sync_run(...)`.
