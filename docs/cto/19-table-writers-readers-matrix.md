# Table -> Writer -> Reader -> Endpoint

- Statut: draft durable
- Owner: platform engineering
- Derniere revue: 2026-03-21
- Source de verite:
  - `app-api/app/models/*`
  - `app-api-ts/src/routes.ts`
  - `app-api-ts/src/routes/*`
  - `app-api-ts/src/services/*`
  - `app-connectors/src/routes.ts`
  - `app-connectors/src/service.ts`
- Depend de:
  - `docs/cto/04-schema-public-postgres.md`
  - `docs/cto/10-ownership-et-tracabilite-des-donnees.md`
  - `docs/cto/12-ui-endpoint-service-table-type.md`
- Voir aussi:
  - `docs/cto/07-connecteurs-et-sync-runs.md`
  - `docs/cto/11-surfaces-http-et-statut.md`
  - `docs/cto/18-audit-ecarts-database-doc.md`

## Objectif

Cette page ferme le dernier cran de lecture qui manque souvent a un CTO entrant:

- partir d'une table critique;
- identifier qui ecrit reellement cette table;
- identifier qui la relit;
- retrouver rapidement la ou les surfaces HTTP ou UI qui l'exposent.

## Regles de lecture

- `Writer observe` = service ou runtime qui ecrit principalement aujourd'hui.
- `Reader observe` = service ou runtime qui relit principalement aujourd'hui.
- `Endpoint / surface` = exemple concret d'acces observe dans le repo.
- `Statut` = `coeur`, `projection`, `runtime`, `cible`, `legacy coexistant`.

## Matrice tables critiques

| Table / store                 | Writer observe                                                                    | Reader observe                                                     | Endpoint / surface consommatrice                                                                       | Statut             |
| ----------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------ |
| `organizations`               | `AdminBackofficeService.createOrganization` (`app-api-ts`) + migrations `app-api` | `AdminBackofficeService`, surfaces admin overview                  | `GET/POST /api/v1/admin/organizations`                                                                 | coeur              |
| `sites`                       | services admin/org dans `app-api-ts` + migrations `app-api`                       | admin detail, webapp lectures scopees                              | `GET /api/v1/admin/organizations/:orgId`, surfaces webapp live                                         | coeur              |
| `users`                       | backoffice `app-api-ts` + sync identite/Keycloak                                  | webapp/admin auth-context et services admin                        | surfaces Next auth + endpoints admin users/org                                                         | coeur              |
| `client_datasets`             | pipeline/data catalog `app-api`                                                   | `app-api-ts` live/admin + runbook SQL                              | surfaces datasets/admin, lectures data catalog                                                         | coeur              |
| `dataset_columns`             | `app-api` data catalog                                                            | `app-api-ts` et exploration SQL                                    | surfaces schema/gold et admin data catalog                                                             | coeur              |
| `ingestion_log`               | jobs d'ingestion `app-api`                                                        | `app-api-ts` et runbooks                                           | surfaces qualité / data catalog                                                                        | coeur              |
| `canonical_records`           | pipeline medallion `app-api`                                                      | `app-api-ts` live                                                  | `GET /api/v1/live/canonical`, dashboard live                                                           | coeur              |
| `coverage_alerts`             | calculs operationnels `app-api` et certaines mutations `app-api-ts`               | `app-api-ts`, webapp decision queue, admin overview                | `GET /api/v1/live/coverage-alerts`, `POST .../acknowledge`, `POST .../resolve`                         | coeur              |
| `scenario_options`            | calcul scenario `app-api`                                                         | `app-api-ts` scenario workspace                                    | `GET /api/v1/live/scenarios/alert/:alertId`                                                            | coeur              |
| `cost_parameters`             | `app-api` / admin config metier                                                   | `app-api-ts` scenario services                                     | decision workspace et pareto frontier                                                                  | coeur              |
| `operational_decisions`       | `createPersistentOperationalDecision` (`app-api-ts`)                              | `app-api-ts`, webapp history/workspace, admin slices               | `POST /api/v1/operational-decisions`, `GET /api/v1/operational-decisions`                              | coeur              |
| `proof_records`               | `app-api` calcul ROI/proof                                                        | `app-api-ts` proof services                                        | `GET /api/v1/proof`, `GET /api/v1/proof/summary`                                                       | coeur              |
| `decision_approvals`          | services DecisionOps runtime `app-api-ts`                                         | inbox/admin runtime                                                | `GET /api/v1/admin/organizations/:orgId/approval-inbox`, `POST .../approvals/:approvalId/decision`     | projection runtime |
| `action_dispatches`           | services DecisionOps runtime `app-api-ts`                                         | admin action dispatch detail                                       | `GET/POST /api/v1/admin/organizations/:orgId/action-dispatches/:actionId*`                             | projection runtime |
| `decision_ledger_entries`     | services DecisionOps runtime `app-api-ts`                                         | admin ledger detail                                                | `GET/POST /api/v1/admin/organizations/:orgId/ledgers/:ledgerId*`                                       | projection runtime |
| `onboarding_states`           | anciennes projections admin `app-api-ts`                                          | lectures admin historiques / support                               | surfaces admin legacy ou complementaires                                                               | legacy coexistant  |
| `onboarding_cases`            | `createOnboardingCase` (`app-api-ts`) + orchestration Camunda                     | `app-api-ts`, app-admin                                            | `GET/POST /api/v1/admin/onboarding`, `GET /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId` | coeur              |
| `onboarding_case_tasks`       | projection control plane `app-api-ts`                                             | `app-api-ts`, app-admin                                            | `POST .../tasks/:taskId/save`, `POST .../tasks/:taskId/complete`                                       | coeur              |
| `onboarding_case_blockers`    | `app-api-ts` onboarding control plane                                             | `app-api-ts`, app-admin                                            | detail de case onboarding                                                                              | coeur              |
| `onboarding_case_events`      | `app-api-ts` + projections workflow                                               | `app-api-ts`, app-admin                                            | timeline/detail d'une case onboarding                                                                  | coeur              |
| `integration_connections`     | modele cible `app-api`                                                            | docs, futur plan relationnel Python                                | pas de surface runtime observee dominante aujourd'hui                                                  | cible              |
| `integration_sync_runs`       | modele cible `app-api`; runtime reel surtout `app-connectors`                     | docs, workers, future convergence relationnelle                    | cible theorique pour `sync_runs`; runtime actif via connecteurs                                        | cible              |
| `integration_raw_events`      | modele cible `app-api`; runtime reel surtout `app-connectors`                     | docs, future lecture Bronze relationnelle                          | pas la source active principale aujourd'hui                                                            | cible              |
| `connector_runtime_snapshots` | `app-connectors/src/service.ts`                                                   | `app-connectors`, `app-api-ts` via facade admin integrations       | `GET/POST/PATCH /api/v1/admin/organizations/:orgId/integrations/connections*`                          | runtime actif      |
| `connector_secret_records`    | `app-connectors`                                                                  | `app-connectors` seulement                                         | routes auth/connectors runtime                                                                         | runtime actif      |
| snapshot `connections`        | `app-connectors`                                                                  | `app-connectors` + facade admin integrations `app-api-ts`          | catalogue, detail connexion, update connexion                                                          | runtime actif      |
| snapshot `runs`               | `app-connectors`                                                                  | worker Python via routes runtime + `app-api-ts` admin integrations | trigger sync, listing sync runs                                                                        | runtime actif      |
| snapshot `syncStates`         | `app-connectors`                                                                  | worker runtime / routes connecteurs                                | routes connecteurs internes                                                                            | runtime actif      |
| snapshot `rawEvents`          | `app-connectors`                                                                  | worker runtime / routes raw events                                 | endpoints `raw-events`, payload access, claim                                                          | runtime actif      |
| `contact_requests`            | landing relay + route publique `app-api-ts`                                       | backoffice/data follow-up                                          | `POST /app/api/contact`, `POST /api/v1/public/contact-requests`                                        | coeur              |
| `model_registry`              | `app-api` MLOps                                                                   | `app-api` et outils d'observabilite                                | pas de surface produit majeure documentee ici                                                          | coeur technique    |
| `model_inference_jobs`        | `app-api`                                                                         | `app-api` et observabilite                                         | pas de surface produit majeure documentee ici                                                          | coeur technique    |
| `data_lineage_events`         | `app-api`                                                                         | runbooks et observabilite                                          | lecture operatoire, pas de surface front dominante                                                     | coeur technique    |

## Chaines de remontee rapides

### Si on part d'une table

1. Reperer la ligne dans cette matrice.
2. Ouvrir le writer principal pour voir l'intention metier.
3. Ouvrir ensuite la route ou surface citee pour comprendre l'exposition runtime.
4. Finir dans `docs/cto/12-ui-endpoint-service-table-type.md` si le besoin part plutot de l'UI.

### Si on part d'un endpoint

1. Identifier la table dominante via `docs/cto/12-ui-endpoint-service-table-type.md`.
2. Revenir ici pour verifier si la persistance est:
   - une table coeur;
   - une projection runtime;
   - un store snapshot actif;
   - une cible relationnelle pas encore convergee.

## Ambiguites qu'un CTO doit garder en tete

- `integration_sync_runs` et `integration_raw_events` existent comme cible relationnelle Python, mais la file active observee tourne encore surtout via les snapshots `app-connectors`.
- `onboarding_states` coexiste encore avec `onboarding_case*`, mais la lecture operable moderne doit privilegier la famille `onboarding_cases`.
- `decisions` ne joue pas le meme role que `operational_decisions` ni que la trilogie DecisionOps `decision_approvals` / `action_dispatches` / `decision_ledger_entries`.

## Verdict

La base est maintenant lisible selon deux axes complementaires:

- `UI -> endpoint -> service -> table -> type` dans `docs/cto/12-ui-endpoint-service-table-type.md`;
- `table -> writer -> reader -> endpoint` dans cette page.

En pratique, ces deux vues suffisent a remonter rapidement d'un symptome produit a la bonne source de verite technique.
