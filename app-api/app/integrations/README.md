# `app/integrations/` - Primitives integrations tierces

## Role

Ce dossier porte les briques transverses pour les connecteurs externes, distinctes du runtime HTTP `app-connectors`.

## Structure

- `core/` : auth, idempotency, pagination, retry, webhooks.

## Positionnement

- `app-connectors` gere le control plane et l'onboarding HTTP des connexions.
- `app-api/app/services/integration_event_ingestor.py` et `integration_runtime_worker.py` consomment ensuite les evenements et payloads.
- Ce dossier fournit les utilitaires partageables pour ces flux.
