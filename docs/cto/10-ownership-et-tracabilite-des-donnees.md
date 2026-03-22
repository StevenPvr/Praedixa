# Ownership Et Tracabilite Des Donnees

- Statut: draft durable
- Owner: CTO / platform engineering
- Derniere revue: 2026-03-21
- Source de verite:
  - `app-api/app/models/*`
  - `app-api/alembic/versions/*`
  - `app-api-ts/src/services/*`
  - `app-connectors/src/*`
- Depend de:
  - `docs/cto/03-modele-de-donnees-global.md`
  - `docs/cto/06-flux-de-donnees-applicatifs.md`
  - `docs/cto/07-connecteurs-et-sync-runs.md`
- Voir aussi:
  - `docs/cto/04-schema-public-postgres.md`
  - `docs/cto/08-contrats-et-types-partages.md`
  - `docs/cto/09-runbook-exploration-bd.md`
  - `docs/architecture/ownership-matrix.md`

## Objectif

Cette page repond a la question la plus importante pour un CTO entrant:

- quel runtime ecrit quoi;
- quel runtime lit quoi;
- quelle brique fait foi;
- comment remonter d'une donnee a ses contrats, services et consommateurs.

## Regles de lecture

- `Owner` designe la brique qui porte l'intention metier et l'evolution structurelle.
- `Writers` designe les runtimes ou jobs qui ecrivent reellement l'etat.
- `Readers` designe les surfaces qui relisent cet etat.
- `Source de verite` designe l'artefact normatif a consulter en premier en cas de doute.

## Matrice par domaine

| Domaine                          | Tables / artefacts pivots                                                                                                                                                                                                                                     | Writers principaux                                                                          | Readers principaux                                       | Owner principal          | Source de verite                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| Tenant et RBAC                   | `organizations`, `sites`, `departments`, `users`                                                                                                                                                                                                              | `app-api` migrations + bootstrap org, `app-api-ts` admin backoffice, Keycloak sync indirect | `app-api-ts`, `app-webapp`, `app-admin`, services Python | platform + admin product | `app-api/app/models/organization.py`, `site.py`, `department.py`, `user.py`                         |
| Catalogue de donnees             | `client_datasets`, `dataset_columns`, `fit_parameters`, `ingestion_log`, `quality_reports`, `pipeline_config_history`                                                                                                                                         | `app-api` data-plane Python                                                                 | `app-api-ts` admin/live, runbooks SQL                    | data platform            | `app-api/app/models/data_catalog.py`, migrations `004`, `008`, `009`                                |
| Schemas tenant                   | `{org}_data.*`, `{org}_data.*_transformed`                                                                                                                                                                                                                    | `app-api` via `schema_manager.py`, pipeline medallion, workers d'ingestion                  | `app-api` en direct, lectures derivees vers `app-api-ts` | data platform            | `app-api/app/services/schema_manager.py`, `docs/cto/05-schemas-tenant-et-medallion.md`              |
| Forecast et operationnel         | `forecast_runs`, `daily_forecasts`, `canonical_records`, `coverage_alerts`, `scenario_options`, `operational_decisions`, `proof_records`                                                                                                                      | `app-api` pour calculs et transformations, `app-api-ts` pour certaines mutations operateur  | `app-api-ts`, `app-webapp`, `app-admin`                  | product + data platform  | `app-api/app/models/operational.py`, `forecast_run.py`, `daily_forecast.py`                         |
| DecisionOps runtime              | `decision_approvals`, `action_dispatches`, `decision_ledger_entries`                                                                                                                                                                                          | `app-api-ts`                                                                                | `app-admin`, surfaces DecisionOps admin, audit SQL       | product platform         | `app-api/app/models/decisionops_runtime.py`, `app-api-ts/src/services/decisionops-runtime*.ts`      |
| Decision contracts               | `contracts/decisionops/*.schema.json`, `packages/shared-types/src/domain/decision-*.ts`, tables runtime `decision_contract_*` cote TS                                                                                                                         | `app-api-ts` pour le runtime admin, contrats versionnes cote repo                           | `app-admin`, `app-api-ts`, tests                         | platform + product       | `contracts/decisionops/*`, `packages/shared-types/*`, migrations SQL `app-api-ts/migrations/*`      |
| Onboarding BPM                   | `onboarding_states`, `onboarding_cases`, `onboarding_case_tasks`, `onboarding_case_blockers`, `onboarding_case_events`                                                                                                                                        | `app-api-ts` + Camunda, avec projection persistante                                         | `app-admin`, `app-api-ts`, SQL runbook                   | admin product            | `app-api/app/models/admin.py`, `onboarding_case.py`, `app-api-ts/src/services/admin-onboarding*.ts` |
| Integrations cible relationnelle | `integration_connections`, `integration_sync_runs`, `integration_sync_state`, `integration_raw_events`, `integration_field_mappings`, `integration_error_events`, `integration_dead_letter_queue`, `integration_webhook_receipts`, `integration_audit_events` | `app-api` modele cible, workers Python                                                      | `app-api`, docs CTO, SQL runbook                         | integration platform     | `app-api/app/models/integration.py`, migration `026_integration_platform_foundation.py`             |
| Integrations runtime reel        | `connector_runtime_snapshots`, `connector_secret_records`, payload store, snapshot `connections/runs/syncStates/rawEvents/...`                                                                                                                                | `app-connectors`                                                                            | `app-connectors`, workers Python via routes runtime      | integration platform     | `app-connectors/src/persistent-store.ts`, `app-connectors/src/service.ts`                           |
| Collaboration                    | `conversations`, `messages`                                                                                                                                                                                                                                   | `app-api`, `app-api-ts` selon surfaces exposees                                             | `app-api-ts`, `app-admin`                                | product                  | `app-api/app/models/conversation.py`                                                                |
| MLOps                            | `model_registry`, `model_inference_jobs`, `model_artifact_access_log`, `data_lineage_events`                                                                                                                                                                  | `app-api`                                                                                   | `app-api`, surfaces d'observabilite et docs              | data platform            | `app-api/app/models/mlops.py`                                                                       |
| Audit et conformite              | `admin_audit_log`, `plan_change_history`, `rgpd_erasure_requests`, `rgpd_erasure_audit_events`, `contact_requests`                                                                                                                                            | `app-api-ts` pour l'admin, `app-api` pour la conformite batch                               | `app-admin`, SQL runbook                                 | platform + security      | `app-api/app/models/admin.py`, `contact_request.py`                                                 |

## Chaines de tracabilite typiques

### Partir d'une page admin

1. Identifier la route BFF Next ou l'endpoint appele.
2. Ouvrir `app-api-ts/src/routes.ts` ou `app-api-ts/src/routes/*`.
3. Rejoindre le service `app-api-ts/src/services/*`.
4. Identifier les tables lues/ecrites.
5. Verifier dans `app-api/app/models/*` et `app-api/alembic/versions/*` si la table est coeur, legacy, projection ou cible.

### Partir d'une table PostgreSQL

1. Lire la table dans `app-api/app/models/*`.
2. Revenir a la migration qui l'a creee ou modifiee.
3. Identifier les runtimes writers et readers.
4. Verifier si elle est exposee via `app-api-ts`, traitee par `app-api`, ou seulement visee par une cible d'architecture.

### Partir d'un contrat ou d'un type

1. Commencer dans `contracts/*` ou `packages/shared-types/*`.
2. Identifier la projection runtime dans `app-api-ts`.
3. Rejoindre les tables de persistence ou les logs de correlation.

## Points de vigilance CTO

- `app-api-ts` est a la fois facade HTTP et writer de plusieurs domaines structurants. Ce n'est pas un simple proxy.
- `app-api` reste la source de verite du schema global et du pipeline data, meme si certaines surfaces applicatives sont possedees en pratique par Node/TS.
- Le domaine integrations a aujourd'hui deux realites a lire en parallele:
  cible `integration_*` et runtime snapshot `app-connectors`.
- Le domaine DecisionOps a lui aussi deux plans:
  primitives versionnees dans `contracts/decisionops/*` et runtime persistant admin dans `app-api-ts`.
