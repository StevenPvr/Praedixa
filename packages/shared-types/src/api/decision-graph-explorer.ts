import type { DecisionPack } from "../domain/decision-contract.js";
import type {
  DecisionGraph,
  DecisionGraphChangeImpact,
  DecisionGraphDimension,
  DecisionGraphEntity,
  DecisionGraphGrain,
  DecisionGraphHorizon,
  DecisionGraphImpactLevel,
  DecisionGraphLineageDirection,
  DecisionGraphMetric,
  DecisionGraphRelation,
  DecisionGraphRelationType,
  DecisionGraphStatus,
} from "../domain/decision-graph.js";

export interface DecisionGraphExplorerFilters {
  pack?: DecisionPack;
  search?: string;
  entityNames?: readonly string[];
  relationNames?: readonly string[];
  relationTypes?: readonly DecisionGraphRelationType[];
  metricKeys?: readonly string[];
  metricOwnerEntities?: readonly string[];
  dimensionKeys?: readonly string[];
  horizonIds?: readonly string[];
  grains?: readonly DecisionGraphGrain[];
  includeConnectedRelations?: boolean;
  includeConnectedEntities?: boolean;
}

export interface DecisionGraphExplorerLineageRequest {
  entityNames?: readonly string[];
  metricKeys?: readonly string[];
  direction?: DecisionGraphLineageDirection;
  maxDepth?: number;
}

export interface DecisionGraphExplorerRequest {
  filters?: DecisionGraphExplorerFilters;
  lineage?: DecisionGraphExplorerLineageRequest;
}

export interface DecisionGraphExplorerSummary {
  graphId: string;
  graphVersion: number;
  name?: string;
  status: DecisionGraphStatus;
  canonicalModelVersion: string;
  supportedPacks: readonly DecisionPack[];
}

export interface DecisionGraphExplorerLineageSummary {
  direction: DecisionGraphLineageDirection;
  maxDepth?: number;
  entities: readonly string[];
  metrics: readonly string[];
  relations: readonly string[];
}

export interface DecisionGraphExplorerEntityCard {
  entityName: string;
  label: string;
  grain: DecisionGraphGrain;
  identifierCount: number;
  attributeCount: number;
  sourceBindingCount: number;
  inboundRelationCount: number;
  outboundRelationCount: number;
  ownedMetricCount: number;
  isSelected: boolean;
  isInLineage: boolean;
}

export interface DecisionGraphExplorerMetricCard {
  metricKey: string;
  label: string;
  grain: DecisionGraphGrain;
  ownerEntity?: string;
  dependencyCount: number;
  snapshotPolicy: DecisionGraph["metrics"][number]["snapshotPolicy"];
  timeHorizonRequired: boolean;
  isSelected: boolean;
  isInLineage: boolean;
}

export interface DecisionGraphExplorerRelationNode {
  nodeId: string;
  entityName: string;
  label: string;
  grain: DecisionGraphGrain;
  inboundRelationCount: number;
  outboundRelationCount: number;
  isHighlighted: boolean;
}

export interface DecisionGraphExplorerRelationEdge {
  edgeId: string;
  relationName: string;
  fromNodeId: string;
  toNodeId: string;
  relationType?: DecisionGraphRelationType;
  cardinality: DecisionGraphRelation["cardinality"];
  isHighlighted: boolean;
}

export interface DecisionGraphExplorerRelationGraphSummary {
  entityCount: number;
  relationCount: number;
  highlightedEntityCount: number;
  highlightedRelationCount: number;
  nodes: readonly DecisionGraphExplorerRelationNode[];
  edges: readonly DecisionGraphExplorerRelationEdge[];
}

export type DecisionGraphExplorerImpactTone = "neutral" | "warning" | "danger";

export interface DecisionGraphExplorerImpactBadge {
  contractId: string;
  minimumContractVersion: number;
  impactLevel: DecisionGraphImpactLevel;
  tone: DecisionGraphExplorerImpactTone;
}

export interface DecisionGraphExplorerImpactSummary {
  breakingChange: boolean;
  highestImpactLevel: DecisionGraphImpactLevel | null;
  backwardCompatibleWith: readonly number[];
  impactedContractCount: number;
  badges: readonly DecisionGraphExplorerImpactBadge[];
}

export interface DecisionGraphExplorerDebugSummary {
  activeFilterCount: number;
  resultEntityCount: number;
  resultMetricCount: number;
  resultRelationCount: number;
  lineageEnabled: boolean;
  searchApplied: boolean;
}

export interface DecisionGraphExplorerResponse {
  summary: DecisionGraphExplorerSummary;
  filters: DecisionGraphExplorerFilters;
  entities: readonly DecisionGraphEntity[];
  metrics: readonly DecisionGraphMetric[];
  relations: readonly DecisionGraphRelation[];
  dimensions: readonly DecisionGraphDimension[];
  horizons: readonly DecisionGraphHorizon[];
  lineage?: DecisionGraphExplorerLineageSummary;
  entityCards: readonly DecisionGraphExplorerEntityCard[];
  metricCards: readonly DecisionGraphExplorerMetricCard[];
  relationGraph: DecisionGraphExplorerRelationGraphSummary;
  impactSummary: DecisionGraphExplorerImpactSummary;
  debug: DecisionGraphExplorerDebugSummary;
}

export type DecisionGraphExplorerImpactSource =
  readonly DecisionGraphChangeImpact[];
