# `alembic/versions/` - Historique des revisions

## Role

Chaque fichier de ce dossier est une migration ordonnee du schema PostgreSQL.

## Jalons visibles

- `001` a `010` : base schema, data catalog, roles, RLS, qualite, admin backoffice
  - `001_initial_schema.py` centralise maintenant les literals DDL repetes (`now()`, `organizations.id`, `users.id`, `employees.id`, `SET NULL`) en constantes locales pour garder la revision lisible et compatible Pylance/Sonar.
  - toutes les revisions `alembic/versions/*.py` annotent maintenant `from alembic import op` avec un ignore Pylance cible pour garder le contrat Alembic standard sans bruit statique inutile.
- `004_data_catalog_tables.py`
  - les literals `now()` et `client_datasets.id` sont maintenant centralises en constantes locales pour garder la migration compacte et lisible.
- `010_admin_backoffice.py`
  - les literals `now()`, `users.id`, `organizations.id` et `created_at DESC` sont maintenant centralises en constantes locales pour clarifier les audit tables et indexes composites.
- `012_operational_layer.py`
  - les literals `now()` et les references de FKs operatives sont maintenant centralises en constantes locales pour garder les tables de controle lisibles.
- `017_conversations.py`
  - les timestamps de conversation et de message reutilisent maintenant une constante locale `NOW_SQL` au lieu de repeter `now()`.
- `021_rgpd_erasure_persistence.py`
  - les timestamps et index temporels de la persistence RGPD reutilisent maintenant des constantes locales `NOW_SQL` / `CREATED_AT_DESC`.
- `022_super_admin_rls_bypass.py`
  - le downgrade rebranche maintenant la logique de policies via des helpers partages pour rester sous la limite de complexite cognitive.
- `028_onboarding_bpm_foundation.py`
  - les timestamps `now()` et les payloads JSONB vides `'"'"'{}'"'"'::jsonb` sont maintenant factorises en constantes locales dans le workflow BPM.
- `011` a `018` : operational layer, hardening RLS, conversations, capacity curves
- `019` a `025` : nettoyage legacy, watermark ingestion, RGPD, MLOps
- `026_integration_platform_foundation.py`
  - fondations persistance du plan de controle integrations
- `028_onboarding_bpm_foundation.py`
  - les definitions de colonnes longues restent now reflowees en multi-ligne pour garder les revisions Alembic sous la limite Ruff sans masquer la logique metier.
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
