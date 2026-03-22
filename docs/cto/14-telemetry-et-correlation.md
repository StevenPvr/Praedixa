# Telemetry Et Correlation

- Statut: draft durable
- Owner: platform engineering
- Derniere revue: 2026-03-21
- Source de verite:
  - `packages/telemetry/README.md`
  - `packages/telemetry/src/logger.ts`
  - `app-api-ts/src/README.md`
  - `app-connectors/src/server.ts`
  - `app-api/README.md`
- Depend de:
  - `packages/telemetry`
  - `app-api-ts`
  - `app-connectors`
  - `app-api`
- Voir aussi:
  - `docs/cto/06-flux-de-donnees-applicatifs.md`
  - `docs/cto/07-connecteurs-et-sync-runs.md`
  - `docs/cto/09-runbook-exploration-bd.md`

## Objectif

Donner a un CTO une lecture simple et exploitable des champs de correlation qui permettent de suivre un flux Praedixa de bout en bout, sans dependre d'un APM unique:

- `request_id`
- `trace_id`
- `run_id`
- `connector_run_id`
- `organization_id`

## Principe general

Praedixa standardise l'enveloppe de correlation via `@praedixa/telemetry`, puis la propage entre les runtimes Node et les workers Python. Le systeme suit une regle simple:

- un champ critique doit toujours exister dans l'enveloppe de log;
- quand il n'est pas applicable, il reste present a `null`;
- un runtime peut enrichir la correlation sans casser les champs deja connus.

Autrement dit, l'absence d'information doit etre explicite, pas implicite.

## Champs a connaitre

| Champ              | Sens                                                  | Quand il apparait                                                     | Usage principal                                 |
| ------------------ | ----------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| `request_id`       | identifiant applicatif d'une requete ou d'un hop HTTP | BFF Next, `app-api-ts`, `app-connectors`, parfois scripts utilitaires | retrouver un echange HTTP precis                |
| `trace_id`         | identifiant transverse de trace                       | propage via `traceparent` / `tracestate`                              | relier plusieurs hops d'un meme parcours        |
| `run_id`           | identifiant d'execution generique                     | jobs, workflows, operations longues                                   | suivre une execution non strictement connecteur |
| `connector_run_id` | identifiant d'un run connecteur                       | `app-connectors`, workers Python                                      | suivre un `sync_run` de bout en bout            |
| `organization_id`  | tenant concerne                                       | API TS, connecteurs, Python                                           | filtrer et regrouper les logs par client        |

## Qui produit quoi

### `packages/telemetry`

Le package interne fournit les primitives communes:

- `createTelemetryCorrelation`
- `mergeTelemetryCorrelation`
- `resolveTelemetryRequestHeaders`
- `buildTelemetryHeaderMap`
- `createTraceparent` / `parseTraceparent`
- `buildTelemetryEvent`
- `createTelemetryLogger`

Ce package ne depend pas d'un framework de logs externe. Il normalise l'enveloppe et laisse chaque runtime choisir son sink.

### `app-api-ts`

Le runtime HTTP principal:

- consomme la correlation entrante via les headers;
- emet des logs structures de cycle de requete;
- peut enrichir le `RouteContext.telemetry` avec des identifiants metier;
- doit garder `request_id`, `trace_id` et les autres champs de correlation presents, meme quand ils valent `null`.

Points d'entree utiles:

- `app-api-ts/src/README.md`
- `app-api-ts/src/server.ts`
- `app-api-ts/src/types.ts`

### `app-connectors`

Le runtime connecteurs:

- emet des logs JSON `request.started`, `request.completed`, `request.failed`;
- normalise `request_id`, `trace_id`, `run_id`, `connector_run_id`, `organization_id`;
- s'en sert pour tracer a la fois les appels admin et les appels worker-only.

Point d'entree utile:

- `app-connectors/src/server.ts`

### `app-api` Python

Le data-plane Python:

- configure `structlog` JSON via `app/core/telemetry.py`;
- binde explicitement `request_id`, `run_id`, `connector_run_id`, `organization_id`, `trace_id` dans les frontieres batch critiques;
- laisse les champs a `null` quand ils ne sont pas encore connus.

Points d'entree utiles:

- `app-api/README.md`
- `app-api/app/core/telemetry.py`
- `app-api/app/services/integration_runtime_worker.py`
- `app-api/app/services/integration_sync_queue_worker.py`
- `app-api/app/services/transform_engine.py`
- `app-api/scripts/integration_sync_worker.py`
- `app-api/scripts/run_inference_job.py`

## Cycle de propagation recommande

### 1. Navigateur -> BFF Next

Le front same-origin garde ou regenere:

- `X-Request-ID`
- `traceparent`
- `tracestate`

### 2. BFF Next -> `app-api-ts`

L'API TS:

- parse la correlation;
- fixe les champs manquants;
- ecrit ses logs de cycle de requete;
- repropague les headers quand elle appelle un autre runtime.

### 3. `app-api-ts` -> `app-connectors`

Le runtime connecteurs:

- recupere `request_id` et `trace_id`;
- enrichit avec `organization_id`, `run_id` ou `connector_run_id` si l'operation le permet;
- emet ses propres logs JSON.

### 4. `app-connectors` -> worker Python

Le worker batch ou d'integration:

- recupere le contexte run;
- bind `connector_run_id`, `organization_id`, `trace_id`, `request_id` si disponibles;
- ecrit ensuite les evenements batch et pipeline avec le meme socle de correlation.

## Regles pratiques CTO

- Commencer par `request_id` quand le point de depart est une requete utilisateur ou admin.
- Basculer sur `trace_id` quand le flux traverse plusieurs hops ou plusieurs runtimes.
- Utiliser `connector_run_id` des qu'un flux touche aux integrations.
- Utiliser `run_id` pour les jobs ou workflows non strictement connecteurs.
- Utiliser `organization_id` pour filtrer le bruit et recoller les evenements a un tenant unique.

## Limitations a garder en tete

- Il n'y a pas aujourd'hui un backend d'observabilite unique versionne dans cette doc.
- Tous les flux ne disposent pas encore de la meme richesse de correlation metier.
- `request_id` et `trace_id` ne remplacent pas la lecture des tables; ils accelerent la navigation entre logs, routes et persistence.

## Playbook express

### Cas 1: une erreur visible cote admin

1. Recuperer `request_id` dans la reponse, le log ou l'outil HTTP.
2. Rechercher ce `request_id` dans les logs BFF, puis dans `app-api-ts`.
3. Recuperer le `trace_id` associe.
4. Chercher ce `trace_id` dans `app-connectors` si la route touche aux integrations.
5. Filtrer par `organization_id` si plusieurs tenants apparaissent dans la meme fenetre.

### Cas 2: un `sync_run` connecteur suspect

1. Partir du `connector_run_id` ou du `run_id`.
2. Rechercher ce champ dans les logs `app-connectors`.
3. Rechercher le meme champ dans les logs Python des workers.
4. Verifier ensuite les tables `integration_sync_runs`, `integration_sync_state`, `integration_raw_events` et, si besoin, le payload store.

### Cas 3: une anomalie data/ML

1. Partir du `organization_id` et du `run_id` si le job est connu.
2. Recoller les logs Python via `trace_id` et `request_id` s'ils existent.
3. Revenir ensuite au runbook SQL pour verifier les tables ou schemas touches.
