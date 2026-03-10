# Praedixa API TS

Backend applicatif TypeScript expose aux frontends `app-webapp` et `app-admin`.

## Objectif

- Porter la surface HTTP produit et admin en Node/TypeScript.
- Centraliser auth JWT, RBAC, CORS, rate limiting et reponses JSON.
- Lire les donnees persistantes PostgreSQL et orchestrer les services adjacents.
- Laisser `app-api/` au pipeline Data/ML et aux jobs batch.

## Points d'entree

- `src/index.ts` charge la config, initialise le service `decision-config`, puis demarre le serveur.
- `src/server.ts` porte le runtime HTTP, les headers, l'auth et le dispatch des routes.
- `src/routes.ts` contient la table de routes applicatives et admin.
- `src/services/` regroupe la persistance SQL et les services de lecture/ecriture.
- `migrations/001_decision_engine_config.sql` pose la base SQL du moteur de configuration.

## Surfaces documentees

- [src/README.md](./src/README.md) : architecture du runtime et grandes familles de routes.
- [src/services/README.md](./src/services/README.md) : services, persistance et dependances.
- [src/**tests**/README.md](./src/__tests__/README.md) : couverture Vitest.
- [migrations/README.md](./migrations/README.md) : migration SQL versionnee.

## Routes principales

Surface produit:

- `GET /api/v1/live/dashboard/summary`
- `GET /api/v1/live/forecasts`
- `GET /api/v1/live/decision-config`
- `GET /api/v1/live/gold/*`
- `GET/PATCH /api/v1/live/coverage-alerts*`
- `GET/POST /api/v1/operational-decisions`
- `GET/POST /api/v1/conversations*`
- `POST /api/v1/support-thread/messages`

Surface admin:

- `GET /api/v1/admin`
- `GET/POST/PATCH /api/v1/admin/organizations*`
- `GET/PATCH /api/v1/admin/contact-requests*`
- `GET /api/v1/admin/audit-log`
- `GET /api/v1/admin/monitoring/*`
- `GET/POST/PATCH /api/v1/admin/organizations/:orgId/integrations/*`
- `GET/POST /api/v1/admin/organizations/:orgId/decision-config/*`

Le contrat public versionne reste dans `contracts/openapi/public.yaml`.

## Configuration runtime

Variables importantes chargees par `src/config.ts`:

- `PORT`, `NODE_ENV`
- `CORS_ORIGINS`
- `AUTH_ISSUER_URL`, `AUTH_AUDIENCE`, `AUTH_JWKS_URL`, `AUTH_JWT_ALGORITHMS`
- `DATABASE_URL`
- `DEMO_MODE`
- `CONNECTORS_RUNTIME_URL`, `CONNECTORS_RUNTIME_ALLOWED_HOSTS`, `CONNECTORS_RUNTIME_TOKEN`
- `CONNECTORS_INTERNAL_TOKEN` pour le mode legacy transitoire

La config refuse les URLs non absolues, les wildcards CORS et les schemas non `http(s)`/`postgres`.
Hors developpement, `CONNECTORS_RUNTIME_URL` doit aussi etre en `https`, sans credentials/query/fragment, et son host doit appartenir a `CONNECTORS_RUNTIME_ALLOWED_HOSTS`.

## Workflows utiles

Developpement:

```bash
pnpm --filter @praedixa/api-ts dev
pnpm --filter @praedixa/api-ts test
pnpm --filter @praedixa/api-ts lint
pnpm --filter @praedixa/api-ts typecheck
```

Build:

```bash
pnpm --filter @praedixa/api-ts build
pnpm --filter @praedixa/api-ts start
```

Verification contractuelle et dynamique depuis la racine:

```bash
./scripts/run-api-dynamic-audits.sh
```
