# app-connectors

Runtime TypeScript dedie au control plane des integrations Praedixa.

## Objectif

- Exposer un catalogue de connecteurs et gerer les connexions par organisation.
- Gerer l'onboarding OAuth/API key/service account des fournisseurs.
- Delivrer des credentials d'ingestion push et stocker les evenements bruts.
- Servir de pont securise entre `app-api-ts` (surface admin) et `app-api` (ingestion/traitement Python).

## Architecture rapide

- `src/index.ts` : bootstrap process.
- `src/server.ts` : serveur HTTP, CORS, auth service-token, IP, rate limiting et JSON handling.
- `src/routes.ts` : validation Zod et handlers HTTP.
- `src/service.ts` : logique metier principale du control plane connecteurs.
- `src/activation-readiness.ts` : verdict standardise des prerequis d'activation sans intervention dev.
- `src/store.ts` : store memoire.
- `src/persistent-store.ts` : extension Postgres du store.
- `src/payload-store.ts` : stockage local des payloads bruts.
- `src/security.ts` : sealing de secrets, HMAC, PKCE, redaction.
- `src/oauth.ts` : helpers OAuth.

## Sous-docs

- [src/README.md](./src/README.md)
- [src/**tests**/README.md](./src/__tests__/README.md)

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
- `CONNECTORS_ALLOWED_OUTBOUND_HOSTS`
- `CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS`
- `CONNECTORS_SERVICE_TOKENS`
- `CONNECTORS_SECRET_SEALING_KEY`
- `CORS_ORIGINS`
- `TRUST_PROXY`

Exemple `CONNECTORS_SERVICE_TOKENS`:

```json
[
  {
    "name": "webapp",
    "token": "replace-with-32-char-min-token",
    "allowedOrgs": ["org-1", "org-2"],
    "capabilities": ["connections:read", "connections:write", "oauth:write"]
  }
]
```

Notes de securite:

- hors developpement, `DATABASE_URL`, `CONNECTORS_PUBLIC_BASE_URL`, `CONNECTORS_OBJECT_STORE_ROOT`, `CONNECTORS_ALLOWED_OUTBOUND_HOSTS` et `CONNECTORS_SECRET_SEALING_KEY` sont obligatoires; le runtime ne retombe plus sur des modes memoire/tmp implicites.
- les variables legacy `CONNECTORS_INTERNAL_TOKEN`, `CONNECTORS_ALLOWED_ORGS` et `CONNECTORS_ALLOWED_CAPABILITIES` sont refusees; seul `CONNECTORS_SERVICE_TOKENS` est accepte.
- `CONNECTORS_ALLOWED_OUTBOUND_HOSTS` doit contenir les hosts approuves pour tous les appels sortants du runtime (OAuth, probes de connexion, APIs partenaires).
- `CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS` reserve les suffixes autorises pour `runtimeEnvironment=sandbox`; ces hosts sont refuses pour `runtimeEnvironment=production`.
- chaque connexion doit declarer `runtimeEnvironment=production|sandbox`; l'environnement fournisseur n'est jamais devine a partir d'un fallback.
- `CONNECTORS_PUBLIC_BASE_URL` doit rester une URL publique propre, sans credentials, query string ni fragment; les credentials d'ingestion ne peuvent plus retomber sur `127.0.0.1`.
- les `CONNECTORS_SERVICE_TOKENS` doivent porter des `capabilities` explicites par token; un token scopes par organisation ne doit pas recevoir automatiquement tous les droits.
- laissez `TRUST_PROXY=false` par defaut tant qu'un reverse proxy de confiance n'est pas explicitement devant le service.
- quand `TRUST_PROXY=true`, `cf-connecting-ip` puis `x-forwarded-for` sont utilises pour l'IP cliente; sinon seul `remoteAddress` est accepte.
- les credentials d'ingestion emis par defaut imposent `bearer_hmac`; il faut expliciter `requireSignature=false` pour ouvrir un mode bearer simple.
- l'endpoint public `/v1/ingest/:orgId/:connectionId/events` reste non authentifie par service token, mais il est protege par rate limit IP et repond avec un message d'authentification generique.
- le serveur emet maintenant des logs JSON `request.started`, `request.completed` et `request.failed` avec `request_id`, `trace_id`, `organization_id` et champs de correlation standardises a `null` quand ils ne s'appliquent pas encore.
- les connecteurs standards disposent d'un verdict de readiness interne qui bloque `test` et `sync` tant que les prerequis versionnes (config, credentials, autorisation OAuth, probe target) ne sont pas satisfaits.

## Persistence

- En developpement/test, sans `DATABASE_URL`, le service reste en mode memoire avec store local.
- Hors developpement, `DATABASE_URL` est obligatoire et `PostgresBackedConnectorStore` devient le seul mode supporte.
- Les payloads bruts sont stockes a part via `payload-store.ts`; hors developpement, `CONNECTORS_OBJECT_STORE_ROOT` doit etre explicite.

## Flows importants

OAuth interactif:

1. creer la connexion
2. choisir explicitement `runtimeEnvironment=production|sandbox`
3. readiness check (`config`, `credentials`, endpoints, probe target)
4. `authorize/start`
5. redirection fournisseur
6. `authorize/complete`
7. `test`
8. `sync`

Push API client:

1. emission de credentials d'ingestion
2. remise de `ingestUrl` + `apiKey` + eventuel `signingSecret`
3. push sur l'endpoint d'ingestion
4. lecture ulterieure des raw events par le worker Python

Les journaux d'audit du runtime attribuent les actions humaines au principal de service de confiance qui appelle `app-connectors`; ils n'acceptent plus un `userId` injecte via header HTTP.
Les logs runtime HTTP restent distincts des journaux d'audit metier: ils servent a corriger, correlater et monitorer les appels entrants sans exposer de payloads sensibles.

## Commandes

```bash
pnpm --dir app-connectors dev
pnpm --dir app-connectors test
pnpm --dir app-connectors lint
pnpm --dir app-connectors typecheck
pnpm --dir app-connectors build
```
