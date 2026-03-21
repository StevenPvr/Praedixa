# `alembic/versions/` - Historique des revisions

## Role

Chaque fichier de ce dossier est une migration ordonnee du schema PostgreSQL.

## Jalons visibles

- `001` a `010` : base schema, data catalog, roles, RLS, qualite, admin backoffice
- `011` a `018` : operational layer, hardening RLS, conversations, capacity curves
- `019` a `025` : nettoyage legacy, watermark ingestion, RGPD, MLOps
- `026_integration_platform_foundation.py`
  - fondations persistance du plan de controle integrations
- `030_admin_actor_auth_fallback.py`
  - permet aux audits admin et a l'historique de plan de conserver un acteur auth OIDC meme sans `users.id` local, pour eviter les rollbacks sur les mutations backoffice cross-org
- `031_admin_delete_org_audit_action.py`
  - ajoute `delete_org` a l'enum `adminauditaction` pour journaliser explicitement la suppression definitive reservee aux clients test
- `032_admin_audit_target_org_history.py`
  - retire la FK `admin_audit_log.target_org_id -> organizations.id` pour garder un identifiant historique d'org sans bloquer la suppression d'un tenant par le trigger append-only
- `597a0ce523b5_grant_create_on_database_to_owner.py`
  - grant/privileges DDL

## Regle pratique

Si un modele SQLAlchemy change, la migration correspondante doit etre ajoutee ici et documentee dans le README du dossier concerne si le flux operateur change aussi.
