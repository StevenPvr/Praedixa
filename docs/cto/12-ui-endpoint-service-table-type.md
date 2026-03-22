# UI -> Endpoint -> Service -> Table -> Type

- Statut: draft durable
- Owner: platform + product engineering
- Derniere revue: 2026-03-21
- Source de verite:
  - `app-landing/lib/api/contact/persistence.ts`
  - `app-webapp/lib/api/endpoints/*`
  - `app-admin/lib/api/endpoints.ts`
  - `app-api-ts/src/routes.ts`
  - `app-api-ts/src/routes/*`
  - `app-api-ts/src/services/*`
  - `app-api/app/models/*`
  - `packages/shared-types/src/api/*`
  - `packages/shared-types/src/domain/*`
- Depend de:
  - `docs/cto/01-systeme-et-runtimes.md`
  - `docs/cto/06-flux-de-donnees-applicatifs.md`
  - `docs/cto/10-ownership-et-tracabilite-des-donnees.md`
  - `docs/cto/11-surfaces-http-et-statut.md`
- Voir aussi:
  - `docs/cto/04-schema-public-postgres.md`
  - `docs/cto/07-connecteurs-et-sync-runs.md`
  - `docs/cto/08-contrats-et-types-partages.md`
  - `docs/cto/09-runbook-exploration-bd.md`

## Objectif

Cette page sert de matrice praticable pour remonter:

- d'une surface UI vers l'endpoint appele;
- de l'endpoint vers le service runtime;
- du service vers les tables relues ou ecrites;
- des tables vers les types et contrats partages.

Elle ne couvre pas toutes les routes du repo. Elle cible les parcours qui donnent le plus vite une comprehension systeme a un CTO entrant.

## Comment lire cette page

- `Surface UI` designe le point d'entree utilisateur ou operateur.
- `Endpoint` designe le path BFF / API observe cote front.
- `Service runtime` designe la fonction ou le module principal qui porte la logique.
- `Tables / stores` designe les persistences dominantes relues ou ecrites.
- `Type / contrat` designe le DTO ou contrat le plus utile pour relier l'UI au modele.

## Parcours 1 - Landing contact

| Surface UI                | Endpoint                                                                                            | Service runtime                                                                                            | Tables / stores    | Type / contrat                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| formulaire public landing | `POST /app/api/contact` cote landing, puis `POST /api/v1/public/contact-requests` vers `app-api-ts` | `app-landing/lib/api/contact/persistence.ts` pour le relay, puis handler public `app-api-ts/src/routes.ts` | `contact_requests` | payload local `ContactPayload`, contrat public `POST /api/v1/public/contact-requests` |

Fichiers pivots:

- `app-landing/app/api/contact/route.ts`
- `app-landing/lib/api/contact/persistence.ts`
- `app-api/app/models/contact_request.py`
- `contracts/openapi/public.yaml`

## Parcours 2 - Webapp live dashboard

| Surface UI       | Endpoint                         | Service runtime                                                                                                                      | Tables / stores                                                                                           | Type / contrat                                                                        |
| ---------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| dashboard webapp | `/api/v1/live/dashboard/summary` | route live dans `app-api-ts/src/routes.ts` -> `getPersistentLiveDashboardSummary` dans `app-api-ts/src/services/operational-data.ts` | agrege `canonical_records`, `coverage_alerts`, `forecast_runs` et tables voisines du domaine operationnel | `DashboardSummary` (`app-webapp/lib/api/endpoints/core.ts`, `@praedixa/shared-types`) |

Fichiers pivots:

- `app-webapp/components/dashboard/war-room.tsx`
- `app-webapp/lib/api/endpoints/core.ts`
- `app-api-ts/src/routes.ts`
- `app-api-ts/src/services/operational-data.ts`

## Parcours 3 - Webapp gold explorer

| Surface UI               | Endpoint                                                        | Service runtime                                                                                                                                                 | Tables / stores                                                                 | Type / contrat                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| vues gold / donnees live | `/api/v1/live/gold/schema`, `/rows`, `/coverage`, `/provenance` | `getPersistentGoldSchema`, `listPersistentGoldRows`, `getPersistentGoldCoverage`, `getPersistentGoldProvenance` dans `app-api-ts/src/services/gold-explorer.ts` | lectures derivees depuis la couche gold et les tables/stores exposes au runtime | schemas/reponses business publiques (`contracts/openapi/public.yaml`, `packages/shared-types/src/api/public-contract/response-schemas-business.ts`) |

Fichiers pivots:

- `app-api-ts/src/routes.ts`
- `app-api-ts/src/services/gold-explorer.ts`
- `app-webapp/lib/api/endpoints/*`

## Parcours 4 - Webapp canonical et coverage

| Surface UI        | Endpoint                                                   | Service runtime                                                                     | Tables / stores                           | Type / contrat              |
| ----------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------- |
| vue canonical     | `/api/v1/live/canonical`                                   | `listPersistentCanonicalRecords` dans `app-api-ts/src/services/operational-data.ts` | `canonical_records`                       | `CanonicalRecord`           |
| qualite canonical | `/api/v1/live/canonical/quality`                           | `getPersistentCanonicalQuality`                                                     | `canonical_records` et metriques derivees | `CanonicalQualityDashboard` |
| liste alertes     | `/api/v1/live/coverage-alerts`                             | `listPersistentCoverageAlerts`                                                      | `coverage_alerts`                         | `CoverageAlert`             |
| queue de decision | `/api/v1/live/coverage-alerts/queue`                       | `listPersistentCoverageAlerts` puis mapping queue                                   | `coverage_alerts`                         | `DecisionQueueItem`         |
| ack / resolve     | `/api/v1/coverage-alerts/:alertId/acknowledge`, `/resolve` | `acknowledgePersistentCoverageAlert`, `resolvePersistentCoverageAlert`              | `coverage_alerts`                         | `CoverageAlert`             |

Fichiers pivots:

- `app-webapp/lib/api/endpoints/data.ts`
- `app-api-ts/src/routes.ts`
- `app-api-ts/src/services/operational-data.ts`
- `app-api/app/models/operational.py`

## Parcours 5 - Webapp scenarios, decision workspace et operational decisions

| Surface UI                | Endpoint                                           | Service runtime                                                                               | Tables / stores                                                           | Type / contrat                                            |
| ------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| scenarios pour une alerte | `/api/v1/live/scenarios/alert/:alertId`            | `getPersistentParetoFrontierForAlert` dans `app-api-ts/src/services/operational-scenarios.ts` | `coverage_alerts`, `scenario_options`, `cost_parameters`                  | `ParetoFrontierResponse`                                  |
| workspace de decision     | `/api/v1/live/decision-workspace/:alertId`         | `getPersistentDecisionWorkspace`                                                              | `coverage_alerts`, `scenario_options`, `operational_decisions` et derives | `DecisionWorkspace`                                       |
| creation decision         | `POST /api/v1/operational-decisions`               | `createPersistentOperationalDecision` dans `app-api-ts/src/services/operational-decisions.ts` | `operational_decisions`                                                   | `OperationalDecisionCreateRequest`, `OperationalDecision` |
| historique decisions      | `GET /api/v1/operational-decisions`                | `listPersistentOperationalDecisions`                                                          | `operational_decisions`                                                   | `OperationalDecision`                                     |
| stats override            | `GET /api/v1/operational-decisions/override-stats` | `getPersistentOperationalDecisionOverrideStats`                                               | `operational_decisions`                                                   | `OverrideStatistics`                                      |

Fichiers pivots:

- `app-webapp/lib/api/endpoints/data.ts`
- `app-api-ts/src/routes.ts`
- `app-api-ts/src/services/operational-scenarios.ts`
- `app-api-ts/src/services/operational-decisions.ts`

## Parcours 6 - Webapp proof / ROI

| Surface UI        | Endpoint                      | Service runtime                                                                                | Tables / stores                                     | Type / contrat                          |
| ----------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------- |
| liste proof packs | `/api/v1/proof`               | `listPersistentProofRecords` dans `app-api-ts/src/services/operational-data.ts`                | `proof_records`                                     | `ProofPack`                             |
| summary proof     | `/api/v1/proof/summary`       | `listPersistentProofRecords` puis `summarizePersistentProofRecords`                            | `proof_records`                                     | `ProofPackSummary`                      |
| generation proof  | `POST /api/v1/proof/generate` | route publique encore non pleinement industrialisee selon le statut live/fail-close du runtime | `proof_records` ou flux derive selon implementation | `ProofPackGenerateRequest`, `ProofPack` |

Fichiers pivots:

- `app-webapp/lib/api/endpoints/data.ts`
- `app-api-ts/src/routes.ts`
- `app-api-ts/src/services/operational-data.ts`

## Parcours 7 - Admin organizations

| Surface UI              | Endpoint                                          | Service runtime                                                                                   | Tables / stores                                                                            | Type / contrat                                    |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| liste clients           | `GET /api/v1/admin/organizations`                 | `AdminBackofficeService.listOrganizations`                                                        | `organizations`                                                                            | `AdminOrganizationSummary`                        |
| creation client         | `POST /api/v1/admin/organizations`                | `AdminBackofficeService.createOrganization`                                                       | `organizations`, puis provisionnement identite lie                                         | `CreateAdminOrganizationRequest`                  |
| detail client           | `GET /api/v1/admin/organizations/:orgId`          | `AdminBackofficeService.getOrganizationDetail`                                                    | `organizations`, `sites`, `departments`                                                    | DTOs admin organisations                          |
| overview client         | `GET /api/v1/admin/organizations/:orgId/overview` | routes admin dans `app-api-ts/src/routes.ts`, avec `AdminBackofficeService` et lectures composees | `organizations`, `coverage_alerts`, `scenario_options`, slices dashboards et flux associes | payload admin overview                            |
| suppression client test | `POST /api/v1/admin/organizations/:orgId/delete`  | `AdminBackofficeService.deleteOrganization`                                                       | `organizations`, audit, identities                                                         | `DeleteAdminOrganizationRequest` / response admin |

Fichiers pivots:

- `app-admin/lib/api/endpoints.ts`
- `app-api-ts/src/routes.ts`
- `app-api-ts/src/services/admin-backoffice.ts`
- `packages/shared-types/src/api/admin-organizations.ts`

## Parcours 8 - Admin onboarding

| Surface UI           | Endpoint                                                                                                 | Service runtime                                                         | Tables / stores                                                                                            | Type / contrat                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| listing global cases | `GET /api/v1/admin/onboarding`                                                                           | `listOnboardingCases` via `app-api-ts/src/services/admin-onboarding.ts` | `onboarding_cases`, `onboarding_case_*`                                                                    | `OnboardingCaseSummary`                                           |
| creation d'une case  | `POST /api/v1/admin/onboarding` ou org-scoped `POST /api/v1/admin/organizations/:orgId/onboarding/cases` | `createOnboardingCase`                                                  | `onboarding_cases`, `onboarding_case_tasks`, `onboarding_case_blockers`, `onboarding_case_events`, Camunda | `CreateAdminOnboardingCaseRequest`, `CreateOnboardingCaseRequest` |
| detail org-scoped    | `GET /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId`                                        | `getOnboardingCaseBundle` / `getOnboardingCase`                         | `onboarding_cases`, `onboarding_case_*`                                                                    | `OnboardingCaseBundle`                                            |
| save task draft      | `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/save`                    | `saveOnboardingTaskDraft`                                               | `onboarding_case_tasks`, events de projection                                                              | `SaveOnboardingCaseTaskRequest`                                   |
| complete task        | `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/complete`                | `completeOnboardingTask`                                                | `onboarding_case_tasks`, blockers, events, Camunda                                                         | `CompleteOnboardingCaseTaskRequest`                               |

Fichiers pivots:

- `app-admin/lib/api/endpoints.ts`
- `app-api-ts/src/routes/admin-onboarding-routes.ts`
- `app-api-ts/src/services/admin-onboarding.ts`
- `packages/shared-types/src/api/admin-onboarding.ts`

## Parcours 9 - Admin integrations

| Surface UI              | Endpoint                                                                      | Service runtime                                                                                                        | Tables / stores                                                                                                     | Type / contrat                                                |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| catalogue integrations  | `GET /api/v1/admin/integrations/catalog`                                      | `listIntegrationCatalog` dans `app-api-ts/src/admin-integrations.ts`                                                   | runtime `app-connectors`                                                                                            | `IntegrationCatalogItem`, `IntegrationCatalogResponse`        |
| connexions org          | `GET/POST/PATCH /api/v1/admin/organizations/:orgId/integrations/connections*` | `listIntegrationConnections`, `getIntegrationConnection`, `createIntegrationConnection`, `updateIntegrationConnection` | runtime reel `connector_runtime_snapshots`, `connector_secret_records`; cible `integration_connections` cote Python | `IntegrationConnection`, `CreateIntegrationConnectionRequest` |
| auth start/complete     | `.../authorize/start`, `.../authorize/complete`                               | `startIntegrationAuthorization`, `completeIntegrationAuthorization`                                                    | snapshot runtime + secrets + authorization session                                                                  | DTOs integrations admin                                       |
| connection test         | `.../test`                                                                    | `testIntegrationConnection`                                                                                            | runtime `app-connectors`, vendor probe                                                                              | `IntegrationConnectionTestResponse`                           |
| trigger sync            | `.../sync`                                                                    | `triggerIntegrationSync`                                                                                               | `sync_runs` runtime, puis worker Python                                                                             | `TriggerIntegrationSyncRequest`, `IntegrationSyncRun`         |
| sync runs et raw events | `.../integrations/sync-runs`, `.../raw-events`                                | `listIntegrationSyncRuns`, `listIntegrationRawEvents`                                                                  | runtime snapshot / cible `integration_sync_runs`, `integration_raw_events`                                          | `IntegrationSyncRun` et DTOs integrations                     |

Fichiers pivots:

- `app-admin/lib/api/endpoints.ts`
- `app-api-ts/src/routes/admin-integration-routes.ts`
- `app-api-ts/src/admin-integrations.ts`
- `packages/shared-types/src/domain/integration.ts`
- `packages/shared-types/src/api/requests.ts`
- `packages/shared-types/src/api/responses.ts`

## Parcours 10 - Admin DecisionOps

| Surface UI                      | Endpoint                                                                   | Service runtime                                                                                         | Tables / stores                                                         | Type / contrat                                 |
| ------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| liste contrats                  | `GET /api/v1/admin/organizations/:orgId/decision-contracts`                | `getDecisionContractRuntimeService().listContracts` via `admin-decision-contract-routes.ts`             | tables runtime contract studio cote TS + contrats versionnes repo-owned | `DecisionContractStudioListResponse`           |
| detail/transition/fork/rollback | `.../decision-contracts/:contractId/versions/:contractVersion*`            | `getContractDetail`, `transition`, `fork`, `rollback` du runtime DecisionContract                       | tables runtime contract studio + `contracts/decisionops/*`              | `DecisionContractStudio*`                      |
| approval inbox                  | `GET /api/v1/admin/organizations/:orgId/approval-inbox`                    | `listPersistentApprovalInbox`                                                                           | `decision_approvals`                                                    | DTOs approval inbox                            |
| decision sur approval           | `POST /api/v1/admin/organizations/:orgId/approvals/:approvalId/decision`   | `decidePersistentApproval`                                                                              | `decision_approvals`                                                    | `approvalDecisionSchema`, domain `Approval`    |
| detail dispatch + mutation      | `GET/POST /api/v1/admin/organizations/:orgId/action-dispatches/:actionId*` | `getPersistentActionDispatchDetail`, `decidePersistentActionDispatch`, `decidePersistentActionFallback` | `action_dispatches`                                                     | DTOs action dispatch + domain `ActionDispatch` |
| detail ledger + mutation        | `GET/POST /api/v1/admin/organizations/:orgId/ledgers/:ledgerId*`           | `getPersistentLedgerDetail`, `decidePersistentLedger`                                                   | `decision_ledger_entries`                                               | DTOs ledger + domain `LedgerEntry`             |

Fichiers pivots:

- `app-admin/lib/api/endpoints.ts`
- `app-api-ts/src/routes/admin-decision-runtime-routes.ts`
- `app-api-ts/src/routes/admin-decision-contract-routes.ts`
- `app-api-ts/src/services/decisionops-runtime*.ts`
- `app-api-ts/src/services/decision-contract-runtime.js` et migrations TS associees
- `packages/shared-types/src/api/decision-contract-studio.ts`
- `packages/shared-types/src/domain/decision-contract.ts`
- `packages/shared-types/src/domain/approval.ts`
- `packages/shared-types/src/domain/action-dispatch.ts`
- `packages/shared-types/src/domain/ledger.ts`

## Ce qu'un CTO doit retenir

- La meilleure lecture du produit ne part pas des tables seules, mais des chaines `UI -> route -> service -> table -> type`.
- `app-api-ts` concentre une grande part de la lisibilite systeme, car il fait la jonction entre BFF Next, SQL, connecteurs, Keycloak et Camunda.
- Sur plusieurs domaines, la vraie difficulte n'est pas d'identifier l'endpoint, mais de savoir si l'etat relu vient:
  - d'une table coeur Python/Alembic;
  - d'un runtime possede par Node/TS;
  - d'une cible relationnelle encore en convergence avec un runtime snapshot.

## Limitations connues de cette matrice

- Elle couvre les parcours majeurs, pas l'ensemble des endpoints versionnes.
- Certaines surfaces publiques restent volontairement `fail-close`; voir `docs/cto/11-surfaces-http-et-statut.md`.
- Le domaine integrations garde une dualite explicite entre cible `integration_*` et runtime `app-connectors`.
