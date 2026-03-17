# @praedixa/shared-types

Definitions de types TypeScript partages entre les apps Praedixa et le runtime `app-api-ts`. Zero dependance runtime en dehors de `zod` (validation optionnelle). Ce package garantit un contrat type unique entre le contrat OpenAPI public versionne, le runtime Node/TypeScript et les clients.

## Table des matieres

- [Installation et build](#installation-et-build)
- [Inventaire des modules](#inventaire-des-modules)
  - [Domaine](#domaine)
  - [API](#api)
  - [Utilitaires](#utilitaires)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Conventions](#conventions)
- [Tests](#tests)

---

## Installation et build

Package interne au monorepo (`"private": true`). Les apps et `@praedixa/ui` l'importent via :

```typescript
import type {
  Organization,
  CoverageAlert,
  ApiResponse,
} from "@praedixa/shared-types";
```

Des sous-chemins d'import sont disponibles pour limiter le scope :

```typescript
import type { ApiResponse } from "@praedixa/shared-types/api";
import type { Organization } from "@praedixa/shared-types/domain";
```

**Ordre de build** : `shared-types` est le premier package builde. Toutes les autres cibles en dependent. Le build utilise `tsc --build --force` pour regenerer `dist/` proprement a chaque passe critique.

Les points d'entree runtime du package (`.`, `./api`, `./api-client`, `./domain`, `./public-contract-node`) sortent en ESM interne. Les imports/exports relatifs des fichiers qui emettent du JavaScript doivent donc garder des suffixes `.js` dans `src/`, sinon un builder propre peut produire un `dist/` present mais non resolvable.

```bash
# Build
pnpm --filter @praedixa/shared-types build

# Watch mode
pnpm --filter @praedixa/shared-types dev
```

**Dependance runtime** : `zod ^3.24.0` (schemas de validation).
**Aucune peer dependency** -- ce package est purement typographique + validation.

---

## Inventaire des modules

### Domaine

13 modules dans `src/domain/`, chacun exportant les types metier d'un domaine fonctionnel.

#### `organization.ts` -- Organisation et sites

| Type                   | Description                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| `Organization`         | Entite organisation complete (nom, slug, SIRET, plan, config jours ouvres)   |
| `OrganizationSettings` | Preferences : types d'absence actives, approbation, seuils d'alerte, SSO     |
| `AlertThresholds`      | Seuils de declenchement d'alertes (sous-effectif, taux d'absence, precision) |
| `Department`           | Service/equipe avec headcount, centre de cout, niveau de staffing minimal    |
| `Site`                 | Site physique avec adresse, timezone, config jours ouvres locale             |
| `Address`              | Adresse postale structuree                                                   |
| `OrganizationSummary`  | Vue allegee pour les listes                                                  |
| `OrganizationStatus`   | `"active" \| "suspended" \| "trial" \| "churned"`                            |
| `SubscriptionPlan`     | `"free" \| "starter" \| "professional" \| "enterprise"`                      |
| `IndustrySector`       | 11 secteurs (healthcare, retail, logistics, etc.)                            |

#### `user.ts` -- Utilisateurs et employes

| Type              | Description                                                                           |
| ----------------- | ------------------------------------------------------------------------------------- |
| `User`            | Compte utilisateur (email, role, MFA, dernier login)                                  |
| `Employee`        | Donnees RH : matricule, poste, contrat, FTE, competences, cout journalier             |
| `EmployeeSummary` | Vue allegee pour les listes                                                           |
| `TeamMember`      | Extension de `EmployeeSummary` avec absence en cours et compteur                      |
| `AbsenceBalance`  | Solde de conges par type (CP, RTT, maladie)                                           |
| `Permission`      | Triplet resource/action/scope pour le RBAC                                            |
| `RolePermissions` | Association role -> liste de permissions                                              |
| `UserRole`        | `"super_admin" \| "org_admin" \| "hr_manager" \| "manager" \| "employee" \| "viewer"` |
| `UserStatus`      | `"active" \| "inactive" \| "pending" \| "suspended"`                                  |
| `EmploymentType`  | `"full_time" \| "part_time" \| "contractor" \| "intern" \| "temporary"`               |
| `ContractType`    | `"cdi" \| "cdd" \| "interim" \| "apprenticeship" \| "internship" \| "other"`          |

#### `absence.ts` -- Absences

| Type                   | Description                                                                      |
| ---------------------- | -------------------------------------------------------------------------------- |
| `Absence`              | Entite absence complete avec workflow de validation                              |
| `AbsenceRequest`       | Payload de creation/modification                                                 |
| `AbsenceSummary`       | Vue allegee pour les listes                                                      |
| `AbsenceWithEmployee`  | Absence enrichie avec details employe (vue manager)                              |
| `DailyAbsenceSummary`  | Resume journalier (vue calendrier)                                               |
| `AbsenceStatistics`    | Statistiques d'absences sur une periode                                          |
| `AbsenceCalendarEvent` | Evenement calendrier UI                                                          |
| `AbsenceConflict`      | Detection de chevauchement entre absences                                        |
| `RecurrencePattern`    | Pattern de recurrence (daily/weekly/monthly)                                     |
| `AbsenceType`          | 14 types (paid_leave, rtt, sick_leave, maternity, training, etc.)                |
| `AbsenceStatus`        | `"draft" \| "pending" \| "approved" \| "rejected" \| "cancelled" \| "completed"` |
| `AbsenceCategory`      | `"planned" \| "unplanned" \| "statutory"`                                        |

#### `forecast.ts` -- Previsions ML

| Type                              | Description                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `ForecastRun`                     | Execution d'un modele de prevision (statut, horizon, metriques)              |
| `ForecastMetrics`                 | Metriques de precision (MAE, MAPE, RMSE, R2, taux de couverture)             |
| `DailyForecast`                   | Prediction journaliere avec intervalle de confiance et indicateurs de risque |
| `RiskIndicators`                  | Risque de sous-effectif, impact operationnel, roles critiques a risque       |
| `ForecastSummary`                 | Resume sur une periode (taux moyen, pic, jours a haut risque)                |
| `ForecastAccuracy`                | Comparaison prevu vs reel                                                    |
| `BacktestResults`                 | Resultats de backtesting                                                     |
| `ModelExplanation`                | Explicabilite du modele (feature importance, saisonnalite)                   |
| `WhatIfScenario` / `WhatIfResult` | Scenarios hypothetiques et leur impact                                       |
| `ForecastModelType`               | `"arima" \| "prophet" \| "random_forest" \| "xgboost" \| "ensemble"`         |
| `ForecastStatus`                  | `"pending" \| "running" \| "completed" \| "failed"`                          |

#### `decision.ts` -- Decisions et arbitrages

| Type                                  | Description                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Decision`                            | Recommandation IA avec cout estime, ROI, score de confiance                                                    |
| `DecisionOutcome`                     | Resultat apres mise en oeuvre                                                                                  |
| `DecisionSummary`                     | Vue allegee pour les listes                                                                                    |
| `ReplacementRecommendation`           | Recommandation de remplacement pour un absent                                                                  |
| `ReplacementCandidate`                | Candidat avec score de correspondance, competences, disponibilite                                              |
| `CostImpactAnalysis`                  | Analyse couts directs + indirects                                                                              |
| `ActionPlan`                          | Plan d'action groupant plusieurs decisions                                                                     |
| `ArbitrageOption` / `ArbitrageResult` | Options d'arbitrage avec frontiere cout/service                                                                |
| `DashboardAlert`                      | Alerte du tableau de bord (risque, decision, prevision, systeme)                                               |
| `DecisionType`                        | `"replacement" \| "redistribution" \| "postponement" \| "overtime" \| "external" \| "training" \| "no_action"` |
| `DecisionStatus`                      | `"suggested" \| "pending_review" \| "approved" \| "rejected" \| "implemented" \| "expired"`                    |

#### `dataset.ts` -- Fondation de donnees

| Type                    | Description                                                                 |
| ----------------------- | --------------------------------------------------------------------------- |
| `ClientDataset`         | Dataset client avec schemas raw/transformed, config pipeline                |
| `DatasetColumn`         | Metadonnees de colonne (dtype, role semantique, position)                   |
| `FitParameters`         | Parametres de transformation ajustes (normalisation, etc.) avec hash HMAC   |
| `IngestionLogEntry`     | Journal d'ingestion (lignes recues/transformees, statut)                    |
| `PipelineConfigHistory` | Historique des configs pipeline (audit RGPD Article 30)                     |
| `DatasetSummary`        | Vue allegee pour les listes                                                 |
| `ColumnDtype`           | `"float" \| "integer" \| "date" \| "category" \| "boolean" \| "text"`       |
| `ColumnRole`            | `"target" \| "feature" \| "temporal_index" \| "group_by" \| "id" \| "meta"` |

#### `canonical.ts` -- Donnees canoniques operationnelles

| Type                        | Description                                                                    |
| --------------------------- | ------------------------------------------------------------------------------ |
| `CanonicalRecord`           | Ligne site x date x shift avec charge, capacite, absences, heures sup, interim |
| `CanonicalDataSummary`      | Resume haut niveau (couverture, nb sites, plage de dates)                      |
| `CanonicalQualityDashboard` | Vue qualite des donnees canoniques                                             |
| `ShiftType`                 | `"am" \| "pm"`                                                                 |

#### `coverage-alert.ts` -- Alertes de couverture

| Type                    | Description                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| `CoverageAlert`         | Alerte de risque de rupture avec probabilite, ecart en heures, impact financier |
| `HeatmapCell`           | Cellule pour la heatmap de couverture                                           |
| `CoverageHeatmapData`   | Payload complet de la heatmap                                                   |
| `AlertHorizon`          | `"j3" \| "j7" \| "j14"`                                                         |
| `CoverageAlertSeverity` | `"low" \| "medium" \| "high" \| "critical"`                                     |
| `CoverageAlertStatus`   | `"open" \| "acknowledged" \| "resolved" \| "expired"`                           |

#### `scenario.ts` -- Scenarios et frontiere de Pareto

| Type                     | Description                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `ScenarioOption`         | Option de remediation avec cout, service attendu, score de faisabilite                       |
| `ParetoPoint`            | Point leger pour le rendu du ParetoChart                                                     |
| `ParetoFrontierResponse` | Reponse API avec toutes les options et la frontiere                                          |
| `ScenarioOptionType`     | `"hs" \| "interim" \| "realloc_intra" \| "realloc_inter" \| "service_adjust" \| "outsource"` |

#### `operational-decision.ts` -- Decisions operationnelles

| Type                  | Description                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| `OperationalDecision` | Decision d'un manager sur une alerte (option choisie, override, cout observe) |
| `OverrideStatistics`  | Statistiques d'overrides (taux, raisons principales, delta cout moyen)        |

#### `cost-parameter.ts` -- Parametres de couts

| Type                   | Description                                                                      |
| ---------------------- | -------------------------------------------------------------------------------- |
| `CostParameter`        | Jeu de parametres de cout versionne (cout interne, majorations, caps, lead time) |
| `ShiftConfig`          | Configuration d'un shift (horaires, label)                                       |
| `AlertThresholdConfig` | Seuils de severite des alertes                                                   |
| `SiteConfig`           | Configuration d'un site (capacite de base, shifts)                               |

#### `report.ts` -- Rapports et proof packs

| Type                    | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `WeeklySummary`         | Resume operationnel hebdomadaire                     |
| `ForecastAccuracyPoint` | Point prevu vs reel pour les graphiques de precision |
| `CostAnalysis`          | Analyse de couts (BAU vs 100% vs reel, gain net)     |
| `WaterfallComponent`    | Barre du waterfall chart (label, valeur, type)       |
| `ProofPack`             | Pack de preuve de valeur mensuel par site            |
| `ProofPackSummary`      | Agregation multi-sites des proof packs               |

#### `dashboard.ts` -- Tableau de bord

| Type               | Description                                                                    |
| ------------------ | ------------------------------------------------------------------------------ |
| `DashboardSummary` | KPIs du dashboard (couverture humaine/marchandise, alertes actives, precision) |

---

### API

Les modules `src/api/` couvrent a la fois le contrat public versionne et les contrats DecisionOps/admin internes reutilises entre `app-admin` et `app-api-ts`.

Le catalogue versionne des operations publiques non-admin vit dans `src/api/public-contract.ts`. Il decrit pour chaque `operationId` le `method`, le `path`, l'enveloppe de reponse et le type partage attendu, afin de garder une source de verite explicite entre `contracts/openapi/public.yaml` et les consumers TypeScript.
Les payloads write publics nommes vivent dans `src/api/requests.ts` et sont references directement par les composants schemas OpenAPI, ce qui evite les `object` generiques permissifs.
Les contrats DecisionOps/admin internes typent aussi les surfaces persistantes non-publiques, par exemple `src/api/approval-inbox.ts`, `src/api/action-dispatch-detail.ts`, `src/api/action-dispatch-fallback.ts`, `src/api/ledger-detail.ts`, `src/api/approval-decision.ts` et `src/api/decision-contract-studio.ts` pour le Contract Studio runtime.
Le helper Node `@praedixa/shared-types/public-contract-node` sert uniquement aux tests et audits de contrat; il parse `contracts/openapi/public.yaml` de maniere structurelle sans tirer `fs` ou `yaml` dans les exports browser du package.

#### `responses.ts` -- Enveloppes de reponse

| Type                                | Description                                                              |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `ApiResponse<T>`                    | Enveloppe generique `{ success, data, message?, timestamp, requestId? }` |
| `PaginatedResponse<T>`              | Extension de `ApiResponse<T[]>` avec `pagination: PaginationMeta`        |
| `ErrorResponse`                     | `{ success: false, error: ApiError, timestamp }`                         |
| `ApiError`                          | `{ code, message, details?, validationErrors?, stack? }`                 |
| `ValidationError`                   | Detail d'erreur de validation `{ field, message, code, value? }`         |
| `EmptyResponse`                     | Reponse sans donnees `{ success: true }`                                 |
| `CreatedResponse<T>`                | Reponse de creation avec `id` et `location?`                             |
| `BulkOperationResponse<T>`          | Resultat d'operation bulk (succeeded/failed/summary)                     |
| `HealthCheckResponse`               | Reponse du endpoint `/health`                                            |
| `AuthResponse`                      | Reponse d'authentification (tokens + profil utilisateur)                 |
| `ExportResponse` / `ImportResponse` | Statut des operations export/import                                      |
| `WebhookEvent<T>` / `SSEMessage<T>` | Evenements webhook et Server-Sent Events                                 |
| `DatasetDetailResponse`             | Detail d'un dataset avec colonnes                                        |
| `DatasetDataPreviewResponse`        | Apercu des donnees avec masquage PII                                     |
| `IngestionHistoryResponse`          | Historique des ingestions                                                |

#### `requests.ts` -- Payloads de requete

| Categorie       | Types                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Absences        | `ListAbsencesRequest`, `CreateAbsenceRequest`, `UpdateAbsenceRequest`, `AbsenceDecisionRequest`, `BulkAbsenceImportRequest`                                                             |
| Employes        | `ListEmployeesRequest`, `CreateEmployeeRequest`, `UpdateEmployeeRequest`                                                                                                                |
| Utilisateurs    | `CreateUserRequest`, `UpdateUserRequest`, `LoginRequest`, `RegisterRequest`                                                                                                             |
| Previsions      | `RequestForecastRequest`, `ListForecastsRequest`, `WhatIfScenarioRequest`                                                                                                               |
| Decisions       | `ListDecisionsRequest`, `ReviewDecisionRequest`, `ValidateArbitrageRequest`, `RecordDecisionOutcomeRequest`                                                                             |
| DecisionOps     | `ActionDispatchDecisionRequest`, `ActionDispatchDecisionResponse`, `ActionDispatchFallbackRequest`, `ActionDispatchFallbackResponse`, `LedgerDecisionRequest`, `LedgerDecisionResponse` |
| Organisation    | `UpdateOrganizationSettingsRequest`, `UpdateWorkingDaysConfigRequest`                                                                                                                   |
| Datasets        | `ListDatasetsRequest`, `GetDatasetDataRequest`                                                                                                                                          |
| Export/Import   | `ExportRequest`, `ImportRequest`                                                                                                                                                        |
| Filtres communs | `BaseFilterParams`, `DateRangeFilter`                                                                                                                                                   |

#### `errors.ts` -- Codes d'erreur standardises

Enum `ErrorCode` avec 40 codes organises par categorie :

| Prefixe | Categorie         | Exemples                                                    |
| ------- | ----------------- | ----------------------------------------------------------- |
| `AUTH_` | Authentification  | `UNAUTHORIZED`, `TOKEN_EXPIRED`, `ACCOUNT_LOCKED`           |
| `VAL_`  | Validation        | `VALIDATION_ERROR`, `INVALID_DATE_RANGE`, `DUPLICATE_ENTRY` |
| `RES_`  | Ressources        | `NOT_FOUND`, `CONFLICT`, `LOCKED`                           |
| `BIZ_`  | Logique metier    | `ABSENCE_OVERLAP`, `INSUFFICIENT_BALANCE`, `QUOTA_EXCEEDED` |
| `TEN_`  | Tenant            | `TENANT_SUSPENDED`, `CROSS_TENANT_ACCESS`                   |
| `EXT_`  | Services externes | `EXTERNAL_SERVICE_TIMEOUT`                                  |
| `ML_`   | Previsions        | `FORECAST_FAILED`, `INSUFFICIENT_DATA`                      |
| `SYS_`  | Systeme           | `RATE_LIMITED`, `MAINTENANCE_MODE`, `DATABASE_ERROR`        |

Fonctions utilitaires exportees : `isErrorCode()`, `getHttpStatus()`, `getErrorMessage()`.

Mapping `ErrorHttpStatus` (code -> status HTTP) et `ErrorMessages` (code -> message par defaut) egalement exportes.

---

### Utilitaires

2 modules dans `src/utils/`.

#### `common.ts` -- Types de base

| Type                   | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| `UUID`                 | Alias pour `string` (identifiant unique)                              |
| `ISODateString`        | Alias pour `string` (date ISO 8601 `"YYYY-MM-DD"`)                    |
| `ISODateTimeString`    | Alias pour `string` (datetime ISO 8601)                               |
| `Environment`          | `"development" \| "staging" \| "production"`                          |
| `PaginationParams`     | `{ page, pageSize, sortBy?, sortOrder? }`                             |
| `PaginationMeta`       | `{ total, page, pageSize, totalPages, hasNextPage, hasPreviousPage }` |
| `AuditFields`          | `{ createdAt, updatedAt, createdBy?, updatedBy? }`                    |
| `SoftDeleteFields`     | `{ deletedAt?, deletedBy?, isDeleted }`                               |
| `BaseEntity`           | `AuditFields & { id: UUID }` -- base de toute entite                  |
| `TenantEntity`         | `BaseEntity & { organizationId: UUID }` -- base multi-tenant          |
| `DeepPartial<T>`       | Rend toutes les proprietes optionnelles recursivement                 |
| `RequireFields<T, K>`  | Rend certaines proprietes obligatoires                                |
| `StrictOmit<T, K>`     | `Omit` avec contrainte stricte sur les cles                           |
| `NonNullableFields<T>` | Retire `null                                                          | undefined` de toutes les proprietes |

#### `dates.ts` -- Types temporels

| Type                | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| `DateRange`         | `{ startDate, endDate }`                                            |
| `PartialDateRange`  | `DateRange` avec bornes optionnelles                                |
| `Duration`          | `{ days, workingDays, calendarDays, hours? }`                       |
| `WorkingDaysConfig` | Jours ouvres + jours feries + fermetures entreprise                 |
| `TimeGranularity`   | `"day" \| "week" \| "month" \| "quarter" \| "year"`                 |
| `CalendarPeriod`    | Identifiant de periode calendaire (annee, mois, trimestre, semaine) |
| `TimeSlot`          | Creneau horaire `{ startTime, endTime }` format `"HH:mm"`           |
| `DayPortion`        | `"full" \| "morning" \| "afternoon"`                                |
| `DayOfWeek`         | `1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7` (ISO 8601 : 1 = lundi)            |
| `Month`             | `1..12`                                                             |
| `Quarter`           | `1..4`                                                              |

---

## Exemples d'utilisation

### Typer une reponse API dans le webapp

```typescript
import type { ApiResponse, CoverageAlert } from "@praedixa/shared-types";

const response: ApiResponse<CoverageAlert[]> = await apiGet(
  "/api/v1/coverage-alerts",
);
const alerts = response.data;
```

### Typer un formulaire de creation d'absence

```typescript
import type { CreateAbsenceRequest } from "@praedixa/shared-types";

const payload: CreateAbsenceRequest = {
  employeeId: "550e8400-e29b-41d4-a716-446655440000",
  type: "paid_leave",
  startDate: "2026-03-01",
  endDate: "2026-03-05",
  submitForApproval: true,
};
```

### Utiliser les codes d'erreur pour le traitement conditionnel

```typescript
import { ErrorCode, isErrorCode } from "@praedixa/shared-types";

if (isErrorCode(error.code) && error.code === ErrorCode.ABSENCE_OVERLAP) {
  showWarning("Cette absence chevauche une absence existante.");
}
```

### Typer un composant admin avec DashboardSummary

```typescript
import type { DashboardSummary } from "@praedixa/shared-types";

function DashboardKPIs({ summary }: { summary: DashboardSummary }) {
  return (
    <StatCard
      value={String(summary.coverageHuman)}
      label="Couverture humaine"
      variant={summary.coverageHuman > 90 ? "success" : "warning"}
    />
  );
}
```

---

## Conventions

### Proprietes en camelCase

Toutes les interfaces utilisent le camelCase pour correspondre a la sortie de l'API FastAPI. Le backend utilise `CamelModel` (alias generator `to_camel`) qui transforme automatiquement le snake_case Python en camelCase JSON.

```
Python: organization_id  -->  JSON: organizationId  -->  TypeScript: organizationId
```

### Nommage des interfaces

| Convention                  | Exemple                                         |
| --------------------------- | ----------------------------------------------- |
| Entite complete             | `Organization`, `Employee`, `CoverageAlert`     |
| Vue allegee pour les listes | `OrganizationSummary`, `DecisionSummary`        |
| Payload de creation         | `CreateAbsenceRequest`, `CreateEmployeeRequest` |
| Payload de modification     | `UpdateAbsenceRequest`, `UpdateUserRequest`     |
| Reponse API                 | `ApiResponse<T>`, `PaginatedResponse<T>`        |
| Filtre de liste             | `ListAbsencesRequest`, `ListEmployeesRequest`   |

### Union types pour les enums

Les enums du domaine sont exprimes en union types TypeScript (pas en `enum`). Exception : `ErrorCode` qui est un `enum` avec valeurs string pour permettre la correspondance directe avec les codes API.

```typescript
// Union type (domaine) -- preferer cette forme
export type AbsenceStatus = "draft" | "pending" | "approved" | "rejected";

// Enum (API errors uniquement)
export enum ErrorCode {
  UNAUTHORIZED = "AUTH_001",
  // ...
}
```

### Heritage des entites

Toutes les entites metier heritent de `BaseEntity` (avec `id`, `createdAt`, `updatedAt`) ou de `TenantEntity` (ajoute `organizationId`) pour les donnees multi-tenant.

```
AuditFields
  └── BaseEntity          (+ id)
        └── TenantEntity  (+ organizationId)
```

---

## Tests

Les tests sont ecrits avec Vitest et situes dans `src/__tests__/`.

```bash
pnpm --filter @praedixa/shared-types test
pnpm --filter @praedixa/shared-types test:watch
```

Les tests verifient que les exports runtime (`ErrorCode`, `ErrorHttpStatus`, fonctions utilitaires) fonctionnent correctement. Les types purement declaratifs (`interface`, `type`) sont valides par le compilateur TypeScript lors du build.
