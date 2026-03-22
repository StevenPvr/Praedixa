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
- `migrations/002_decisionops_runtime_guards.sql` ajoute l'index d'idempotence de `action_dispatches`.
- `migrations/003_decision_contract_runtime.sql` pose le schema persistant du Contract Studio org-scoped pour le runtime studio.

## Surfaces documentees

- [src/README.md](./src/README.md) : architecture du runtime et grandes familles de routes.
- [src/services/README.md](./src/services/README.md) : services, persistance et dependances.
- [src/**tests**/README.md](./src/__tests__/README.md) : couverture Vitest.
- [migrations/README.md](./migrations/README.md) : migration SQL versionnee.
- [../contracts/openapi/public.yaml](../contracts/openapi/public.yaml) : contrat public non-admin versionne.
- [../packages/shared-types/src/api/public-contract.ts](../packages/shared-types/src/api/public-contract.ts) : catalogue type partage des operations publiques et politique de compatibilite.
- [../packages/shared-types/package.json](../packages/shared-types/package.json) : package workspace qui porte aussi l'helper `@praedixa/shared-types/public-contract-node` consomme par les tests de parite spec/runtime.
- [../packages/telemetry/README.md](../packages/telemetry/README.md) : fondation runtime legere pour les envelopes telemetry et les champs de correlation partages.

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
Le runtime ne doit pas faire evoluer seul une operation publique: `paths/methods/operationId` vivent dans la spec, les payloads partages dans `packages/shared-types`, et les tests verrouillent cette triple parite.
Le cycle de vie HTTP runtime utilise `@praedixa/telemetry` pour emettre des logs structures `http.request.started` / `http.request.completed`, avec `request_id`, `trace_id` et les champs de correlation non applicables forces a `null`.

## Configuration runtime

Variables importantes chargees par `src/config.ts`:

- `PORT`, `NODE_ENV`
- `CORS_ORIGINS`
- `AUTH_ISSUER_URL`, `AUTH_AUDIENCE`, `AUTH_JWKS_URL`, `AUTH_JWT_ALGORITHMS`
- `DATABASE_URL`
- `DEMO_MODE` en developpement uniquement
- `CONNECTORS_RUNTIME_URL`, `CONNECTORS_RUNTIME_ALLOWED_HOSTS`, `CONNECTORS_RUNTIME_TOKEN`

La config refuse les URLs non absolues, les wildcards CORS et les schemas non `http(s)`/`postgres`.
Hors developpement, `DATABASE_URL` est obligatoire et `DEMO_MODE` est refuse pour eviter tout fallback applicatif implicite.
Le contrat JWT runtime est maintenant strict: `sub` doit etre un UUID applicatif, `organization_id` doit etre un UUID pour tous les roles hors `super_admin`, et `manager` / `hr_manager` restent scopes a un `site_id` explicite. Le parser `Authorization` accepte le schema `Bearer` sans sensibilite a la casse HTTP.
Sur toutes les vraies routes produit/admin, le runtime fail-close des qu'une implementation persistante manque: aucun payload demo/stub ne doit etre servi comme mode normal.
Si Camunda onboarding est indisponible au boot local, l'API HTTP monte quand meme maintenant; seules les routes onboarding concernees echouent ensuite explicitement jusqu'au retour du runtime Camunda. Le bootstrap journalise un warning concis avec `baseUrl`, `cause` et le next step local attendu (`pnpm camunda:up` ou `CAMUNDA_ENABLED=false`), sans deverser toute la stack dans le terminal de dev.
Hors developpement, `CONNECTORS_RUNTIME_URL` doit etre explicite.
Hors developpement, `CONNECTORS_RUNTIME_URL` doit aussi etre en `https`, sans credentials/query/fragment, et son host doit appartenir a `CONNECTORS_RUNTIME_ALLOWED_HOSTS`.
Hors developpement, `CONNECTORS_RUNTIME_TOKEN` est aussi obligatoire et l'ancien alias `CONNECTORS_INTERNAL_TOKEN` est refuse.

## Workflows utiles

Developpement:

```bash
pnpm --filter @praedixa/api-ts dev
pnpm --filter @praedixa/api-ts test
pnpm --filter @praedixa/api-ts lint
pnpm --filter @praedixa/api-ts typecheck
```

Depuis la racine du monorepo, preferer `pnpm dev:api`: ce wrapper autocharge `DATABASE_URL` depuis les fichiers locaux standards (`app-api-ts/.env.local`, `app-api/.env.local`, `app-api/.env`, `.env.local`) quand la variable n'est pas deja exportee, recharge aussi `KEYCLOAK_ADMIN_USERNAME` / `KEYCLOAK_ADMIN_PASSWORD` pour les mutations admin qui provisionnent des identites, et recale maintenant toujours `AUTH_ISSUER_URL` / `AUTH_JWKS_URL` / `AUTH_AUDIENCE` sur le contrat auth local actif du repo. Les fichiers API explicites (`app-api-ts/.env.local`, `app-api/.env.local`) restent prioritaires, puis viennent `app-admin/.env.local` / `app-webapp/.env.local`; l'ancien `app-api/.env` n'est plus qu'un fallback de dernier rang pour eviter qu'une config live stale fasse rejeter les JWT Keycloak locaux apres restart. Si aucun username n'est fourni localement, le wrapper force `kcadmin` pour rester aligne avec le runtime Keycloak repo. Si Camunda local manque, le runtime garde maintenant le boot HTTP et remonte un warning de demarrage actionnable plutot qu'une stack brute. `pnpm dev:api:bg` reutilise le meme bootstrap d'env mais lance maintenant `tsx src/index.ts` sans watcher, car `tsx watch` sous `nohup` tombait silencieusement et donnait de faux "running".
Le meme bootstrap local demarre maintenant aussi automatiquement `app-connectors` et Camunda quand `CONNECTORS_RUNTIME_URL` / `CAMUNDA_BASE_URL` pointent vers `localhost`, puis force un token control-plane local stable (`CONNECTORS_RUNTIME_TOKEN`) et un `CONNECTORS_SERVICE_TOKENS` derive avec `allowedOrgs=["global:all-orgs"]` tant qu'aucune configuration explicite n'est fournie.

Build:

```bash
pnpm --filter @praedixa/api-ts build
pnpm --filter @praedixa/api-ts start
docker build -f app-api-ts/Dockerfile .
```

Le Dockerfile versionne reconstruit maintenant explicitement les packages workspace requis (`@praedixa/shared-types`, `@praedixa/telemetry`) avant de builder `@praedixa/api-ts`, puis copie leurs artefacts runtime dans l'image finale pour garder un build reproductible hors du workspace local.

Verification contractuelle et dynamique depuis la racine:

```bash
./scripts/run-api-dynamic-audits.sh
```
