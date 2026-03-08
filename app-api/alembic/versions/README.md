# `alembic/versions/` - Historique des revisions

## Role

Chaque fichier de ce dossier est une migration ordonnee du schema PostgreSQL.

## Jalons visibles

- `001` a `010` : base schema, data catalog, roles, RLS, qualite, admin backoffice
- `011` a `018` : operational layer, hardening RLS, conversations, capacity curves
- `019` a `025` : nettoyage legacy, watermark ingestion, RGPD, MLOps
- `026_integration_platform_foundation.py`
  - fondations persistance du plan de controle integrations
- `597a0ce523b5_grant_create_on_database_to_owner.py`
  - grant/privileges DDL

## Regle pratique

Si un modele SQLAlchemy change, la migration correspondante doit etre ajoutee ici et documentee dans le README du dossier concerne si le flux operateur change aussi.
