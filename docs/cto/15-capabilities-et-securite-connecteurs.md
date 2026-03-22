# Capabilities Et Securite Connecteurs

- Statut: draft operable
- Owner: Platform Engineering
- Derniere revue: 2026-03-21
- Source de verite:
  - `app-connectors/src/types.ts`
  - `app-connectors/src/routes.ts`
  - `app-connectors/src/server.ts`
  - `app-connectors/src/security.ts`
  - `app-connectors/README.md`
- Depend de:
  - `docs/cto/07-connecteurs-et-sync-runs.md`
  - `docs/cto/06-flux-de-donnees-applicatifs.md`
- Voir aussi:
  - `docs/cto/09-runbook-exploration-bd.md`
  - `docs/cto/11-surfaces-http-et-statut.md`
  - `docs/cto/visuals/connectors-runtime-current-state.mmd`

## Objectif

Expliquer au CTO comment `app-connectors` se protege reellement:

- par principal de service;
- par organisation autorisee;
- par capability explicite;
- par separation forte entre surface operateur et surface worker.

## Modele de confiance

Le runtime ne repose pas sur un utilisateur humain authentifie directement. Il recoit un **service token** resolu en principal de service:

- `name`
- `allowedOrgs`
- `capabilities`

Le token ne vaut donc pas "acces global au service". Il porte un couple:

1. **perimetre organisationnel** via `allowedOrgs`;
2. **perimetre d'action** via `ServiceTokenCapability`.

La consequence pratique:

- un token peut etre limite a quelques orgs;
- un token peut voir la configuration sans pouvoir manipuler les secrets ou les queues runtime;
- les surfaces worker peuvent etre isolees des surfaces admin classiques.

## Taxonomie des capabilities

Source normative: `app-connectors/src/types.ts`

| Capability                 | Sens                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `catalog:read`             | lire le catalogue des connecteurs                                                    |
| `connections:read`         | lire les connexions d'une organisation                                               |
| `connections:write`        | creer ou mettre a jour une connexion                                                 |
| `provider_runtime:read`    | lire un `access-context` provider interne                                            |
| `provider_runtime:write`   | pousser des `provider-events` internes                                               |
| `sync_runtime:write`       | manipuler la queue runtime `sync_runs` claim/execution/completed/failed/sync-state   |
| `raw_events_runtime:write` | lire le payload brut, claim et muter la file interne `raw_events`                    |
| `ingest_credentials:read`  | lister les credentials d'ingestion emis                                              |
| `ingest_credentials:write` | creer ou revoquer un credential d'ingestion                                          |
| `raw_events:read`          | lire les resumes metadata-only des raw events                                        |
| `raw_events:write`         | capability generique reservee a l'ecriture admin, non suffisante pour la file worker |
| `oauth:write`              | lancer et completer l'autorisation OAuth                                             |
| `connections:test`         | executer le probe live de connexion                                                  |
| `sync:read`                | lire les sync runs                                                                   |
| `sync:write`               | declencher un sync fonctionnel                                                       |
| `audit:read`               | lire les audits d'integration                                                        |

## Carte capability -> routes protegees

| Capability requise         | Routes protegees principales                                                                                                                                                                                                                                                                                                                          | Commentaire CTO                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `catalog:read`             | `GET /v1/connectors/catalog`                                                                                                                                                                                                                                                                                                                          | surface de lecture la plus faible                                    |
| `connections:read`         | `GET /v1/organizations/:orgId/connections`, `GET /v1/organizations/:orgId/connections/:connectionId`                                                                                                                                                                                                                                                  | lecture operateur standard                                           |
| `connections:write`        | `POST /v1/organizations/:orgId/connections`, `PATCH /v1/organizations/:orgId/connections/:connectionId`                                                                                                                                                                                                                                               | mutation de configuration                                            |
| `provider_runtime:read`    | `GET /v1/runtime/organizations/:orgId/connections/:connectionId/access-context`                                                                                                                                                                                                                                                                       | surface tres sensible, peut exposer le contexte provider interne     |
| `provider_runtime:write`   | `POST /v1/runtime/organizations/:orgId/connections/:connectionId/provider-events`                                                                                                                                                                                                                                                                     | reservee au worker runtime                                           |
| `ingest_credentials:read`  | `GET /v1/organizations/:orgId/connections/:connectionId/ingest-credentials`                                                                                                                                                                                                                                                                           | lecture des credentials emis                                         |
| `ingest_credentials:write` | `POST /v1/organizations/:orgId/connections/:connectionId/ingest-credentials`, `POST /v1/organizations/:orgId/connections/:connectionId/ingest-credentials/:credentialId/revoke`                                                                                                                                                                       | emission/revocation                                                  |
| `raw_events:read`          | `GET /v1/organizations/:orgId/connections/:connectionId/raw-events`                                                                                                                                                                                                                                                                                   | resume metadata-only, pas le payload brut                            |
| `raw_events_runtime:write` | `GET /v1/organizations/:orgId/connections/:connectionId/raw-events/:eventId/payload`, `POST /v1/organizations/:orgId/connections/:connectionId/raw-events/claim`, `POST /v1/organizations/:orgId/connections/:connectionId/raw-events/:rawEventId/processed`, `POST /v1/organizations/:orgId/connections/:connectionId/raw-events/:rawEventId/failed` | separation critique entre lecture admin et file worker Bronze        |
| `oauth:write`              | `POST /v1/organizations/:orgId/connections/:connectionId/authorize/start`, `POST /v1/organizations/:orgId/connections/:connectionId/authorize/complete`                                                                                                                                                                                               | mutation de secret et d'etat d'autorisation                          |
| `connections:test`         | `POST /v1/organizations/:orgId/connections/:connectionId/test`                                                                                                                                                                                                                                                                                        | probe live dedie                                                     |
| `sync:write`               | `POST /v1/organizations/:orgId/connections/:connectionId/sync`                                                                                                                                                                                                                                                                                        | declenchement fonctionnel d'un sync                                  |
| `sync_runtime:write`       | `POST /v1/runtime/sync-runs/claim`, `POST /v1/organizations/:orgId/sync-runs/:runId/execution-plan`, `POST /v1/organizations/:orgId/sync-runs/:runId/completed`, `POST /v1/organizations/:orgId/sync-runs/:runId/sync-state`, `POST /v1/organizations/:orgId/sync-runs/:runId/failed`                                                                 | queue interne worker, surtout pas une capability operateur generique |
| `sync:read`                | `GET /v1/organizations/:orgId/sync-runs`, `GET /v1/organizations/:orgId/sync-runs/:runId`                                                                                                                                                                                                                                                             | monitoring operateur                                                 |
| `audit:read`               | `GET /v1/organizations/:orgId/audit-events`                                                                                                                                                                                                                                                                                                           | audit de control plane                                               |

## Frontiere operateur vs frontiere worker

### Surface operateur

Ce qu'un operateur ou `app-api-ts` doit pouvoir faire:

- lire le catalogue;
- gerer une connexion;
- lancer/completer un OAuth;
- tester une connexion;
- declencher un sync;
- lire les sync runs;
- lire un resume metadata-only des raw events;
- gerer les credentials d'ingestion;
- lire l'audit.

Capabilities typiques:

- `catalog:read`
- `connections:read`
- `connections:write`
- `oauth:write`
- `connections:test`
- `sync:read`
- `sync:write`
- `raw_events:read`
- `ingest_credentials:*`
- `audit:read`

### Surface worker

Ce qu'un worker Python doit pouvoir faire:

- reclamer un `sync_run`;
- demander un `execution plan`;
- lire un `access-context` provider interne;
- pousser des `provider-events`;
- manipuler l'etat `sync_state`;
- marquer `success/failed`;
- lire le payload brut d'un raw event;
- claim/process/fail la file interne `raw_events`.

Capabilities typiques:

- `provider_runtime:read`
- `provider_runtime:write`
- `sync_runtime:write`
- `raw_events_runtime:write`

## Route speciale: ingest public

`POST /v1/ingest/:orgId/:connectionId/events`

Cette route est atypique:

- `authRequired: false`
- pas de service token
- protection par credential d'ingestion, `Idempotency-Key`, HMAC optionnel et rate limit IP

Elle ne doit pas etre lue comme une faille du modele. C'est une surface publique volontaire pour le push ingest, avec des garde-fous differents de la surface service-token.

## Invariants de securite a retenir

- Une capability admin generique ne doit jamais suffire pour une surface worker qui peut exposer des secrets dechiffres, des payloads bruts ou la mutation d'une queue interne.
- `raw_events:read` ne doit donner acces qu'a un resume metadata-only.
- `raw_events_runtime:write` est obligatoire pour le payload brut et la file worker `raw_events`.
- `sync:write` sert a declencher un sync metier; `sync_runtime:write` sert a piloter la queue interne.
- `provider_runtime:read` / `provider_runtime:write` restent strictement internes au chemin provider pull.
- `allowedOrgs` est une deuxieme barriere: avoir la capability ne suffit pas si l'organisation n'est pas autorisee.

## Risques CTO si la frontiere se brouille

- fuite de secrets fournisseurs ou de `credentialFields` internes;
- exposition du payload brut Bronze a des surfaces admin non worker;
- confusion entre monitoring operateur et execution batch interne;
- impossibilite d'auditer clairement qui a eu acces a quelle couche.

## Lecture recommandee

1. Lire d'abord cette page pour comprendre les capabilities.
2. Revenir a `docs/cto/07-connecteurs-et-sync-runs.md` pour la topologie cible/runtime.
3. Utiliser `docs/cto/09-runbook-exploration-bd.md` pour suivre un cas concret en SQL et dans les services.
