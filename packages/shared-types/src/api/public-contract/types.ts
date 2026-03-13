import type {
  ContactRequestSubmission,
  ConversationCreateRequest,
  ExportRequest,
  MessageCreateRequest,
  OperationalDecisionCreateRequest,
  ProofPackGenerateRequest,
  RecordDecisionOutcomeRequest,
  RequestForecastRequest,
  ReviewDecisionRequest,
  ScenarioGenerationRequest,
  ValidateArbitrageRequest,
  WhatIfScenarioRequest,
} from "../requests.js";
import type {
  DatasetDataPreviewResponse,
  DatasetDetailResponse,
  IngestionHistoryResponse,
} from "../responses.js";
import type { CanonicalQualityDashboard } from "../../domain/canonical.js";
import type { DashboardSummary } from "../../domain/dashboard.js";
import type {
  DecisionHorizonConfig,
  ResolvedDecisionEngineConfig,
} from "../../domain/decision-config.js";
import type { DecisionQueueItem } from "../../domain/decision-workspace.js";
import type {
  OperationalDecision,
  OverrideStatistics,
} from "../../domain/operational-decision.js";
import type { ProductEventBatchRequest } from "../../domain/product-event.js";
import type {
  ParetoFrontierResponse,
  ScenarioOption,
} from "../../domain/scenario.js";
import type {
  UserUxPreferences,
  UserUxPreferencesPatch,
} from "../../domain/user-preferences.js";

export interface PublicHealthPayload {
  status: "healthy";
  timestamp: string;
  checks: Array<{
    name: string;
    status: "pass";
  }>;
}

export interface ContactRequestReceipt {
  id: string;
  status: string;
  receivedAt: string;
  requestType: string;
  companyName: string;
  email: string;
}

export interface LatestDailyForecastRow {
  id: string;
  organizationId: string;
  siteId?: string | null;
  forecastDate: string;
  dimension: "human" | "merchandise";
  predictedDemand: number;
  predictedCapacity: number;
  capacityPlannedCurrent: number;
  capacityPlannedPredicted: number;
  capacityOptimalPredicted: number;
  gap: number;
  riskScore: number;
  confidenceLower: number;
  confidenceUpper: number;
}

export interface ResolvedDecisionConfigView extends ResolvedDecisionEngineConfig {
  selectedHorizon?: DecisionHorizonConfig | null;
}

export interface GoldSchemaColumn {
  name: string;
  dtype: "string" | "date" | "number" | "boolean";
  nullable: boolean;
  sample: string | number | boolean;
}

export interface GoldSchemaView {
  revision: string;
  loadedAt: string;
  totalRows: number;
  totalColumns: number;
  columns: GoldSchemaColumn[];
}

export interface GoldCoverageColumn {
  name: string;
  exposedInExplorer: boolean;
  usedInBusinessViews: boolean;
  mappedViews: string[];
}

export interface GoldCoverageView {
  totalColumns: number;
  explorerExposedColumns: number;
  businessMappedColumns: number;
  totalRows: number;
  columns: GoldCoverageColumn[];
}

export interface GoldProvenanceView {
  revision: string;
  loadedAt: string;
  sourcePath: string;
  scopedRows: number;
  totalRows: number;
  totalColumns: number;
  policy: {
    allowedMockDomains: string[];
    forecastMockColumns: string[];
    nonForecastMockColumns: string[];
    strictDataPolicyOk: boolean;
  };
  qualityReports: {
    silverQualityAvailable: boolean;
    goldFeatureQualityAvailable: boolean;
    lastRunSummaryAvailable: boolean;
    lastRunAt: string | null;
    lastRunGoldRows: number;
  };
}

export interface OrganizationProfile {
  id: string;
  name?: string;
  status?: string;
  plan?: string;
}

export interface DepartmentSummary {
  id: string;
  name: string;
}

export interface SiteSummary {
  id: string;
  name: string;
}

export interface ForecastRunSummary {
  id: string;
  organizationId: string;
  modelType: string;
  modelVersion?: string;
  horizonDays: number;
  status: "pending" | "running" | "completed" | "failed";
  accuracyScore?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface ForecastDetailSummary {
  forecastId: string;
  status: string;
  drivers: string[];
}

export interface ForecastDailyDetail {
  forecastId: string;
  date: string;
}

export interface ForecastRequestAccepted {
  id: string;
  status: string;
}

export interface ForecastWhatIfResult {
  scenario: string;
  deltaCostEur: number;
  deltaServicePct: number;
}

export interface DecisionRecord {
  id: string;
  status?: string;
  title?: string;
}

export interface DecisionReviewResult {
  id: string;
  status: string;
}

export interface DecisionOutcomeResult {
  id: string;
}

export interface ArbitrageOptionSummary {
  id: string;
  label: string;
}

export interface ArbitrageOptionsView {
  alertId: string;
  options: ArbitrageOptionSummary[];
}

export interface ArbitrageValidationResult {
  alertId: string;
}

export interface CoverageAlert {
  id: string;
  organizationId: string;
  siteId: string;
  alertDate: string;
  shift: "am" | "pm";
  horizon: string;
  pRupture: number;
  gapH: number;
  predictionIntervalLow?: number;
  predictionIntervalHigh?: number;
  modelVersion?: string;
  calibrationBucket?: string;
  impactEur?: number;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved" | "expired";
  driversJson: string[];
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  siteName?: string | null;
}

export interface DashboardAlertRecord {
  id: string;
  type: "risk" | "decision" | "forecast" | "absence" | "system";
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  relatedEntityType?:
    | "absence"
    | "decision"
    | "forecast"
    | "employee"
    | "department";
  relatedEntityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  dismissedAt?: string;
  expiresAt?: string;
}

export interface AnalyticsCostsSummary {
  period: {
    startDate?: string | null;
    endDate?: string | null;
  };
  totals: {
    overtimeEur: number;
    interimEur: number;
    avoidedEur: number;
  };
}

export interface QueuedExportResult {
  exportId: string;
  status: string;
}

export interface CostParameterView {
  siteId?: string | null;
}

export interface CostParameterHistoryEntry {
  id: string;
  siteId?: string | null;
  version: number;
}

export interface ProofPack {
  id: string;
  organizationId: string;
  siteId: string;
  month: string;
  coutBauEur: number;
  cout100Eur: number;
  coutReelEur: number;
  gainNetEur: number;
  serviceBauPct?: number;
  serviceReelPct?: number;
  captureRate?: number;
  bauMethodVersion?: string;
  attributionConfidence?: number;
  adoptionPct?: number;
  alertesEmises: number;
  alertesTraitees: number;
}

export interface ProofPackSummary {
  totalGainNetEur: number;
  avgAdoptionPct: number | null;
  totalAlertesEmises: number;
  totalAlertesTraitees: number;
  records: ProofPack[];
}

export interface ProofPdfLink {
  url: string;
}

export interface ProductEventBatchAccepted {
  accepted: number;
}

export interface ConversationSummary {
  id: string;
  subject?: string;
  status?: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  content: string;
}

export interface ConversationUnreadCount {
  unreadCount: number;
}

export interface SupportThreadMessage {
  id: string;
  content: string;
}

export interface SupportThreadView {
  id: string;
  status: string;
  messages: SupportThreadMessage[];
}

export interface DecisionDiagnostic {
  topDrivers: string[];
  confidencePct?: number;
  riskTrend?: "improving" | "stable" | "worsening";
  note?: string;
}

export interface DecisionWorkspace {
  alert: CoverageAlert;
  options: ScenarioOption[];
  recommendedOptionId?: string | null;
  diagnostic?: DecisionDiagnostic;
}

export interface CanonicalRecord {
  id: string;
  organizationId: string;
  siteId: string;
  date: string;
  shift: "am" | "pm";
  competence?: string | null;
  chargeUnits?: number | null;
  capacitePlanH: number;
  realiseH?: number | null;
  absH?: number | null;
  hsH?: number | null;
  interimH?: number | null;
  coutInterneEst?: number | null;
  siteName?: string | null;
}

export interface PublicApiTypeRegistry {
  AnalyticsCostsSummary: AnalyticsCostsSummary;
  ArbitrageOptionsView: ArbitrageOptionsView;
  ArbitrageValidationResult: ArbitrageValidationResult;
  CanonicalQualityDashboard: CanonicalQualityDashboard;
  CanonicalRecord: CanonicalRecord;
  ContactRequestReceipt: ContactRequestReceipt;
  ContactRequestSubmission: ContactRequestSubmission;
  ConversationCreateRequest: ConversationCreateRequest;
  ConversationMessage: ConversationMessage;
  ConversationSummary: ConversationSummary;
  ConversationUnreadCount: ConversationUnreadCount;
  CostParameterHistoryEntry: CostParameterHistoryEntry;
  CostParameterView: CostParameterView;
  CoverageAlert: CoverageAlert;
  DashboardAlertRecord: DashboardAlertRecord;
  DashboardSummary: DashboardSummary;
  DatasetDataPreviewResponse: DatasetDataPreviewResponse;
  DatasetDetailResponse: DatasetDetailResponse;
  DecisionOutcomeResult: DecisionOutcomeResult;
  DecisionQueueItem: DecisionQueueItem;
  DecisionRecord: DecisionRecord;
  DecisionReviewResult: DecisionReviewResult;
  DecisionWorkspace: DecisionWorkspace;
  DepartmentSummary: DepartmentSummary;
  ExportRequest: ExportRequest;
  ForecastDailyDetail: ForecastDailyDetail;
  ForecastDetailSummary: ForecastDetailSummary;
  ForecastRequestAccepted: ForecastRequestAccepted;
  ForecastRunSummary: ForecastRunSummary;
  ForecastWhatIfResult: ForecastWhatIfResult;
  GoldCoverageView: GoldCoverageView;
  GoldProvenanceView: GoldProvenanceView;
  GoldSchemaColumn: GoldSchemaColumn;
  GoldSchemaView: GoldSchemaView;
  IngestionHistoryResponse: IngestionHistoryResponse;
  LatestDailyForecastRow: LatestDailyForecastRow;
  MessageCreateRequest: MessageCreateRequest;
  OperationalDecision: OperationalDecision;
  OperationalDecisionCreateRequest: OperationalDecisionCreateRequest;
  OrganizationProfile: OrganizationProfile;
  OverrideStatistics: OverrideStatistics;
  ParetoFrontierResponse: ParetoFrontierResponse;
  ProductEventBatchAccepted: ProductEventBatchAccepted;
  ProductEventBatchRequest: ProductEventBatchRequest;
  ProofPack: ProofPack;
  ProofPackGenerateRequest: ProofPackGenerateRequest;
  ProofPackSummary: ProofPackSummary;
  ProofPdfLink: ProofPdfLink;
  PublicHealthPayload: PublicHealthPayload;
  QueuedExportResult: QueuedExportResult;
  RecordDecisionOutcomeRequest: RecordDecisionOutcomeRequest;
  RequestForecastRequest: RequestForecastRequest;
  ResolvedDecisionConfigView: ResolvedDecisionConfigView;
  ReviewDecisionRequest: ReviewDecisionRequest;
  ScenarioGenerationRequest: ScenarioGenerationRequest;
  SiteSummary: SiteSummary;
  SupportThreadMessage: SupportThreadMessage;
  SupportThreadView: SupportThreadView;
  UserUxPreferences: UserUxPreferences;
  UserUxPreferencesPatch: UserUxPreferencesPatch;
  ValidateArbitrageRequest: ValidateArbitrageRequest;
  WhatIfScenarioRequest: WhatIfScenarioRequest;
}

export type PublicApiSharedTypeName = keyof PublicApiTypeRegistry;

export type PublicApiRequestTypeName =
  | "ContactRequestSubmission"
  | "ConversationCreateRequest"
  | "ExportRequest"
  | "MessageCreateRequest"
  | "OperationalDecisionCreateRequest"
  | "ProductEventBatchRequest"
  | "ProofPackGenerateRequest"
  | "RecordDecisionOutcomeRequest"
  | "RequestForecastRequest"
  | "ReviewDecisionRequest"
  | "ScenarioGenerationRequest"
  | "UserUxPreferencesPatch"
  | "ValidateArbitrageRequest"
  | "WhatIfScenarioRequest";

export type PublicApiResponseTypeName = Exclude<
  PublicApiSharedTypeName,
  PublicApiRequestTypeName
>;
