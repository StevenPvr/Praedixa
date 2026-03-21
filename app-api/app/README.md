# `app/` - Noyau Python Data/ML

## Role

Ce dossier contient le code Python versionne qui structure la persistance, les modeles de domaine et les services batch.

## Sous-dossiers

- `core/` : config, base de donnees, filtres tenant/site, validation et exceptions.
- `models/` : modeles SQLAlchemy du domaine Praedixa.
- `services/` : services batch, transformations, lecture Gold, bootstrap org, integration runtime et sync queue connectors.
- `services/quality/` : briques de qualite de donnees.
- `integrations/` : primitives transverses pour les integrations tierces et adaptateurs vendor-specifiques (`Salesforce`, `UKG`, `Toast`, `Geotab`, `Olo`, `Fourth`, `Oracle TM`, `SAP TM`, `Manhattan`, `Blue Yonder`, `NCR Aloha`, `CDK`, `Reynolds`).
- `schemas/` : schemas Pydantic encore utilises pour certains flux ML/MLOps.

## Comment ca s'integre avec le reste du monorepo

- `app-api-ts` lit les tables remplies ou maintenues par ces modeles/services.
- `app-connectors` envoie ou expose des donnees que `integration_runtime_worker.py` et `integration_event_ingestor.py` consomment ensuite, puis `integration_sync_queue_worker.py` / `scripts/integration_sync_worker.py` orchestrent la consommation batch des `sync_runs`, y compris les chemins `Salesforce provider pull`, `UKG provider pull`, `Toast provider pull`, `Geotab provider pull`, `Olo provider pull`, `Fourth provider pull`, `Oracle TM provider pull`, `SAP TM provider pull`, `Manhattan provider pull`, `Blue Yonder provider pull`, `NCR Aloha provider pull`, `CDK provider pull`, `Reynolds provider pull` et `sftpPull`.
- les scripts de `app-api/scripts/` assemblent ces briques pour les runs batch.
- `app/core/telemetry.py` fournit maintenant le logger `structlog` JSON et les champs de correlation communs pour les jobs data/ML qui servent de frontieres de confiance.
