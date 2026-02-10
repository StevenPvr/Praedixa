// Forecast domain types - ML predictions

import type { TenantEntity, UUID, ISODateString } from "../utils/common";
import type { DateRange, TimeGranularity } from "../utils/dates";

/** Forecast model type */
export type ForecastModelType =
  | "arima" // Time series
  | "prophet" // Facebook Prophet
  | "random_forest" // ML ensemble
  | "xgboost" // Gradient boosting
  | "ensemble"; // Combined models

/** Forecast confidence level */
export type ConfidenceLevel = "low" | "medium" | "high";

/** Forecast status */
export type ForecastStatus = "pending" | "running" | "completed" | "failed";

/** Forecast run entity */
export interface ForecastRun extends TenantEntity {
  /** Forecast horizon start */
  horizonStart: ISODateString;
  /** Forecast horizon end */
  horizonEnd: ISODateString;
  /** Granularity */
  granularity: TimeGranularity;
  /** Model used */
  modelType: ForecastModelType;
  /** Model version */
  modelVersion: string;
  /** Status */
  status: ForecastStatus;
  /** Training data range */
  trainingDataRange: DateRange;
  /** Metrics */
  metrics?: ForecastMetrics;
  /** Run started at */
  startedAt: ISODateString;
  /** Run completed at */
  completedAt?: ISODateString;
  /** Error message if failed */
  errorMessage?: string;
  /** Department scope (null = all) */
  departmentId?: UUID;
}

/** Forecast accuracy metrics */
export interface ForecastMetrics {
  /** Mean Absolute Error */
  mae: number;
  /** Mean Absolute Percentage Error */
  mape: number;
  /** Root Mean Square Error */
  rmse: number;
  /** R-squared */
  r2: number;
  /** Coverage of prediction intervals */
  coverageRate: number;
}

/** Daily forecast prediction */
export interface DailyForecast {
  /** Forecast run ID */
  forecastRunId: UUID;
  /** Prediction date */
  date: ISODateString;
  /** Department (null = organization-wide) */
  departmentId?: UUID;
  /** Predicted absence count */
  predictedAbsences: number;
  /** Predicted absence rate (%) */
  predictedAbsenceRate: number;
  /** Lower bound (confidence interval) */
  lowerBound: number;
  /** Upper bound (confidence interval) */
  upperBound: number;
  /** Confidence level */
  confidence: ConfidenceLevel;
  /** Breakdown by absence type */
  byType: Record<string, number>;
  /** Breakdown by category */
  byCategory: Record<string, number>;
  /** Risk indicators */
  riskIndicators: RiskIndicators;
}

/** Risk indicators for a forecast day */
export interface RiskIndicators {
  /** Understaffing risk (0-100) */
  understaffingRisk: number;
  /** Operational impact score (0-100) */
  operationalImpact: number;
  /** Critical roles at risk */
  criticalRolesAtRisk: number;
  /** Departments at risk */
  departmentsAtRisk: UUID[];
  /** Risk level */
  riskLevel: "low" | "medium" | "high" | "critical";
}

/** Forecast summary for a period */
export interface ForecastSummary {
  period: DateRange;
  granularity: TimeGranularity;
  /** Average predicted absence rate */
  avgAbsenceRate: number;
  /** Total predicted absence days */
  totalAbsenceDays: number;
  /** Peak absence date */
  peakDate: ISODateString;
  /** Peak absence count */
  peakCount: number;
  /** High risk days count */
  highRiskDaysCount: number;
  /** Confidence level */
  overallConfidence: ConfidenceLevel;
  /** Daily forecasts */
  dailyForecasts: DailyForecast[];
}

/** Forecast vs Actual comparison */
export interface ForecastAccuracy {
  date: ISODateString;
  predicted: number;
  actual: number;
  difference: number;
  percentageError: number;
  withinConfidenceInterval: boolean;
}

/** Backtesting results */
export interface BacktestResults {
  period: DateRange;
  modelType: ForecastModelType;
  metrics: ForecastMetrics;
  dailyAccuracy: ForecastAccuracy[];
  /** Best performing periods */
  bestPeriods: DateRange[];
  /** Worst performing periods */
  worstPeriods: DateRange[];
  /** Recommendations */
  recommendations: string[];
}

/** Feature importance for ML models */
export interface FeatureImportance {
  feature: string;
  importance: number;
  description: string;
}

/** Model explanation */
export interface ModelExplanation {
  modelType: ForecastModelType;
  featureImportances: FeatureImportance[];
  seasonalPatterns: SeasonalPattern[];
  trendDirection: "increasing" | "decreasing" | "stable";
  confidenceFactors: string[];
}

/** Seasonal pattern detected */
export interface SeasonalPattern {
  type: "weekly" | "monthly" | "yearly" | "holiday";
  description: string;
  impact: number; // multiplier
  peakPeriods: string[];
}

/** Forecast request parameters */
export interface ForecastRequest {
  horizonDays: number;
  granularity: TimeGranularity;
  modelType?: ForecastModelType;
  departmentId?: UUID;
  includeConfidenceIntervals?: boolean;
}

/** What-if scenario for forecasting */
export interface WhatIfScenario {
  name: string;
  description: string;
  /** Absence rate modifier (e.g., 1.2 = 20% increase) */
  absenceRateModifier?: number;
  /** Specific type modifiers */
  typeModifiers?: Record<string, number>;
  /** Additional planned absences */
  additionalAbsences?: {
    employeeId: UUID;
    startDate: ISODateString;
    endDate: ISODateString;
    type: string;
  }[];
}

/** What-if scenario result */
export interface WhatIfResult {
  scenario: WhatIfScenario;
  baselineForecast: ForecastSummary;
  scenarioForecast: ForecastSummary;
  impact: {
    absenceRateChange: number;
    additionalRiskDays: number;
    costImpact?: number;
  };
}
