# Connecteurs Et Sync Runs

- Statut: draft operable
- Owner: Platform Engineering
- Derniere revue: 2026-03-21
- Source de verite:
  - `app-connectors/README.md`
  - `app-connectors/src/README.md`
  - `app-connectors/src/types.ts`
  - `app-connectors/src/persistent-store.ts`
  - `app-api/app/models/integration.py`
  - `app-api/alembic/versions/026_integration_platform_foundation.py`
- Depend de:
  - `docs/DATABASE.md`
  - `docs/ARCHITECTURE.md`
  - `docs/data-api/prd-00-integration-platform.md`
- Voir aussi:
  - `docs/cto/06-flux-de-donnees-applicatifs.md`
  - `docs/cto/05-schemas-tenant-et-medallion.md`
  - `docs/cto/15-capabilities-et-securite-connecteurs.md`
  - `docs/cto/09-runbook-exploration-bd.md`
  - `docs/cto/10-ownership-et-tracabilite-des-donnees.md`
  - `docs/cto/visuals/connectors-runtime-current-state.mmd`
  - `docs/cto/visuals/integration-target-erd.mmd`
  - `docs/cto/visuals/connectors-oauth-interactif-sequence.mmd`
  - `docs/cto/visuals/connectors-provider-pull-sequence.mmd`
  - `docs/cto/visuals/connectors-push-ingest-sequence.mmd`

## Objectif

Donner a un CTO une lecture claire de la plateforme d'integration Praedixa:

- qui porte le control plane;
- qui porte le data-plane;
- quelles structures sont la cible relationnelle;
- quelles structures sont actuellement utilisees par le runtime;
- comment circulent `connections`, `sync_runs`, `sync_state`, `raw_events` et payloads bruts.

## Vue d'ensemble

Praedixa separe aujourd'hui le perimetre connecteurs en deux couches:

- `app-connectors`
  - runtime HTTP TypeScript;
  - onboarding fournisseur;
  - stockage des secrets;
  - emission de credentials d'ingestion;
  - queue runtime;
  - surfaces worker (`claim`, `execution-plan`, `access-context`, `provider-events`);
- `app-api`
  - modele relationnel cible `integration_*`;
  - workers Python de drain;
  - ingestion dataset/raw;
  - pipeline medallion;
  - exposition indirecte des resultats au reste du produit.

La consequence importante est la suivante: la cible d'architecture relationnelle est deja modelee cote Python, mais la persistance operationnelle du runtime `app-connectors` repose encore principalement sur un snapshot JSONB opaque et un store de secrets separe.

## Ce qui est cible cote schema relationnel

Le domaine integration cible et versionne par Alembic/Python comprend:

- `integration_connections`
- `integration_sync_runs`
- `integration_sync_state`
- `integration_raw_events`
- `integration_field_mappings`
- `integration_error_events`
- `integration_dead_letter_queue`
- `integration_webhook_receipts`
- `integration_audit_events`

Ce modele est utile pour un CTO parce qu'il raconte un controle plane relationnel propre:

- une connexion par organisation et vendor;
- une queue de `sync_runs` avec priorite, lease et reprise;
- un `sync_state` persistant par `connection + source_object`;
- un journal append-only de `raw_events` pointant vers un object store;
- des mappings, erreurs, DLQ, webhooks et audit separes.

## Ce qui est reellement persiste par `app-connectors`

Le runtime TypeScript persiste aujourd'hui son etat dans:

- `connector_runtime_snapshots`
  - une ligne `id=default`;
  - un payload JSONB;
- `connector_secret_records`
  - enregistrements de secrets scelles par `secret_ref`.

Le snapshot contient notamment:

- `connections`
- `runs`
- `syncStates`
- `rawEvents`
- `ingestCredentials`
- `auditEvents`
- `authorizationSessions`
- index de replay et de secrets

Autrement dit, le runtime est operable et durable, mais sa persistence n'est pas encore alignee sur le modele relationnel `integration_*`.

## Decision d'architecture a garder visible

Pour un CTO entrant, il faut lire la plateforme avec cette distinction explicite:

- cible documentaire et relationnelle:
  `integration_*`
- etat runtime actuel:
  snapshot JSONB + secret store + payload store

Ce n'est pas un detail d'implementation. C'est une vraie question d'architecture:

1. soit `app-connectors` converge vers `integration_*`;
2. soit la cible relationnelle est revue;
3. soit un mode hybride est assume durablement et documente comme tel.

La doc CTO doit donc montrer les deux couches et l'ecart entre elles, au lieu de pretendre qu'elles sont deja fusionnees.

## Flux critiques a connaitre

### 1. OAuth interactif

1. creation de `connection`
2. choix explicite `runtimeEnvironment=production|sandbox`
3. readiness check
4. `authorize/start`
5. redirection fournisseur
6. `authorize/complete`
7. `test`
8. `sync`

### 2. Push ingest

1. emission d'un credential d'ingestion
2. push fournisseur sur l'endpoint public d'ingestion
3. stockage du payload brut dans le payload store
4. creation d'un resume `raw event`
5. reprise par le worker Python

### 3. Provider pull / SFTP

1. `triggerSync(...)` cree un run `queued`
2. un worker reclame le run
3. le runtime renvoie un `execution plan`
4. le worker choisit `provider-events` ou `sftpPull`
5. le worker persiste/propage le `sync_state`
6. le run finit en `success`, `failed` ou `queued` pour retry

## Sync runs, sync state et raw events

### `sync_runs`

Le runtime expose une vraie queue de travail:

- claim via `POST /v1/runtime/sync-runs/claim`
- execution plan borne au run claimé
- completion/echec/requeue explicites

Le modele cible Python porte les attributs structurants attendus par un CTO:

- `status`
- `priority`
- `available_at`
- `attempts`
- `max_attempts`
- `lease_expires_at`
- `source_window_*`
- `records_fetched`
- `records_written`
- `error_class`

### `sync_state`

`sync_state` sert a memoriser le curseur par `connection + source_object`:

- `watermark_text`
- `watermark_at`
- `cursor_json`
- `last_run_id`
- `updated_by_worker`

Ce point est critique pour les vendors stateful, en particulier les syncs incrementales et le chemin `sftpPull`.

### `raw_events`

`raw_events` est la couche Bronze la plus proche du fournisseur:

- resume metadata-only cote surfaces operateur;
- payload brut dans le payload store / object store;
- hash `payload_sha256`;
- `source_record_id`, `source_object`, `source_updated_at`;
- rattachement optionnel a un `sync_run`.

La lecture du payload brut est reservee aux surfaces worker dediees, pas aux surfaces admin generiques.

## Frontiere de confiance et capabilities

Le runtime `app-connectors` ne doit pas etre lu comme un simple CRUD admin. Il expose des surfaces de confiance distinctes:

- capabilities admin/operateur:
  `connections:*`, `sync:*`, `audit:read`, `raw_events:read`
- capabilities runtime worker:
  `provider_runtime:read`
  `provider_runtime:write`
  `sync_runtime:write`
  `raw_events_runtime:write`

Les routes les plus sensibles sont:

- `POST /v1/runtime/sync-runs/claim`
- `POST /v1/organizations/:orgId/sync-runs/:runId/execution-plan`
- `GET /v1/runtime/organizations/:orgId/connections/:connectionId/access-context`
- `POST /v1/runtime/organizations/:orgId/connections/:connectionId/provider-events`
- `GET /v1/organizations/:orgId/connections/:connectionId/raw-events/:eventId/payload`

La consequence pratique:

- l'admin voit la configuration et le monitoring;
- le worker voit les secrets et le payload brut utiles a l'execution;
- les deux surfaces ne doivent pas etre confondues.

La cartographie precise `capability -> routes protegees -> invariants de securite` est documentee dans [`15-capabilities-et-securite-connecteurs.md`](./15-capabilities-et-securite-connecteurs.md).

## Divergences et points de vigilance

### Divergence 1 - persistance cible vs persistance runtime

Le schema `integration_*` existe, mais `app-connectors` persiste encore via snapshot JSONB.

### Divergence 2 - auth mode `session`

Le runtime TypeScript supporte `session`:

- type `ConnectorAuthMode`
- catalogue `Geotab`
- readiness
- probe live
- `credentialFields` internes

Mais l'enum Alembic/Python `integrationauthmode` ne contient aujourd'hui que:

- `oauth2`
- `api_key`
- `service_account`
- `sftp`

Si le runtime converge demain vers `integration_connections`, cette divergence devra etre tranchee explicitement.

### Divergence 3 - doc DB centrale

`docs/DATABASE.md` decrivait jusqu'ici tres peu le domaine integration. Cette page et la section ajoutee dans `docs/DATABASE.md` doivent etre considerees comme la lecture CTO de reference tant que la convergence n'est pas complete.

## Recommandation CTO

Court terme:

- assumer la dualite cible/runtime dans la doc;
- ne pas la masquer;
- documenter les invariants et proprietes de chaque couche.

Moyen terme:

- ouvrir une ADR de convergence;
- choisir si `app-connectors` devient relationnel sur `integration_*`;
- ou si le snapshot runtime reste un choix de design assume.

## Lire cette plateforme dans le bon ordre

1. `docs/cto/06-flux-de-donnees-applicatifs.md`
2. cette page
3. `docs/DATABASE.md` section "Plateforme d'integration"
4. `app-connectors/README.md`
5. `app-api/app/models/integration.py`
6. `app-api/alembic/versions/026_integration_platform_foundation.py`
