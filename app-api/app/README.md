# `app/` - Noyau Python Data/ML

## Role

Ce dossier contient le code Python versionne qui structure la persistance, les modeles de domaine et les services batch.

## Sous-dossiers

- `core/` : config, base de donnees, filtres tenant/site, validation et exceptions.
- `models/` : modeles SQLAlchemy du domaine Praedixa.
- `services/` : services batch, transformations, lecture Gold, bootstrap org, integration runtime.
- `services/quality/` : briques de qualite de donnees.
- `integrations/` : primitives transverses pour les integrations tierces.
- `schemas/` : schemas Pydantic encore utilises pour certains flux ML/MLOps.

## Comment ca s'integre avec le reste du monorepo

- `app-api-ts` lit les tables remplies ou maintenues par ces modeles/services.
- `app-connectors` envoie ou expose des donnees que `integration_runtime_worker.py` et `integration_event_ingestor.py` consomment ensuite.
- les scripts de `app-api/scripts/` assemblent ces briques pour les runs batch.
- `app/core/telemetry.py` fournit maintenant le logger `structlog` JSON et les champs de correlation communs pour les jobs data/ML qui servent de frontieres de confiance.
