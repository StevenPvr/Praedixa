# Schema Public PostgreSQL

Statut: draft
Owner: CTO / platform
Derniere revue: 2026-03-21
Source de verite: `app-api/app/models/*`, `app-api/alembic/versions/*`
Depend de: `docs/cto/03-modele-de-donnees-global.md`
Voir aussi: `docs/DATABASE.md`, `docs/cto/visuals/schema-public-domains.mmd`, `docs/cto/visuals/schema-public-auto-generated.mmd`, `docs/cto/18-audit-ecarts-database-doc.md`

## Perimetre

Cette page decrit le schema `public` versionne par Alembic et represente par les modeles SQLAlchemy Python.

Elle ne pretend pas couvrir tout ce qui vit dans PostgreSQL si une autre couche ajoute ses propres tables hors de ce perimetre. Ici, le but est d'offrir une lecture fiable du socle public pilote par `app-api`.

Un ERD Mermaid semi-automatique existe aussi dans `docs/cto/visuals/schema-public-auto-generated.mmd`, genere depuis `app-api/app/models/*`. Il est utile pour une vue brute des relations, mais il peut faire remonter des cibles de FK legacy encore referencees par certains modeles historiques; la lecture editoriale de cette page et l'audit `18-audit-ecarts-database-doc.md` restent prioritaires.

## Conventions communes

### Mixins

- `TimestampMixin`
  Fournit `created_at` et `updated_at`.
- `TenantMixin`
  Ajoute `organization_id` en plus des timestamps.

### Patterns de modelisation

- Tables "metier coeur"
  colonnes relationnelles explicites + quelques JSONB pour la flexibilite.
- Tables de runtime ou de journaux
  colonnes de recherche normalisees + snapshot `record_json` ou `metadata_json`.
- Tables non tenant-scoped
  reservees a l'admin transverse, a certains journaux ou a des structures scopees indirectement par FK.

## Domaine 1 - Tenant, structure et RBAC

### `organizations`

Role:

- racine du tenant;
- porte le slug, le plan, le statut et la configuration large.

Consommateurs typiques:

- tous les runtimes;
- backoffice admin;
- bootstrap org;
- filtres tenant et ownership transversal.

### `sites`

Role:

- unite physique d'exploitation;
- pivot de nombreux tableaux de bord et lectures operationnelles.

Dependances:

- FK vers `organizations`.

### `departments`

Role:

- unite organisationnelle plus fine;
- rattachement possible a un `site_id`;
- sert aux forecasts et aux decisions historiques.

Dependances:

- FK vers `organizations`;
- FK optionnelle vers `sites`;
- auto-reference optionnelle `parent_id`.

### `users`

Role:

- identite applicative mappee a l'IdP;
- role, statut, scope site.

Dependances:

- FK vers `organizations`;
- FK optionnelle vers `sites`.

Point d'attention:

- certaines tables historiques ou admin portent aussi un identifiant auth opaque separe du FK `users.id`.

## Domaine 2 - Data catalog et ingestion

### `client_datasets`

Role:

- registre des datasets client;
- lien logique entre schema tenant dynamique et gouvernance produit.

Dependances:

- FK vers `organizations`.

### `dataset_columns`

Role:

- definitions de colonnes par dataset;
- typage, role semantique, ordre, overrides.

Dependances:

- FK vers `client_datasets`.

### `fit_parameters`

Role:

- parametres de transformation sauvegardes;
- versionnes et immuables.

Dependances:

- FK vers `client_datasets`.

### `ingestion_log`

Role:

- audit des runs d'ingestion et de transformation.

Dependances:

- FK vers `client_datasets`.

### `quality_reports`

Role:

- resultats des controles qualite par run.

Dependances:

- FK vers `client_datasets`;
- lien logique fort avec `ingestion_log`.

### `pipeline_config_history`

Role:

- historique des changements de configuration pipeline.

Dependances:

- FK vers `client_datasets`.

## Domaine 3 - Forecast et couche operationnelle

### `forecast_runs`

Role:

- metadata d'un run de prevision;
- point de jonction entre pipeline ML et couches produit.

Dependances:

- FK vers `organizations`;
- FK optionnelle vers `departments`.

### `daily_forecasts`

Role:

- sorties journalieres de prevision;
- lues par les ecrans forecast et certains calculs de risque.

Dependances:

- FK vers `organizations`;
- FK vers `forecast_runs`;
- FK optionnelle vers `departments`.

### `canonical_records`

Role:

- representation unifiee charge/capacite par site/date/shift;
- coeur de la couche "gold exploitable".

Dependances:

- tenant-scoped;
- pas de FK directe vers `sites` dans le modele, `site_id` reste un identifiant texte.

Point d'attention:

- ce choix simplifie certains flux data mais complexifie certains joins applicatifs.

### `cost_parameters`

Role:

- coefficients de cout versionnes par site ou org.

Dependances:

- tenant-scoped;
- `site_id` texte optionnel.

### `coverage_alerts`

Role:

- alertes de risque de rupture avec score, horizon et severite.

Dependances:

- tenant-scoped;
- `site_id` texte.

### `scenario_options`

Role:

- options de remediations calculees a partir d'une alerte.

Dependances:

- FK vers `coverage_alerts`;
- FK optionnelle vers `cost_parameters`.

### `operational_decisions`

Role:

- decision prise sur une alerte et une option;
- pivot du runtime DecisionOps recent.

Dependances:

- FK vers `coverage_alerts`;
- FK optionnelle vers `scenario_options`;
- FK optionnelle vers `users` pour `decided_by`.

### `proof_records`

Role:

- preuve mensuelle de valeur par site.

Dependances:

- tenant-scoped;
- `site_id` texte.

### `dashboard_alerts`

Role:

- alertes de dashboard plus larges que les seules ruptures de couverture.

Dependances:

- tenant-scoped.

## Domaine 4 - Runtime DecisionOps

### `decision_approvals`

Role:

- persistance des demandes d'approbation;
- capture du contrat, du role approbateur et du snapshot runtime.

Dependances:

- FK vers `operational_decisions`.

### `action_dispatches`

Role:

- persistance du cycle de dispatch d'action;
- destination system, mode et idempotence.

Dependances:

- FK vers `operational_decisions`;
- FK logique vers `decision_approvals` via `approval_id`.

### `decision_ledger_entries`

Role:

- revisions du ledger finance-grade;
- statut metier + statut de validation.

Dependances:

- FK vers `operational_decisions`;
- FK optionnelle vers `action_dispatches`.

## Domaine 5 - Admin, audit et conformite

### `admin_audit_log`

Role:

- journal append-only des actions super admin.

Dependances:

- FK optionnelle vers `users` pour l'acteur local;
- `target_org_id` garde une reference historique simple, sans FK vivante.

### `plan_change_history`

Role:

- audit des changements de plan d'abonnement.

Dependances:

- FK vers `organizations`;
- FK optionnelle vers `users`.

### `rgpd_erasure_requests`

Role:

- workflow d'effacement RGPD.

Point d'attention:

- `organization_id` n'est volontairement pas une FK, pour que la trace survive a la suppression cible.

### `rgpd_erasure_audit_events`

Role:

- timeline append-only des evenements RGPD.

Dependances:

- FK vers `rgpd_erasure_requests`.

### `contact_requests`

Role:

- demandes de contact issues des surfaces publiques.

## Domaine 6 - Onboarding

### `onboarding_states`

Role:

- surface historique de suivi onboarding simple.

### `onboarding_cases`

Role:

- racine du control plane onboarding BPM.

Dependances:

- FK vers `organizations`;
- FK optionnelles vers `users`.

### `onboarding_case_tasks`

Role:

- taches projetees du case.

Dependances:

- FK vers `onboarding_cases`;
- FK optionnelle vers `users`.

### `onboarding_case_blockers`

Role:

- bloqueurs explicites du parcours onboarding.

Dependances:

- FK vers `onboarding_cases`.

### `onboarding_case_events`

Role:

- timeline append-only du case.

Dependances:

- FK vers `onboarding_cases`.

## Domaine 7 - Integrations

### `integration_connections`

Role:

- connexion metier a un vendor.

Dependances:

- FK vers `organizations`;
- FK optionnelles vers `users`.

Point d'attention:

- l'enum Python `IntegrationAuthMode` ne contient que `oauth2`, `api_key`, `service_account`, `sftp`.

### `integration_sync_runs`

Role:

- file et execution des synchronisations.

Dependances:

- FK vers `organizations`;
- FK vers `integration_connections`;
- FK optionnelle vers `users`.

### `integration_sync_state`

Role:

- curseur par `source_object`.

Dependances:

- FK vers `integration_connections`;
- FK optionnelle vers `integration_sync_runs`.

### `integration_raw_events`

Role:

- evenements bruts references par objet, event id et payload externe.

Dependances:

- FK vers `integration_connections`;
- FK optionnelle vers `integration_sync_runs`.

### `integration_field_mappings`

Role:

- mappings par vendor/source_object.

Dependances:

- FK vers `integration_connections`;
- FK optionnelle vers `users`.

### `integration_error_events`

Role:

- erreurs d'execution classees.

Dependances:

- FK vers `integration_connections`;
- FK optionnelle vers `integration_sync_runs`.

### `integration_dead_letter_queue`

Role:

- payloads/problematiques a rejouer ou jeter.

Dependances:

- FK vers `integration_connections`;
- FK optionnelle vers `integration_sync_runs`.

### `integration_webhook_receipts`

Role:

- traces de receptions webhooks.

Dependances:

- FK vers `integration_connections`;
- FK optionnelle vers `integration_sync_runs`.

### `integration_audit_events`

Role:

- journal des actions et mutations d'integration.

Dependances:

- FK vers `integration_connections` optionnelle;
- acteur humain ou service.

## Domaine 8 - Collaboration

### `conversations`

Role:

- threads client/admin.

Dependances:

- FK vers `organizations`.

### `messages`

Role:

- messages individuels.

Dependances:

- FK vers `conversations`;
- `sender_user_id` reste un UUID non contraint par FK.

## Domaine 9 - MLOps

### `model_registry`

Role:

- registre des modeles par organisation.

Dependances:

- FK vers `organizations`;
- FK optionnelle vers `users`.

### `model_inference_jobs`

Role:

- jobs d'inference traces.

Dependances:

- FK vers `organizations`;
- FK optionnelles vers `model_registry`, `forecast_runs`, `users`.

### `model_artifact_access_log`

Role:

- log append-only d'acces aux artefacts de modele.

Dependances:

- FK vers `organizations`;
- FK vers `model_registry`.

### `data_lineage_events`

Role:

- evenements de lineage et de provenance.

Dependances:

- tenant-scoped.

## Ambiguities et drifts a signaler

### Legacy retire mais encore reference

La migration `019_remove_orphan_models.py` supprime:

- `employees`
- `absences`
- `action_plans`

Pourtant, le modele `Decision` garde encore:

- `related_employee_id -> employees.id`
- `suggested_replacement_id -> employees.id`

Ce n'est pas une hypothese: c'est un ecart reel a signaler a tout lecteur CTO.

### Onboarding historique vs BPM

`onboarding_states` coexiste avec `onboarding_cases*`. Le domaine actif semble migrer vers le bloc BPM, surtout apres `028` puis `029_onboarding_camunda_only.py`, mais la coexistence reste visible dans le schema.

### Integrations: auth modes et convergence

Le schema Python/Alembic des integrations est proprement structure, mais il ne doit pas etre lu comme preuve que tous les runtimes utilisent deja exactement cette modelisation. Ce point doit etre rapproche de la doc connecteurs globale.

## Synthese CTO

Si l'on simplifie, le schema `public` se lit comme suit:

- `organizations`, `sites`, `departments`, `users`
  donnent la structure;
- `client_datasets*`
  gouvernent la matiere data;
- `canonical_records`, `daily_forecasts`, `coverage_alerts`, `operational_decisions`, `proof_records`
  portent la valeur produit;
- `decision_approvals`, `action_dispatches`, `decision_ledger_entries`
  portent le runtime DecisionOps recent;
- `integration_*`
  portent le plan de controle integrations;
- `admin_*`, `rgpd_*`, `onboarding_*`, `conversations`, `mlops_*`
  portent le pilotage transverse.

## Diagrammes associes

- Vue globale: `docs/cto/visuals/erd-global.mmd`
- Vue par domaines du public: `docs/cto/visuals/schema-public-domains.mmd`
