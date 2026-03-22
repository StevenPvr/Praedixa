# Base de donnees

PostgreSQL 16 avec acces async via **asyncpg**, ORM **SQLAlchemy 2.0** (mapped_column, Mapped[T]), et migrations **Alembic**.

Lire aussi:

- `docs/cto/04-schema-public-postgres.md` pour le dictionnaire CTO table par table.
- `docs/cto/18-audit-ecarts-database-doc.md` pour les ecarts entre cette synthese et le code.
- `docs/cto/20-hierarchie-documentaire-et-normativite.md` pour savoir quand cette page est normative et quand il faut remonter au code.

## Structure des schemas

La base de donnees utilise deux types de schemas :

| Schema            | Contenu                                                     | Creation            |
| ----------------- | ----------------------------------------------------------- | ------------------- |
| `public`          | Tables applicatives (organizations, users, forecasts, etc.) | Alembic migrations  |
| `{org_slug}_data` | Tables de donnees brutes et transformees par client         | `schema_manager.py` |

### Schema public

Contient aujourd'hui 47 tables versionnees par les modeles SQLAlchemy et Alembic. Toutes les entites metier vivent ici : organisations, utilisateurs, previsions, read-models DecisionOps, alertes, audit, onboarding BPM, integrations, conformite, contact public et MLOps.

### Schemas par client (`{org_slug}_data`)

Chaque organisation possede un schema dedie pour ses donnees brutes et transformees. Le `schema_manager.py` cree ces schemas dynamiquement :

```python
# app-api/app/services/schema_manager.py
async def create_client_schemas(org_slug: str) -> str:
    """Cree le schema data pour un client (ex: 'acme' → 'acme_data')."""
    validated_slug = validate_client_slug(org_slug)
    data_schema = f"{validated_slug}_{settings.DATA_SCHEMA_SUFFIX}"
    # DDL via psycopg.sql.Identifier (zero f-string interpolation)
    # ...
    return data_schema
```

Chaque dataset du catalogue genere deux tables dans ce schema :

- **`{table_name}`** : donnees brutes (colonnes systeme `_row_id`, `_ingested_at`, `_batch_id` + colonnes dynamiques)
- **`{table_name}_transformed`** : donnees transformees (colonnes systeme `_row_id`, `_transformed_at`, `_pipeline_version` + colonnes originales + features calculees)

**Securite** : tous les identifiants SQL passent par `psycopg.sql.Identifier` et les validateurs DDL (`validate_client_slug`, `validate_table_name`, `validate_column_name`). Aucune interpolation f-string n'est utilisee pour les identifiants.

## Entites et relations

### Diagramme des relations principales

Note: ce diagramme garde une trace historique utile mais il n'est pas une source de verite exhaustive du schema courant. Les references `Employee`, `Absence` et `ActionPlan` doivent etre lues comme heritage de migrations initiales, pas comme tables actives du schema courant.

```mermaid
erDiagram
    Organization ||--o{ Site : "possede"
    Organization ||--o{ User : "emploie"
    Organization ||--o{ Department : "contient"
    Organization ||--o{ Employee : "gere"
    Organization ||--o{ ForecastRun : "execute"
    Organization ||--o{ Decision : "prend"
    Organization ||--o{ Conversation : "participe"
    Organization ||--o{ ClientDataset : "configure"
    Organization ||--o{ CoverageAlert : "recoit"
    Organization ||--o{ CanonicalRecord : "stocke"
    Organization ||--o{ ProofRecord : "genere"

    Site ||--o{ Department : "heberge"
    Site ||--o{ Employee : "affecte"
    Department ||--o{ Employee : "regroupe"
    Employee ||--o{ Absence : "declare"

    ForecastRun ||--o{ DailyForecast : "produit"
    CoverageAlert ||--o{ ScenarioOption : "propose"
    CoverageAlert ||--o{ OperationalDecision : "resout"
    ScenarioOption }o--|| CostParameter : "utilise"

    ClientDataset ||--o{ DatasetColumn : "definit"
    ClientDataset ||--o{ FitParameter : "stocke"
    ClientDataset ||--o{ IngestionLog : "trace"

    Conversation ||--o{ Message : "contient"
```

### Inventaire des modeles par domaine

#### Core

| Modele         | Table           | Mixin            | Colonnes cles                                                                                                     |
| -------------- | --------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Organization` | `organizations` | `TimestampMixin` | id, name, slug, status, plan, sector, size, contact_email, settings (JSONB)                                       |
| `Site`         | `sites`         | `TenantMixin`    | id, organization_id, name, code, address (JSONB), timezone, headcount                                             |
| `Department`   | `departments`   | `TenantMixin`    | id, organization_id, site_id, parent_id, name, cost_center, min_staffing_level                                    |
| `User`         | `users`         | `TenantMixin`    | id, organization_id, auth_user_id, email, role, status, site_id, mfa_enabled                                      |
| `Employee`     | `employees`     | `TenantMixin`    | id, organization_id, department_id, site_id, employee_number, employment_type, contract_type, fte, skills (ARRAY) |

#### Data Catalog

| Modele                  | Table                     | Mixin                   | Colonnes cles                                                                                                         |
| ----------------------- | ------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ClientDataset`         | `client_datasets`         | `TenantMixin`           | id, organization_id, name, schema_data, table_name, temporal_index, group_by (ARRAY), pipeline_config (JSONB), status |
| `DatasetColumn`         | `dataset_columns`         | `TimestampMixin`        | id, dataset_id, name, dtype, role, nullable, rules_override (JSONB), ordinal_position                                 |
| `FitParameter`          | `fit_parameters`          | aucun (created_at only) | id, dataset_id, column_name, transform_type, parameters (JSONB), hmac_sha256, version, is_active                      |
| `IngestionLog`          | `ingestion_log`           | `TimestampMixin`        | id, dataset_id, mode, rows_received, rows_transformed, status, file_name, file_size                                   |
| `QualityReport`         | `quality_reports`         | `TimestampMixin`        | id, dataset_id, ingestion_log_id, rows_received, duplicates_found, outliers_found, column_details (JSONB)             |
| `PipelineConfigHistory` | `pipeline_config_history` | aucun (created_at only) | id, dataset_id, config_snapshot (JSONB), columns_snapshot (JSONB), changed_by                                         |

#### Operational

| Modele                | Table                     | Mixin         | Colonnes cles                                                                                                                 |
| --------------------- | ------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `CanonicalRecord`     | `canonical_records`       | `TenantMixin` | id, site_id, date, shift, competence, charge_units, capacite_plan_h, realise_h, abs_h, hs_h, interim_h                        |
| `CostParameter`       | `cost_parameters`         | `TenantMixin` | id, site_id, version, c_int, maj_hs, c_interim, premium_urgence, c_backlog, effective_from, effective_until                   |
| `CoverageAlert`       | `coverage_alerts`         | `TenantMixin` | id, site_id, alert_date, shift, horizon, p_rupture, gap_h, severity, status, drivers_json (JSONB)                             |
| `ScenarioOption`      | `scenario_options`        | `TenantMixin` | id, coverage_alert_id, cost_parameter_id, option_type, cout_total_eur, service_attendu_pct, is_pareto_optimal, is_recommended |
| `OperationalDecision` | `operational_decisions`   | `TenantMixin` | id, coverage_alert_id, chosen_option_id, site_id, decision_date, is_override, override_reason, cout_observe_eur               |
| `ProofRecord`         | `proof_records`           | `TenantMixin` | id, site_id, month, cout_bau_eur, cout_reel_eur, gain_net_eur, capture_rate, adoption_pct                                     |
| `DecisionApproval`    | `decision_approvals`      | `TenantMixin` | approval_id, recommendation_id, site_id, contract_id, status, approver_role, requested_at, record_json (JSONB)                |
| `ActionDispatch`      | `action_dispatches`       | `TenantMixin` | action_id, recommendation_id, approval_id, site_id, contract_id, status, dispatch_mode, idempotency_key, record_json (JSONB)  |
| `DecisionLedger`      | `decision_ledger_entries` | `TenantMixin` | ledger_id, revision, recommendation_id, action_id, site_id, contract_id, status, validation_status, record_json (JSONB)       |

#### Forecasting

| Modele          | Table             | Mixin         | Colonnes cles                                                                                                       |
| --------------- | ----------------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ForecastRun`   | `forecast_runs`   | `TenantMixin` | id, organization_id, model_type, horizon_days, status, accuracy_score, config (JSONB)                               |
| `DailyForecast` | `daily_forecasts` | `TenantMixin` | id, forecast_run_id, department_id, forecast_date, dimension, predicted_demand, predicted_capacity, gap, risk_score |

#### Decisions

| Modele       | Table          | Mixin         | Colonnes cles                                                                                                        |
| ------------ | -------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Decision`   | `decisions`    | `TenantMixin` | id, organization_id, forecast_run_id, department_id, type, priority, status, title, estimated_cost, confidence_score |
| `ActionPlan` | `action_plans` | `TenantMixin` | id, organization_id, name, period (JSONB), status, decisions (JSONB), total_estimated_cost                           |

#### Communication

| Modele         | Table           | Mixin            | Colonnes cles                                                       |
| -------------- | --------------- | ---------------- | ------------------------------------------------------------------- |
| `Conversation` | `conversations` | `TenantMixin`    | id, organization_id, subject, status, initiated_by, last_message_at |
| `Message`      | `messages`      | `TimestampMixin` | id, conversation_id, sender_user_id, sender_role, content, is_read  |

#### Admin

| Modele              | Table                      | Mixin            | Colonnes cles                                                                                                                                        |
| ------------------- | -------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AdminAuditLog`     | `admin_audit_log`          | `TimestampMixin` | id, admin_user_id, target_org_id, action, ip_address, user_agent, metadata_json (JSONB), severity                                                    |
| `PlanChangeHistory` | `plan_change_history`      | `TimestampMixin` | id, organization_id, changed_by, old_plan, new_plan, reason, effective_at                                                                            |
| `OnboardingState`   | `onboarding_states`        | `TimestampMixin` | id, organization_id (UNIQUE), initiated_by, status, current_step, steps_completed (JSONB)                                                            |
| `OnboardingCase`    | `onboarding_cases`         | `TimestampMixin` | id, organization_id, status, phase, activation_mode, environment_target, workflow_provider=`camunda`, process_instance_key, readiness, metadata_json |
| `OnboardingTask`    | `onboarding_case_tasks`    | `TimestampMixin` | id, case_id, task_key, domain, task_type, status, assignee_user_id, sort_order, details_json                                                         |
| `OnboardingBlocker` | `onboarding_case_blockers` | aucun            | id, case_id, blocker_key, domain, severity, status, details_json, opened_at, resolved_at                                                             |
| `OnboardingEvent`   | `onboarding_case_events`   | aucun            | id, case_id, actor_user_id, event_type, message, payload_json, occurred_at                                                                           |

#### Conformite et contact public

| Modele                  | Table                       | Mixin            | Colonnes cles                                                                                                  |
| ----------------------- | --------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `RgpdErasureRequest`    | `rgpd_erasure_requests`     | `TimestampMixin` | id, organization_id, org_slug, initiated_by, approved_by, status, completed_at                                 |
| `RgpdErasureAuditEvent` | `rgpd_erasure_audit_events` | aucun            | id, erasure_request_id, sequence_no, message, created_at                                                       |
| `ContactRequest`        | `contact_requests`          | `TimestampMixin` | id, locale, request_type, company_name, email, subject, status, consent, source_ip_hash, metadata_json (JSONB) |

#### MLOps et lineage

| Modele                   | Table                       | Mixin         | Colonnes cles                                                                                                        |
| ------------------------ | --------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ModelRegistry`          | `model_registry`            | `TenantMixin` | id, organization_id, model_family, version, status, artifact_uri, sha256, metadata_hmac, features_schema_json        |
| `ModelInferenceJob`      | `model_inference_jobs`      | `TenantMixin` | id, organization_id, model_registry_id, status, scope_json, started_at, ended_at, rows_in, rows_out, forecast_run_id |
| `ModelArtifactAccessLog` | `model_artifact_access_log` | `TenantMixin` | id, organization_id, model_registry_id, actor_service, action, request_id, ip_hash, metadata_json                    |
| `DataLineageEvent`       | `data_lineage_events`       | `TenantMixin` | id, organization_id, source_type, source_ref, target_type, target_ref, checksum_sha256, metadata_json                |

#### Autre

| Modele           | Table              | Mixin         | Colonnes cles                                                                                              |
| ---------------- | ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------- |
| `DashboardAlert` | `dashboard_alerts` | `TenantMixin` | id, organization_id, type, severity, title, message, related_entity_type, dismissed_at, expires_at         |
| `Absence`        | `absences`         | `TenantMixin` | id, organization_id, employee_id, type, category, start_date, end_date, status, recurrence_pattern (JSONB) |

## Plateforme d'integration

Le domaine integration merite une lecture specifique, car la cible relationnelle et la persistence runtime actuelle ne sont pas encore pleinement alignees.

### Cible relationnelle versionnee

Le modele Python et la migration `026_integration_platform_foundation.py` versionnent les tables suivantes:

- `integration_connections`
- `integration_sync_runs`
- `integration_sync_state`
- `integration_raw_events`
- `integration_field_mappings`
- `integration_error_events`
- `integration_dead_letter_queue`
- `integration_webhook_receipts`
- `integration_audit_events`

Ces tables racontent une plateforme d'integration relationnelle classique:

- `integration_connections` pour la configuration et l'etat d'une connexion fournisseur;
- `integration_sync_runs` pour la queue et l'execution des synchronisations;
- `integration_sync_state` pour le curseur par `connection + source_object`;
- `integration_raw_events` pour l'append-only Bronze proche du fournisseur;
- `integration_field_mappings` pour la normalisation par objet source;
- `integration_error_events` et `integration_dead_letter_queue` pour les echecs operables;
- `integration_webhook_receipts` pour les receptions push;
- `integration_audit_events` pour les actions humaines et machine.

### Persistence runtime actuelle de `app-connectors`

Le runtime TypeScript `app-connectors` est operable, mais il persiste aujourd'hui son etat principalement dans:

- `connector_runtime_snapshots`
- `connector_secret_records`

Le snapshot JSONB contient notamment:

- `connections`
- `runs`
- `syncStates`
- `rawEvents`
- `ingestCredentials`
- `auditEvents`
- `authorizationSessions`

Les payloads bruts restent stockes a part via le payload store / object store.

### Consequence architecturale

Pour un CTO, il faut donc distinguer explicitement:

- la cible relationnelle `integration_*`, utile pour comprendre le modele durable vise;
- l'etat runtime actuel de `app-connectors`, utile pour comprendre comment le systeme tourne reellement aujourd'hui.

Cette dualite n'est pas cosmetique. Elle impacte:

- la lecture de la source de verite;
- les audits schema-vers-runtime;
- la convergence future entre control plane TypeScript et data-plane Python.

### Flux operable actuel

Le flux runtime connecteurs est le suivant:

1. `app-api-ts` ou `app-admin` cree/teste/configure une connexion via `app-connectors`.
2. `app-connectors` stocke configuration, secrets scelles et etat runtime.
3. un worker Python reclame les `sync_runs`.
4. le runtime renvoie un `execution plan` borne au run claimé.
5. le worker choisit le chemin `provider-events` ou `sftpPull`.
6. les payloads bruts sont stockes, puis ingeres vers datasets et couches medallion.

### Point de vigilance - auth mode `session`

Le runtime `app-connectors` supporte aujourd'hui `session` comme mode d'authentification, notamment pour `Geotab`.

En revanche, l'enum relationnel `integrationauthmode` defini par Alembic ne couvre aujourd'hui que:

- `oauth2`
- `api_key`
- `service_account`
- `sftp`

Si la convergence vers `integration_connections` devient prioritaire, cet ecart devra etre traite explicitement.

### Lecture recommandee

Pour ce domaine, lire dans cet ordre:

1. `docs/cto/07-connecteurs-et-sync-runs.md`
2. `app-connectors/README.md`
3. `app-connectors/src/README.md`
4. `app-api/app/models/integration.py`
5. `app-api/alembic/versions/026_integration_platform_foundation.py`

## Reference des enums

Tous les enums PostgreSQL stockent la valeur `.value` (lowercase) grace au helper `sa_enum()`.

| Enum Python             | Valeurs PostgreSQL                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UserRole`              | `super_admin`, `org_admin`, `hr_manager`, `manager`, `employee`, `viewer`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `UserStatus`            | `active`, `inactive`, `pending`, `suspended`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `OrganizationStatus`    | `active`, `suspended`, `trial`, `churned`                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `SubscriptionPlan`      | `free`, `starter`, `professional`, `enterprise`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `IndustrySector`        | `healthcare`, `retail`, `manufacturing`, `services`, `technology`, `finance`, `education`, `public_sector`, `hospitality`, `logistics`, `other`                                                                                                                                                                                                                                                                                                                                                                 |
| `OrganizationSize`      | `small`, `medium`, `large`, `enterprise`                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `EmploymentType`        | `full_time`, `part_time`, `contractor`, `intern`, `temporary`                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `ContractType`          | `cdi`, `cdd`, `interim`, `apprenticeship`, `internship`, `other`                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `EmployeeStatus`        | `active`, `on_leave`, `terminated`, `pending`                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `AbsenceType`           | `paid_leave`, `rtt`, `sick_leave`, `sick_leave_workplace`, `maternity`, `paternity`, `parental`, `bereavement`, `wedding`, `moving`, `unpaid_leave`, `training`, `remote_work`, `other`                                                                                                                                                                                                                                                                                                                         |
| `AbsenceCategory`       | `planned`, `unplanned`, `statutory`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `AbsenceStatus`         | `draft`, `pending`, `approved`, `rejected`, `cancelled`, `completed`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `DayPortion`            | `full`, `morning`, `afternoon`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `ForecastModelType`     | `arima`, `prophet`, `random_forest`, `xgboost`, `ensemble`                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ForecastStatus`        | `pending`, `running`, `completed`, `failed`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ForecastDimension`     | `human`, `merchandise`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `DecisionType`          | `replacement`, `redistribution`, `postponement`, `overtime`, `external`, `training`, `no_action`                                                                                                                                                                                                                                                                                                                                                                                                                |
| `DecisionStatus`        | `suggested`, `pending_review`, `approved`, `rejected`, `implemented`, `expired`                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `DecisionPriority`      | `low`, `medium`, `high`, `critical`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `ActionPlanStatus`      | `draft`, `active`, `completed`, `archived`                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `DatasetStatus`         | `pending`, `active`, `migrating`, `archived`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `IngestionMode`         | `incremental`, `full_refit`, `file_upload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `RunStatus`             | `running`, `success`, `failed`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `ColumnDtype`           | `float`, `integer`, `date`, `category`, `boolean`, `text`                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ColumnRole`            | `target`, `feature`, `temporal_index`, `group_by`, `id`, `meta`                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ShiftType`             | `am`, `pm`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `Horizon`               | `j3`, `j7`, `j14`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `ScenarioOptionType`    | `hs`, `interim`, `realloc_intra`, `realloc_inter`, `service_adjust`, `outsource`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `CoverageAlertSeverity` | `low`, `medium`, `high`, `critical`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `CoverageAlertStatus`   | `open`, `acknowledged`, `resolved`, `expired`                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `AlertType`             | `risk`, `decision`, `forecast`, `absence`, `system`                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `AlertSeverity`         | `info`, `warning`, `error`, `critical`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `RelatedEntityType`     | `absence`, `decision`, `forecast`, `employee`, `department`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `AdminAuditAction`      | `view_org`, `update_org`, `create_org`, `suspend_org`, `reactivate_org`, `churn_org`, `view_users`, `invite_user`, `change_role`, `deactivate_user`, `reactivate_user`, `view_datasets`, `view_data`, `change_plan`, `view_monitoring`, `view_mirror`, `view_features`, `onboarding_step`, `view_canonical`, `view_cost_params`, `view_coverage_alerts`, `view_proof_packs`, `view_inbox`, `view_site_detail`, `send_message`, `resolve_conversation`, `erasure_initiate`, `erasure_approve`, `erasure_execute` |
| `OnboardingStatus`      | `in_progress`, `completed`, `abandoned`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ConversationStatus`    | `open`, `resolved`, `archived`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `ConversationInitiator` | `client`, `admin`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Reference des mixins

```python
# app-api/app/models/base.py

class Base(DeclarativeBase):
    """Base declarative pour tous les modeles."""

class TimestampMixin:
    """created_at (server_default=now()), updated_at (onupdate)."""
    created_at: Mapped[datetime]  # server_default=text("now()")
    updated_at: Mapped[datetime]  # server_default=text("now()"), onupdate=lambda

class TenantMixin(TimestampMixin):
    """organization_id (UUID, NOT NULL, indexed) + timestamps."""
    organization_id: Mapped[uuid.UUID]  # indexed, NOT nullable
```

| Mixin            | Utilise par                                                                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TimestampMixin` | Organization, DatasetColumn, IngestionLog, QualityReport, AdminAuditLog, PlanChangeHistory, OnboardingState, Message                                                                                                                      |
| `TenantMixin`    | Site, Department, User, Employee, Absence, ForecastRun, DailyForecast, Decision, ActionPlan, DashboardAlert, ClientDataset, CanonicalRecord, CostParameter, CoverageAlert, ScenarioOption, OperationalDecision, ProofRecord, Conversation |
| Aucun            | Base, FitParameter (created_at only), PipelineConfigHistory (created_at only)                                                                                                                                                             |

## Historique des migrations

| #   | Fichier                                  | Description                                                                                                                                |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 001 | `001_initial_schema.py`                  | Schema initial : organizations, sites, departments, users, employees, absences, forecast_runs, decisions, action_plans, dashboard_alerts   |
| 002 | `002_pgcrypto_extension.py`              | Extension `pgcrypto` pour `gen_random_uuid()`                                                                                              |
| 003 | `003_data_catalog_enums.py`              | Enums PostgreSQL pour le data catalog (DatasetStatus, IngestionMode, RunStatus, ColumnDtype, ColumnRole)                                   |
| 004 | `004_data_catalog_tables.py`             | Tables data catalog : client_datasets, dataset_columns, fit_parameters, ingestion_log, pipeline_config_history                             |
| 005 | `005_fit_parameters_immutability.py`     | Trigger d'immutabilite sur fit_parameters (INSERT-only)                                                                                    |
| 006 | `006_role_architecture.py`               | Extension du systeme de roles (UserRole enum etendu)                                                                                       |
| 007 | `007_rls_policies.py`                    | Politiques Row-Level Security initiales                                                                                                    |
| 008 | `008_file_upload_ingestion.py`           | Champs file_name, file_size sur ingestion_log + table quality_reports                                                                      |
| 009 | `009_quality_report.py`                  | Extension quality_reports (column_details, strategy_config)                                                                                |
| 010 | `010_admin_backoffice.py`                | Tables admin : admin_audit_log, plan_change_history, onboarding_states                                                                     |
| 011 | `011_features_access_control.py`         | Controle d'acces aux features par organisation                                                                                             |
| 012 | `012_operational_layer.py`               | Tables operationnelles : canonical_records, cost_parameters, coverage_alerts, scenario_options, operational_decisions, proof_records       |
| 013 | `013_rls_hardening.py`                   | Renforcement des politiques RLS (defense en profondeur)                                                                                    |
| 014 | `014_merge_schemas.py`                   | Fusion des schemas platform/public                                                                                                         |
| 015 | `015_add_user_site_id.py`                | Ajout site_id sur users pour filtrage par site                                                                                             |
| 016 | `016_decision_engine_v2_fields.py`       | Champs supplementaires pour le moteur de decision v2                                                                                       |
| 017 | `017_conversations.py`                   | Tables messagerie : conversations, messages                                                                                                |
| 018 | `018_daily_forecast_capacity_curves.py`  | Champs capacity curves sur daily_forecasts (capacity_planned_current, capacity_planned_predicted, capacity_optimal_predicted)              |
| 019 | `019_remove_orphan_models.py`            | Retire les tables legacy `employees`, `absences` et `action_plans`; point de vigilance pour les docs et modeles qui les mentionnent encore |
| 027 | `027_decisionops_runtime_persistence.py` | Persistance DecisionOps read-model : decision_approvals, action_dispatches, decision_ledger_entries + RLS                                  |
| 028 | `028_onboarding_bpm_foundation.py`       | Fondations persistantes du control plane onboarding BPM : cases, tasks, blockers, events + RLS direct/indirect                             |
| 029 | `029_onboarding_camunda_only.py`         | Verrouille `onboarding_cases.workflow_provider` sur `camunda` et migre les anciennes lignes `local_projection`                             |

## Politiques RLS

Row-Level Security agit comme **filet de securite** en complement du TenantFilter applicatif.

### Mecanisme

1. La dependency `get_current_user()` appelle `set_rls_org_id(org_id)` qui ecrit dans un `ContextVar`
2. La dependency `get_db_session()` lit le `ContextVar` et execute `SET LOCAL app.current_organization_id = :org_id`
3. `SET LOCAL` est scope a la transaction courante -- il se reset automatiquement au `COMMIT`/`ROLLBACK`
4. Les politiques RLS verifient `current_setting('app.current_organization_id')` sur chaque operation

```python
# app-api/app/core/database.py — propagation ContextVar → SET LOCAL
_current_org_id: ContextVar[str | None] = ContextVar("_current_org_id", default=None)

# Validation UUID stricte avant envoi au DB (defense en profondeur)
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

def set_rls_org_id(org_id: str | None) -> None:
    if org_id is not None and not _UUID_RE.match(org_id):
        raise ValueError("set_rls_org_id: org_id must be a valid UUID")
    _current_org_id.set(org_id)
```

### Securite du mecanisme

- Le `ContextVar` est **async-safe** : chaque asyncio task (= chaque requete) a sa propre copie
- L'`org_id` est valide comme UUID strict **deux fois** : a la verification JWT et avant le `SET LOCAL`
- `SET LOCAL` est transaction-scoped, impossible de fuiter vers une autre requete
- Pour les admins cross-tenant, `get_admin_tenant_filter` override le `ContextVar` vers l'organisation cible

## Configuration connexion

### Docker Compose (developpement)

```yaml
# infra/docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5433:5432" # Port 5433 externe pour eviter conflits
    environment:
      POSTGRES_USER: praedixa
      POSTGRES_PASSWORD: praedixa_local_dev_pg_2026
      POSTGRES_DB: praedixa
```

### Connection string

```
# Developpement
DATABASE_URL=postgresql+asyncpg://praedixa:praedixa_local_dev_pg_2026@localhost:5433/praedixa

# Production (Scaleway Managed PostgreSQL)
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/praedixa?sslmode=require
```

### Pool de connexions

```python
# app-api/app/core/database.py
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,        # Log SQL en dev uniquement
    pool_size=5,                # Connexions permanentes
    max_overflow=10,            # Connexions temporaires supplementaires
    pool_pre_ping=True,         # Validation avant usage (evite connexions mortes)
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,     # Evite les lazy-loads apres commit
)
```

## Operations courantes

### Creer une migration

```bash
cd app-api
uv run alembic revision --autogenerate -m "description_de_la_migration"
```

Verifier le fichier genere dans `app-api/alembic/versions/` avant d'appliquer.

### Appliquer les migrations

```bash
cd app-api && uv run alembic upgrade head    # Toutes les migrations
cd app-api && uv run alembic upgrade +1      # Une migration
```

### Rollback

```bash
cd app-api && uv run alembic downgrade -1    # Une migration en arriere
cd app-api && uv run alembic downgrade base  # Tout annuler (attention !)
```

### Scripts de seed

```bash
cd app-api
uv run python -m scripts.seed_full_demo --org-id <uuid>  # Seed demo complet (bootstrap + artefacts operationnels)
```

Le bootstrap persistant minimal d'une organisation est porte par `app/services/organization_foundation.py`.

En mode `DEBUG=true`, l'API execute automatiquement `seed_full_demo` au demarrage (`_auto_seed_dev` dans `app/main.py`).

### Gotchas

**`sa_enum()` et les valeurs PostgreSQL** : SQLAlchemy envoie par defaut le `.name` (UPPERCASE), mais PostgreSQL attend le `.value` (lowercase). Le helper `sa_enum()` dans `app/models/base.py` corrige ce comportement :

```python
def sa_enum(enum_cls: type[_E]) -> SAEnum:
    return SAEnum(
        enum_cls,
        values_callable=lambda x: [e.value for e in x],
        native_enum=True,
        create_constraint=False,
        create_type=False,  # Le type est cree par la migration Alembic
    )
```

**`PG_ENUM` dans les migrations** : `sa.Enum(create_type=False)` est silencieusement ignore par certaines versions d'Alembic. Utiliser explicitement `PG_ENUM(name=..., create_type=False)` depuis `sqlalchemy.dialects.postgresql` et creer les enums via raw SQL avec `EXCEPTION WHEN duplicate_object`.

**`default=uuid.uuid4` et les tests** : l'UUID n'est pas genere a l'instanciation du modele, mais seulement apres `INSERT RETURNING`. Dans les tests unitaires, mocker `session.flush` pour assigner un UUID manuellement.

**`expire_on_commit=False`** : necessaire pour eviter les lazy-loads accidentels apres le commit de la session. Sans cette option, acceder a un attribut apres commit declencherait une nouvelle requete SQL (ou une erreur si la session est fermee).

---

_Voir aussi_ : [ARCHITECTURE.md](ARCHITECTURE.md) pour l'architecture globale, [docs/security/](security/) pour les politiques de securite.
