# Taxonomies Et Registres

- Statut: draft durable
- Owner: CTO / platform engineering
- Derniere revue: 2026-03-21
- Source de verite:
  - `contracts/README.md`
  - `contracts/admin/permission-taxonomy.v1.json`
  - `contracts/decisionops/*.schema.json`
  - `contracts/events/event-envelope.schema.json`
  - `packages/shared-types/src/domain/*`
  - `packages/shared-types/src/api/*`
- Depend de:
  - `docs/cto/02-vocabulaire-et-domaines.md`
  - `docs/cto/08-contrats-et-types-partages.md`
- Voir aussi:
  - `packages/shared-types/src/domain/README.md`
  - `packages/shared-types/src/api/README.md`
  - `packages/shared-types/src/admin-permissions.ts`

## Objectif

Cette page donne a un CTO un registre compact des taxonomies, versions et artefacts classes qui structurent le repo.

Le but n'est pas de recopier chaque enum litteral, mais de montrer:

- ou vivent les nomenclatures normatives;
- lesquelles sont machine-readable;
- lesquelles sont partagees seulement via TypeScript;
- comment separer version de schema, version de payload et version metier.

## Hierarchie a retenir

1. `contracts/*`
   - source normative machine-readable quand elle existe
2. `packages/shared-types/*`
   - projection TypeScript partagee
3. runtimes (`app-api-ts`, `app-connectors`, `app-api`)
   - consommation et persistence effectives

## Registre des taxonomies principales

| Famille                        | Artefact de reference                         | Projection partagee                                                                                                            | Ce qu'un CTO doit retenir                                                                         |
| ------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Permissions admin              | `contracts/admin/permission-taxonomy.v1.json` | `packages/shared-types/src/admin-permissions.ts`                                                                               | seule taxonomie admin clairement machine-readable et testee en parite                             |
| API publique                   | `contracts/openapi/public.yaml`               | `packages/shared-types/src/api/public-contract.ts`, `requests.ts`, `responses.ts`                                              | la spec publique versionnee fait foi pour les routes non-admin                                    |
| Primitives DecisionOps         | `contracts/decisionops/*.schema.json`         | `packages/shared-types/src/domain/decision-contract.ts`, `decision-graph.ts`, `approval.ts`, `action-dispatch.ts`, `ledger.ts` | le coeur DecisionOps se pilote par schemas versionnes, pas seulement par DTOs                     |
| Evenements internes            | `contracts/events/event-envelope.schema.json` | `packages/shared-types/src/domain/product-event.ts`                                                                            | enveloppe versionnee + champs de correlation transverses                                          |
| Integrations partagees         | pas de registre JSON central dedie            | `packages/shared-types/src/domain/integration.ts`                                                                              | vendors, auth modes et statuts partages sont d'abord types TS aujourd'hui                         |
| Onboarding admin               | pas de registre JSON central dedie            | `packages/shared-types/src/api/admin-onboarding.ts`                                                                            | taxonomies de case, task, blocker et access-model portees cote DTOs TS                            |
| Dataset health                 | pas de registre JSON central dedie            | `packages/shared-types/src/domain/dataset-health.ts`, `src/api/dataset-health.ts`                                              | signaux et statuts fortement partages, mais pas encore extraits en contrat machine-readable dedie |
| Coverage / scenario / decision | pas de registre JSON central dedie            | `packages/shared-types/src/domain/coverage-alert.ts`, `scenario.ts`, `decision.ts`, `operational-decision.ts`                  | plusieurs statuts/horizons restent portes avant tout par les types TS                             |

## Registre des versions

| Champ              | Portee                          | Source de verite                                                                           | Sens                                       |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `schema_version`   | structure de schema             | `contracts/admin/*`, `contracts/decisionops/*`, `contracts/events/*`                       | version de structure machine-readable      |
| `payload_version`  | structure du payload transporte | `contracts/events/event-envelope.schema.json`                                              | version metier du payload dans l'enveloppe |
| `contract_version` | revision metier                 | `contracts/decisionops/*`, `DecisionContract`, `Approval`, `ActionDispatch`, `LedgerEntry` | version publiee d'un contrat de decision   |
| `graph_version`    | revision metier                 | `contracts/decisionops/decision-graph.schema.json`                                         | version du graphe semantique               |
| `info.version`     | contrat HTTP public             | `contracts/openapi/public.yaml`                                                            | version de l'API publique                  |

## Registre des identifiants transverses

| Identifiant        | Lieu principal             | Remarque CTO                             |
| ------------------ | -------------------------- | ---------------------------------------- |
| `organization_id`  | DB, JWT, routes, events    | identifiant tenant central               |
| `site_id`          | DB, JWT, routes live/admin | sous-scope metier/site                   |
| `contract_id`      | DecisionOps                | identifiant stable de famille de contrat |
| `graph_id`         | DecisionOps                | identifiant stable de graphe             |
| `event_id`         | events, integrations       | identifiant d'evenement                  |
| `request_id`       | HTTP/logs                  | correlation requete                      |
| `trace_id`         | telemetry/events           | correlation transverse                   |
| `run_id`           | jobs et telemetry          | identifiant d'execution generique        |
| `connector_run_id` | integrations               | identifiant de sync run connecteur       |

## Ce qui est bien structure aujourd'hui

- permissions admin:
  machine-readable + projection TS + test de parite
- API publique:
  spec OpenAPI + types partages + tests de parite
- DecisionOps:
  primitives coeur deja versionnees en JSON Schema
- evenements:
  enveloppe versionnee avec separation `schema_version` / `payload_version`

## Ce qui reste moins industrialise

- plusieurs taxonomies metier restent d'abord typees en TypeScript sans registre JSON dedie:
  coverage, scenario, decision, dataset health, integration vendors/auth modes, onboarding admin;
- le domaine integrations a aussi une dualite importante entre:
  taxonomies partagees cote TS et realite runtime `app-connectors`.

## Recommandation CTO

Avant de creer une nouvelle taxonomie transverse, choisir explicitement l'un de ces niveaux:

1. machine-readable dans `contracts/*`
2. type partage local a `packages/shared-types/*`
3. details strictement runtime dans un service particulier

Si la taxonomie est:

- partagee entre plusieurs apps/runtimes;
- normative;
- critique pour la compatibilite;
- ou utilisee dans des controles de securite ou d'authorization;

alors elle doit idealement monter au niveau `contracts/*` ou, a minima, avoir une projection centralisee + un test de parite clair.
