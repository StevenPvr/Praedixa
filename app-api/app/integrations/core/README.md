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

## Qualite

Les helpers de pagination, retry et idempotence doivent rester strictement types: ils sont reutilises a plusieurs frontieres d'integration et servent de socle aux gates `mypy`.
Les messages d'erreur de pagination cursor sont centralises dans `pagination.py` pour garder les retours invalides homogenes entre les extracteurs de connecteurs.
Le helper `retry.py` centralise aussi le calcul de backoff et le hook optionnel `on_retry` pour garder `run_with_retry()` lisible et testable.
La validation cursor de `pagination.py` est maintenant factorisee par type de payload pour rester sous les seuils de complexite cognitive.
