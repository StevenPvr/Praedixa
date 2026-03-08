# `app/services/quality/` - Briques qualite de donnees

## Role

Ce sous-dossier porte les transformations qualitatives reutilisables dans la couche Silver.

## Modules

- `deduplication.py` : suppression/gestion des doublons.
- `missing_imputation.py` : strategies d'imputation des valeurs manquantes.
- `outlier_detection.py` : detection/bridage des outliers.
- `types.py` : types et structures partages.

## Integration

Ces briques sont appelees par le pipeline medallion et les services de transformation, pas directement par les frontends.
