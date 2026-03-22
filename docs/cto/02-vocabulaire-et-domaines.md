# 02 - Vocabulaire Et Domaines

- Statut: actif
- Owner: engineering
- Derniere revue: 2026-03-21
- Source de verite: `docs/architecture/domain-vocabulary.md`, `packages/shared-types/src/domain/*`, `contracts/*`, `app-api/app/models/*`
- Depend de: `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/cto/03-modele-de-donnees-global.md`
- Voir aussi: `docs/cto/08-contrats-et-types-partages.md`, `packages/shared-types/src/domain/README.md`, `contracts/decisionops/README.md`

## But

Donner a un CTO un langage commun pour lire le schema, les contrats, les types partages et les flux runtime sans changer de definition selon le dossier consulte.

## Domaines fonctionnels

| Domaine                               | Sens CTO                                                                       | Artefacts pivots                                                                                                                                                                                         | Source de verite principale                                     |
| ------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Tenant et RBAC                        | Organisations, sites, users, permissions et scoping multi-tenant               | `app-api/app/models/organization.py`, `site.py`, `user.py`, `department.py`, `packages/shared-types/src/domain/organization.ts`                                                                          | `app-api/app/models/*` + `app-api/alembic/versions/*`           |
| Catalogue de donnees                  | Datasets clients, colonnes, ingestion, qualite, historique de config           | `app-api/app/models/data_catalog.py`, `app-api/alembic/versions/004_data_catalog_tables.py`, `packages/shared-types/src/domain/dataset.ts`                                                               | `app-api/app/models/data_catalog.py`                            |
| Medallion                             | Flux raw -> transformed -> gold pour chaque tenant                             | `docs/medallion-pipeline.md`, `app-api/app/services/datasets.py`, `app-api/app/services/schema_manager.py`                                                                                               | `app-api/app/services/*` + schemas `{org}_data`                 |
| Donnees canoniques et operationnelles | Canonical, coverage alerts, scenarios, forecasts, proof, operational decisions | `app-api/app/models/operational.py`, `forecast_run.py`, `daily_forecast.py`, `packages/shared-types/src/domain/canonical.ts`, `coverage-alert.ts`, `scenario.ts`, `operational-decision.ts`, `report.ts` | `app-api/app/models/operational.py`                             |
| DecisionOps                           | Contrats, graphes, approvals, dispatch, ledger et surfaces de gouvernance      | `contracts/decisionops/*.schema.json`, `packages/shared-types/src/domain/decision-contract.ts`, `decision-graph.ts`, `approval.ts`, `action-dispatch.ts`, `ledger.ts`                                    | `contracts/decisionops/*` pour les primitives versionnees       |
| Onboarding admin                      | Cases, tasks, blockers, events et projection BPM                               | `app-api/app/models/onboarding_case.py`, `packages/shared-types/src/api/admin-onboarding.ts`, `app-api-ts/src/services/admin-onboarding*.ts`                                                             | tables `onboarding_cases*` + contrats partages admin            |
| Integrations                          | Connections, sync runs, raw events, payload store, workers et vendors          | `app-api/app/models/integration.py`, `app-connectors/README.md`, `packages/shared-types/src/domain/integration.ts`                                                                                       | `app-api/app/models/integration.py` pour la cible relationnelle |
| Contrats et types                     | OpenAPI public, contrats admin, events et types partages TS                    | `contracts/*`, `packages/shared-types/src/api/*`, `packages/shared-types/src/domain/*`                                                                                                                   | `contracts/*` + `packages/shared-types/*`                       |

## Identifiants canoniques

| Identifiant        | Portee                          | Apparait dans                                           | Sens canonique                                        | A ne pas confondre avec               |
| ------------------ | ------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| `organization_id`  | tenant                          | DB, JWT, events, contrats, logs                         | identifiant UUID du tenant Praedixa                   | un slug d'organisation                |
| `site_id`          | sous-scope metier               | DB, JWT, routes live/admin, contrats                    | identifiant du site de rattachement ou de filtrage    | un code site fonctionnel              |
| `contract_id`      | gouvernance DecisionOps         | JSON Schema, ledger, approval, dispatch                 | identifiant stable de la famille de decision          | `contract_version`                    |
| `contract_version` | version metier                  | DecisionContract, Approval, ActionDispatch, LedgerEntry | revision metier d'un contrat de decision              | `schema_version`                      |
| `graph_id`         | modele semantique               | DecisionGraph                                           | identifiant stable d'un graphe                        | `graph_version`                       |
| `graph_version`    | version metier                  | DecisionGraph                                           | revision du graphe publie                             | `canonical_model_version`             |
| `schema_version`   | structure de schema             | `contracts/*`                                           | version structurelle d'un schema JSON                 | `contract_version`, `payload_version` |
| `payload_version`  | structure du payload transporte | `contracts/events/event-envelope.schema.json`           | version du payload metier transporte dans l'enveloppe | `schema_version` de l'enveloppe       |
| `event_id`         | evenement                       | events, integrations, payloads                          | identifiant unique d'un evenement                     | `request_id`                          |
| `request_id`       | requete applicative             | headers, logs, responses                                | identifiant de correlation applicatif                 | `trace_id`                            |
| `trace_id`         | trace transverse                | telemetry, events                                       | identifiant de trace cross-service                    | `request_id`                          |
| `run_id`           | execution runtime               | telemetry ou batch                                      | identifiant generique d'execution                     | `connector_run_id`                    |
| `connector_run_id` | integration runtime             | telemetry, workers                                      | identifiant d'un run connecteur                       | `event_id`                            |
| `approval_id`      | DecisionOps                     | Approval, inbox, admin API                              | identifiant unique d'une demande d'approbation        | `recommendation_id`                   |
| `action_id`        | DecisionOps                     | ActionDispatch, write-back                              | identifiant d'une tentative d'action                  | `approval_id`                         |
| `ledger_id`        | DecisionOps                     | LedgerEntry                                             | identifiant de la trace economique                    | `proof pack`                          |

## Termes transverses

| Terme                  | Sens canonique                                                                                               | Artefacts pivots                                                                                               | A ne pas confondre avec                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `DecisionContract`     | primitive versionnee qui decrit regles, contraintes, approbations, actions et ROI d'une famille de decisions | `contracts/decisionops/decision-contract.schema.json`, `packages/shared-types/src/domain/decision-contract.ts` | `decision-config`                            |
| `decision-config`      | moteur coverage-specifique existant, encore runtime dans `app-api-ts`                                        | `packages/shared-types/src/domain/decision-config.ts`, `app-api-ts/src/services/decision-config.ts`            | `DecisionContract`                           |
| `decision`             | recommandation ou arbitrage produit par le systeme                                                           | `packages/shared-types/src/domain/decision.ts`, `app-api/app/models/decision.py`                               | une page UI                                  |
| `operational decision` | decision prise par un operateur sur une alerte ou un scenario                                                | `packages/shared-types/src/domain/operational-decision.ts`, `app-api/app/models/operational.py`                | `decision` historique generique              |
| `workspace`            | surface UI de travail pour comprendre, comparer ou valider une decision                                      | `packages/shared-types/src/domain/decision-workspace.ts`                                                       | une table de reference                       |
| `scenario`             | evaluation calculee d'options avec contraintes et outcome compare                                            | `packages/shared-types/src/domain/scenario.ts`                                                                 | un contrat ou une action                     |
| `approval`             | validation ou rejet explicite d'une decision/action                                                          | `contracts/decisionops/approval.schema.json`, `packages/shared-types/src/domain/approval.ts`                   | une permission RBAC                          |
| `action dispatch`      | trace de dry-run, dispatch, retry, ack ou fallback humain                                                    | `contracts/decisionops/action-dispatch.schema.json`, `packages/shared-types/src/domain/action-dispatch.ts`     | une simple recommandation                    |
| `ledger`               | reference economique entre baseline, recommande, reel et ROI                                                 | `contracts/decisionops/ledger-entry.schema.json`, `packages/shared-types/src/domain/ledger.ts`                 | un proof pack marketing                      |
| `proof pack`           | surface de preuve/explainability destinee a montrer ce qui a ete decide et pourquoi                          | `packages/shared-types/src/domain/report.ts`, `app-api/app/services/proof_service.py`                          | le ledger economique                         |
| `canonical`            | representation operationnelle standardisee des faits metier par site/date/shift                              | `packages/shared-types/src/domain/canonical.ts`, `app-api/app/models/operational.py`                           | raw/transformed tenant tables                |
| `gold`                 | couche la plus exploitable par les frontends et les analyses                                                 | `app-api/app/services/gold_live_data.py`, `app-api-ts/src/services/gold-explorer.ts`                           | canonical pur                                |
| `sync run`             | execution d'une synchronisation d'integration                                                                | `app-api/app/models/integration.py`, `app-connectors/README.md`                                                | une simple connexion                         |
| `raw event`            | charge brute capturee avant transformation metier                                                            | `integration_raw_events`, `app-connectors` payload store                                                       | une ligne gold                               |
| `payload store`        | stockage des payloads bruts hors tables de lecture applicative                                               | `app-connectors/src/payload-store.ts`                                                                          | `integration_raw_events` cible relationnelle |

## Regles de versioning a retenir

| Champ              | Question a se poser                                                       | Exemple                                                                   |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `schema_version`   | la forme JSON a-t-elle change ?                                           | `DecisionContract` passe de `1.0.0` a `2.0.0` si la structure casse       |
| `payload_version`  | le payload transporte dans une enveloppe d'evenement a-t-il change ?      | `dataset.freshness.breached` evolue sans changer l'enveloppe globale      |
| `contract_version` | la logique metier publiee pour une famille de decisions a-t-elle change ? | un nouveau seuil ou une nouvelle approbation publie une nouvelle revision |
| `graph_version`    | le modele semantique publie a-t-il change ?                               | ajout d'une relation ou d'une metrique supportee                          |

## Ambiguites connues a garder en tete

- `decision-config` est un runtime coverage existant, pas encore un synonyme strict de `DecisionContract`.
- `workspace` designe une surface UI; ce n'est pas une promesse de table ou d'entite persistante de reference.
- `proof pack` et `ledger` sont relies, mais n'ont pas le meme niveau de formalisation ni le meme objectif.
- `integration_*` decrit la cible relationnelle cote Python; `app-connectors` conserve encore aujourd'hui un runtime snapshot distinct pour une partie de la persistence.

## Comment utiliser ce document

1. Si un terme apparait dans plusieurs apps, verifier ici son sens canonique avant d'ouvrir les fichiers runtime.
2. Si un nouvel identifiant transverse apparait, l'ajouter ici avec sa portee et sa source de verite.
3. Si un terme change de sens, mettre a jour ce document et `docs/architecture/domain-vocabulary.md` dans le meme changement.
