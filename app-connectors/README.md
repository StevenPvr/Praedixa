# app-connectors

Service runtime dedie aux connecteurs data Praedixa.

## Scope

- Catalogue central des connecteurs (CRM/WFM/POS/DMS/TMS)
- Gestion des connexions par organisation
- Parcours d'onboarding securise (`create` -> `authorize/start` -> `authorize/complete` -> `test` -> `sync`)
- Coffre-fort secret chiffre en memoire (AES-256-GCM)
- Audit trail des actions de connexion et de sync
- Surface HTTP securisee par tokens de service scopes par organisation

## Run local

```bash
pnpm --dir app-connectors dev
```

Variables:

- `PORT` (default `8100`)
- `HOST` (default `127.0.0.1` en `development`, `0.0.0.0` sinon)
- `NODE_ENV` (`development|staging|production`)
- `DATABASE_URL` (optionnel, active la persistance Postgres du runtime connecteurs)
- `CONNECTORS_SERVICE_TOKENS` (JSON requis, ex. `[{"name":"webapp","token":"...","allowedOrgs":["org-1"]}]`)
- `CONNECTORS_INTERNAL_TOKEN` + `CONNECTORS_ALLOWED_ORGS` (mode legacy transitoire uniquement)
- `CONNECTORS_SECRET_SEALING_KEY` (32+ chars, requis pour stocker les credentials)
- `CONNECTORS_PUBLIC_BASE_URL` (URL publique remise au client pour les endpoints d'ingestion push)
- `CORS_ORIGINS` (CSV d'origines)

Les appels `POST /sync` doivent fournir `Idempotency-Key`.
Les appels admin peuvent fournir `X-Actor-User-ID` pour enrichir l'audit trail.

Exemple `CONNECTORS_SERVICE_TOKENS` :

```json
[
  {
    "name": "webapp",
    "token": "replace-with-32-char-min-token",
    "allowedOrgs": ["org-1", "org-2"]
  },
  {
    "name": "control-plane",
    "token": "replace-with-32-char-min-token-admin",
    "allowedOrgs": ["org-3", "org-4"]
  }
]
```

En developpement, le service bind par defaut sur `127.0.0.1` et CORS reste strictement limite aux origines autorisees.

Quand `DATABASE_URL` est configure, le runtime recharge son snapshot de control plane au demarrage et persiste les mutations dans Postgres. Sans `DATABASE_URL`, il reste en mode memoire pour le dev/test local.

Flux OAuth interactif:

1. `POST /v1/organizations/:orgId/connections`
2. `POST /v1/organizations/:orgId/connections/:connectionId/authorize/start`
3. Le client autorise Praedixa chez le fournisseur
4. `POST /v1/organizations/:orgId/connections/:connectionId/authorize/complete`
5. `POST /v1/organizations/:orgId/connections/:connectionId/test`
6. `POST /v1/organizations/:orgId/connections/:connectionId/sync`

Flux push API client:

1. `POST /v1/organizations/:orgId/connections/:connectionId/ingest-credentials`
2. Transmettre au client l'`ingestUrl`, l'`apiKey` et, si requis, le `signingSecret`
3. Le client pousse ses événements sur `POST /v1/ingest/:orgId/:connectionId/events`
4. Praedixa stocke les événements bruts, journalise l'audit et expose l'état via `raw-events`
