# `app/core/` - Fondations runtime Python

## Role

Primitives communes utilisees par les scripts, services et modeles.

## Fichiers importants

- `config.py` : `Settings` Pydantic du moteur Python.
- `database.py` : session DB et integration transactionnelle.
- `security.py` : `TenantFilter` et `SiteFilter` pour l'isolation applicative.
- `exceptions.py` : erreurs metier partagees (`PraedixaError`, `NotFoundError`, `ForbiddenError`, `ConflictError`).
- `pagination.py` : helpers de pagination batch/API.
- `ddl_connection.py` / `ddl_validation.py` : garde-fous DDL et connexions privilegiees.
- `validation.py` / `yaml_validation.py` : validation applicative et YAML.
- `pipeline_config.py` : validation de la config medallion/orchestrateur.
- `key_management.py` : providers de cles locaux et Scaleway Secrets.

## Invariants

- Toute lecture/criture tenant-scoped doit passer par `TenantFilter`.
- Les chemins DDL/secret management sont plus sensibles que le code service standard.
- Les scripts batch s'appuient ici plutot que de reimplementer config, DB et validation.
