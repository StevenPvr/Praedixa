# `app/integrations/core/` - Utilitaires transverses integrations

## Role

Utilitaires generiques reutilisables par les flux d'integration Python.

## Modules

- `auth.py` : helpers d'authentification pour appels integrations.
- `idempotency.py` : protection contre les doublons.
- `pagination.py` : iteration paginee sur APIs tierces.
- `retry.py` : retries et backoff.
- `webhooks.py` : helpers de verification/livraison webhook.

## Usage

Ces modules servent de base aux workers d'ingestion et aux futurs adaptateurs fournisseur, sans dependre du serveur TS.
