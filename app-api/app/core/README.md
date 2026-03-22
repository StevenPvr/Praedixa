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
  - le message de destruction des cles est centralise pour eviter les doublons de litteral dans les providers.
- `telemetry.py` : logs JSON structures et contexte de correlation pour les jobs data/ML.
  - `TelemetryContext.bind()` retourne explicitement un `TelemetryContext` pour rester compatible avec Pyright/Pylance strict.

## Invariants

- Toute lecture/criture tenant-scoped doit passer par `TenantFilter`.
- Les chemins DDL/secret management sont plus sensibles que le code service standard.
- Les scripts batch s'appuient ici plutot que de reimplementer config, DB et validation.
- Les services batch frontiere doivent binder `request_id`, `run_id`, `connector_run_id`, `organization_id` et `trace_id` via `telemetry.py` au lieu de reconstruire leur propre format de logs.
- `config.py` et `yaml_validation.py` servent maintenant de frontieres Pyright strict prioritaires: les payloads dynamiques doivent y etre retrecis en types explicites (`TypedDict`, stubs locaux, guards) plutot que propagees en `dict[str, Any]` opaques.
- `ddl_validation.py`, `key_management.py`, `pipeline_config.py` et `telemetry.py` sont maintenant aussi sortis de la liste `pyright` ignoree: les helpers de validation, de cles et de logs doivent donc garder leurs frontieres `Any` strictement bornees et documentees.
