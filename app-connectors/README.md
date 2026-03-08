# app-connectors

Runtime TypeScript dedie au control plane des integrations Praedixa.

## Objectif

- Exposer un catalogue de connecteurs et gerer les connexions par organisation.
- Gerer l'onboarding OAuth/API key/service account des fournisseurs.
- Delivrer des credentials d'ingestion push et stocker les evenements bruts.
- Servir de pont securise entre `app-api-ts` (surface admin) et `app-api` (ingestion/traitement Python).

## Architecture rapide

- `src/index.ts` : bootstrap process.
- `src/server.ts` : serveur HTTP, CORS, auth service-token, IP et JSON handling.
- `src/routes.ts` : validation Zod et handlers HTTP.
- `src/service.ts` : logique metier principale du control plane connecteurs.
- `src/store.ts` : store memoire.
- `src/persistent-store.ts` : extension Postgres du store.
- `src/payload-store.ts` : stockage local des payloads bruts.
- `src/security.ts` : sealing de secrets, HMAC, PKCE, redaction.
- `src/oauth.ts` : helpers OAuth.

## Sous-docs

- [src/README.md](./src/README.md)
- [src/__tests__/README.md](./src/__tests__/README.md)

## Surface HTTP

Catalogue et connexions:

- `GET /v1/connectors/catalog`
- `GET /v1/organizations/:orgId/connections`
- `GET /v1/organizations/:orgId/connections/:connectionId`
- `POST /v1/organizations/:orgId/connections`
- `PATCH /v1/organizations/:orgId/connections/:connectionId`

Sync, audit, runs:

- `GET /v1/organizations/:orgId/sync-runs`
- `GET /v1/organizations/:orgId/sync-runs/:runId`
- `GET /v1/organizations/:orgId/audit-events`

Le reste de la surface d'onboarding/integration vit aussi dans `src/routes.ts`: authorization start/complete, test, sync, ingest credentials, endpoints d'ingestion push et worker APIs.

## Configuration runtime

Variables importantes:

- `PORT`, `HOST`, `NODE_ENV`
- `DATABASE_URL`
- `CONNECTORS_PUBLIC_BASE_URL`
- `CONNECTORS_OBJECT_STORE_ROOT`
- `CONNECTORS_SERVICE_TOKENS`
- `CONNECTORS_INTERNAL_TOKEN` + `CONNECTORS_ALLOWED_ORGS` pour le mode legacy transitoire
- `CONNECTORS_SECRET_SEALING_KEY`
- `CORS_ORIGINS`

Exemple `CONNECTORS_SERVICE_TOKENS`:

```json
[
  {
    "name": "webapp",
    "token": "replace-with-32-char-min-token",
    "allowedOrgs": ["org-1", "org-2"]
  }
]
```

## Persistence

- Sans `DATABASE_URL`, le service reste en mode memoire avec store local.
- Avec `DATABASE_URL`, `PostgresBackedConnectorStore` recharge un snapshot et persiste les mutations.
- Les payloads bruts sont stockes a part via `payload-store.ts`.

## Flows importants

OAuth interactif:

1. creer la connexion
2. `authorize/start`
3. redirection fournisseur
4. `authorize/complete`
5. `test`
6. `sync`

Push API client:

1. emission de credentials d'ingestion
2. remise de `ingestUrl` + `apiKey` + eventuel `signingSecret`
3. push sur l'endpoint d'ingestion
4. lecture ulterieure des raw events par le worker Python

## Commandes

```bash
pnpm --dir app-connectors dev
pnpm --dir app-connectors test
pnpm --dir app-connectors lint
pnpm --dir app-connectors typecheck
pnpm --dir app-connectors build
```
