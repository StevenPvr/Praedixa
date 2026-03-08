# `config/medallion/` - Configuration versionnee du pipeline

## Role

Configuration declarative lue par le pipeline et l'orchestrateur.

## Fichiers

- `column_aliases.json`
  - normalisation des colonnes source vers le schema Praedixa
- `site_locations.json`
  - metadonnees geographiques/site pour les enrichissements
- `orchestrator.json`
  - polling, retries, alerting, chemins racine et options d'execution

## Integration

- `scripts.medallion_pipeline` lit les aliases et la geographie.
- `scripts.medallion_orchestrator` lit `orchestrator.json`.
- `app/core/pipeline_config.py` pose les garde-fous de validation.
