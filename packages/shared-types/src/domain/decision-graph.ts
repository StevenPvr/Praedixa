import type { ISODateTimeString, UUID } from "../utils/common.js";
import type { DecisionEntityType, DecisionPack } from "./decision-contract.js";

export type DecisionGraphStatus =
  | "draft"
  | "testing"
  | "published"
  | "archived";

export type DecisionGraphGrain = DecisionEntityType;

export type DecisionGraphAttributeValueType =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "date"
  | "datetime";

export type DecisionGraphRelationType =
  | "ownership"
  | "dependency"
  | "aggregation"
  | "reference";

export type DecisionGraphRelationCardinality =
  | "one_to_one"
  | "one_to_many"
  | "many_to_one"
  | "many_to_many";

export type DecisionGraphMetricValueType = "integer" | "number" | "boolean";

export type DecisionGraphSnapshotPolicy =
  | "recomputable"
  | "materialized"
  | "event_sourced";

export type DecisionGraphDimensionValueType =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "date";

export type DecisionGraphHorizonSnapshotMode =
  | "point_in_time"
  | "rolling_window"
  | "period_bucket";

export type DecisionGraphDuplicatePolicy = "fail" | "flag" | "merge";

export type DecisionGraphImpactLevel = "low" | "medium" | "high";

export type DecisionGraphLineageDirection = "upstream" | "downstream" | "both";

export interface DecisionGraphSourceBinding {
  sourceSystem: string;
  field: string;
}

export interface DecisionGraphAttribute {
  key: string;
  valueType: DecisionGraphAttributeValueType;
  nullable: boolean;
  unit?: string;
}

export interface DecisionGraphEntity {
  name: string;
  label: string;
  description?: string;
  grain: DecisionGraphGrain;
  identifiers: readonly string[];
  attributes: readonly DecisionGraphAttribute[];
  sourceBindings?: readonly DecisionGraphSourceBinding[];
}

export interface DecisionGraphJoinKey {
  fromKey: string;
  toKey: string;
}

export interface DecisionGraphRelation {
  name: string;
  fromEntity: string;
  toEntity: string;
  relationType?: DecisionGraphRelationType;
  cardinality: DecisionGraphRelationCardinality;
  joinKeys: readonly DecisionGraphJoinKey[];
  description?: string;
}

export interface DecisionGraphMetric {
  key: string;
  label: string;
  grain: DecisionGraphGrain;
  ownerEntity?: string;
  valueType: DecisionGraphMetricValueType;
  unit?: string;
  expression: string;
  dependsOn: readonly string[];
  snapshotPolicy: DecisionGraphSnapshotPolicy;
  timeHorizonRequired: boolean;
}

export interface DecisionGraphDimension {
  key: string;
  label: string;
  valueType: DecisionGraphDimensionValueType;
  allowedValues?: readonly string[] | readonly number[] | readonly boolean[];
}

export interface DecisionGraphHorizon {
  horizonId: string;
  label: string;
  startOffsetDays: number;
  endOffsetDays: number;
  snapshotMode: DecisionGraphHorizonSnapshotMode;
}

export interface DecisionGraphResolutionStrategy {
  entity: string;
  sourceSystem: string;
  matchKeys: readonly string[];
  confidenceThreshold?: number;
}

export interface DecisionGraphEntityResolution {
  duplicatePolicy: DecisionGraphDuplicatePolicy;
  strategies: readonly DecisionGraphResolutionStrategy[];
}

export interface DecisionGraphCompatibility {
  backwardCompatibleWith: readonly number[];
  breakingChange: boolean;
  changeSummary?: string;
}

export interface DecisionGraphChangeImpact {
  contractId: string;
  minimumContractVersion: number;
  impactLevel: DecisionGraphImpactLevel;
}

export interface DecisionGraphAudit {
  createdAt: ISODateTimeString;
  createdBy: UUID;
  publishedAt?: ISODateTimeString;
  changeReason: string;
}

export interface DecisionGraph {
  kind: "DecisionGraph";
  schemaVersion: "1.0.0";
  graphId: string;
  graphVersion: number;
  name?: string;
  status: DecisionGraphStatus;
  canonicalModelVersion: string;
  supportedPacks: readonly DecisionPack[];
  entities: readonly DecisionGraphEntity[];
  relations: readonly DecisionGraphRelation[];
  metrics: readonly DecisionGraphMetric[];
  dimensions: readonly DecisionGraphDimension[];
  horizons: readonly DecisionGraphHorizon[];
  entityResolution: DecisionGraphEntityResolution;
  compatibility: DecisionGraphCompatibility;
  changeImpact?: readonly DecisionGraphChangeImpact[];
  audit: DecisionGraphAudit;
}

export interface DecisionGraphQuery {
  entityNames?: readonly string[];
  relationNames?: readonly string[];
  relationTypes?: readonly DecisionGraphRelationType[];
  metricKeys?: readonly string[];
  metricOwnerEntities?: readonly string[];
  dimensionKeys?: readonly string[];
  horizonIds?: readonly string[];
  grains?: readonly DecisionGraphGrain[];
  pack?: DecisionPack;
  includeConnectedRelations?: boolean;
  includeConnectedEntities?: boolean;
}

export interface DecisionGraphQueryResult {
  entities: readonly DecisionGraphEntity[];
  relations: readonly DecisionGraphRelation[];
  metrics: readonly DecisionGraphMetric[];
  dimensions: readonly DecisionGraphDimension[];
  horizons: readonly DecisionGraphHorizon[];
}

export interface DecisionGraphLineageQuery {
  entityNames?: readonly string[];
  metricKeys?: readonly string[];
  direction?: DecisionGraphLineageDirection;
  maxDepth?: number;
}

export interface DecisionGraphLineageResult {
  entities: readonly DecisionGraphEntity[];
  metrics: readonly DecisionGraphMetric[];
  relations: readonly DecisionGraphRelation[];
}

export interface DecisionGraphVersionDiff {
  addedEntities: readonly string[];
  removedEntities: readonly string[];
  modifiedEntities: readonly string[];
  addedRelations: readonly string[];
  removedRelations: readonly string[];
  modifiedRelations: readonly string[];
  addedMetrics: readonly string[];
  removedMetrics: readonly string[];
  modifiedMetrics: readonly string[];
}

export interface DecisionGraphChangeAnalysis {
  diff: DecisionGraphVersionDiff;
  impactedEntities: readonly string[];
  impactedMetrics: readonly string[];
  impactedRelations: readonly string[];
  contractImpacts: readonly DecisionGraphChangeImpact[];
  highestImpactLevel: DecisionGraphImpactLevel | null;
}
