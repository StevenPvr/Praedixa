import type {
  DecisionPack,
  DecisionGraph,
  DecisionGraphChangeImpact,
  DecisionGraphDimension,
  DecisionGraphEntity,
  DecisionGraphGrain,
  DecisionGraphHorizon,
  DecisionGraphImpactLevel,
  DecisionGraphLineageDirection,
  DecisionGraphLineageResult,
  DecisionGraphMetric,
  DecisionGraphQueryResult,
  DecisionGraphRelation,
  DecisionGraphRelationType,
  DecisionGraphStatus,
} from "@praedixa/shared-types/domain";

import {
  assertDecisionGraphIntegrity,
  getDecisionGraphLineage,
  queryDecisionGraph,
} from "./decision-graph.js";

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

function compareByName(left: string, right: string): number {
  return left.localeCompare(right);
}

function entityNodeId(entityName: string): string {
  return `entity:${entityName}`;
}

function normalizeStringList(
  values: readonly string[] | undefined,
  field: string,
): readonly string[] | undefined {
  if (values == null) {
    return undefined;
  }

  const normalized = values.map((value) => value.trim());
  if (normalized.some((value) => value.length === 0)) {
    throw new Error(`${field} cannot contain empty values`);
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`${field} cannot contain duplicates`);
  }
  return normalized;
}

function normalizeFilters(
  filters: DecisionGraphExplorerFilters | undefined,
): DecisionGraphExplorerFilters {
  const search = filters?.search?.trim();
  if (filters?.search != null && search?.length === 0) {
    throw new Error("filters.search cannot be empty");
  }

  return {
    pack: filters?.pack,
    search,
    entityNames: normalizeStringList(
      filters?.entityNames,
      "filters.entityNames",
    ),
    relationNames: normalizeStringList(
      filters?.relationNames,
      "filters.relationNames",
    ),
    relationTypes: filters?.relationTypes,
    metricKeys: normalizeStringList(filters?.metricKeys, "filters.metricKeys"),
    metricOwnerEntities: normalizeStringList(
      filters?.metricOwnerEntities,
      "filters.metricOwnerEntities",
    ),
    dimensionKeys: normalizeStringList(
      filters?.dimensionKeys,
      "filters.dimensionKeys",
    ),
    horizonIds: normalizeStringList(filters?.horizonIds, "filters.horizonIds"),
    grains: filters?.grains,
    includeConnectedRelations: filters?.includeConnectedRelations,
    includeConnectedEntities: filters?.includeConnectedEntities,
  };
}

function normalizeLineageRequest(
  lineage: DecisionGraphExplorerLineageRequest | undefined,
): DecisionGraphExplorerLineageRequest | undefined {
  if (lineage == null) {
    return undefined;
  }

  const entityNames = normalizeStringList(
    lineage.entityNames,
    "lineage.entityNames",
  );
  const metricKeys = normalizeStringList(
    lineage.metricKeys,
    "lineage.metricKeys",
  );
  if ((entityNames?.length ?? 0) === 0 && (metricKeys?.length ?? 0) === 0) {
    throw new Error("lineage requires at least one entity or metric seed");
  }

  if (
    lineage.maxDepth != null &&
    (!Number.isInteger(lineage.maxDepth) || lineage.maxDepth < 1)
  ) {
    throw new Error("lineage.maxDepth must be an integer >= 1");
  }

  return {
    entityNames,
    metricKeys,
    direction: lineage.direction,
    maxDepth: lineage.maxDepth,
  };
}

function matchesSearch(value: string | undefined, search: string): boolean {
  return value?.toLowerCase().includes(search) ?? false;
}

function applySearchFilter(
  result: DecisionGraphQueryResult,
  search: string | undefined,
): DecisionGraphQueryResult {
  if (search == null) {
    return result;
  }

  const loweredSearch = search.toLowerCase();
  const entities = result.entities.filter(
    (entity) =>
      matchesSearch(entity.name, loweredSearch) ||
      matchesSearch(entity.label, loweredSearch) ||
      matchesSearch(entity.description, loweredSearch),
  );
  const metrics = result.metrics.filter(
    (metric) =>
      matchesSearch(metric.key, loweredSearch) ||
      matchesSearch(metric.label, loweredSearch) ||
      matchesSearch(metric.ownerEntity, loweredSearch) ||
      matchesSearch(metric.expression, loweredSearch),
  );
  const relations = result.relations.filter(
    (relation) =>
      matchesSearch(relation.name, loweredSearch) ||
      matchesSearch(relation.fromEntity, loweredSearch) ||
      matchesSearch(relation.toEntity, loweredSearch) ||
      matchesSearch(relation.description, loweredSearch),
  );

  return {
    entities,
    metrics,
    relations,
    dimensions: result.dimensions.filter(
      (dimension) =>
        matchesSearch(dimension.key, loweredSearch) ||
        matchesSearch(dimension.label, loweredSearch),
    ),
    horizons: result.horizons.filter(
      (horizon) =>
        matchesSearch(horizon.horizonId, loweredSearch) ||
        matchesSearch(horizon.label, loweredSearch),
    ),
  };
}

function buildLineageSummary(
  lineageRequest: DecisionGraphExplorerLineageRequest | undefined,
  lineageResult: DecisionGraphLineageResult | undefined,
): DecisionGraphExplorerLineageSummary | undefined {
  if (lineageRequest == null || lineageResult == null) {
    return undefined;
  }

  return {
    direction: lineageRequest.direction ?? "both",
    maxDepth: lineageRequest.maxDepth,
    entities: lineageResult.entities
      .map((entity) => entity.name)
      .sort(compareByName),
    metrics: lineageResult.metrics
      .map((metric) => metric.key)
      .sort(compareByName),
    relations: lineageResult.relations
      .map((relation) => relation.name)
      .sort(compareByName),
  };
}

function buildHighlightSets(
  filters: DecisionGraphExplorerFilters,
  lineage: DecisionGraphExplorerLineageSummary | undefined,
): {
  selectedEntities: ReadonlySet<string>;
  selectedMetrics: ReadonlySet<string>;
  lineageEntities: ReadonlySet<string>;
  lineageMetrics: ReadonlySet<string>;
  lineageRelations: ReadonlySet<string>;
} {
  return {
    selectedEntities: new Set(filters.entityNames ?? []),
    selectedMetrics: new Set(filters.metricKeys ?? []),
    lineageEntities: new Set(lineage?.entities ?? []),
    lineageMetrics: new Set(lineage?.metrics ?? []),
    lineageRelations: new Set(lineage?.relations ?? []),
  };
}

export function buildDecisionGraphEntityCards(
  result: DecisionGraphQueryResult,
  filters: DecisionGraphExplorerFilters,
  lineage: DecisionGraphExplorerLineageSummary | undefined,
): readonly DecisionGraphExplorerEntityCard[] {
  const { selectedEntities, lineageEntities } = buildHighlightSets(
    filters,
    lineage,
  );

  return [...result.entities]
    .sort((left, right) => compareByName(left.name, right.name))
    .map((entity) => ({
      entityName: entity.name,
      label: entity.label,
      grain: entity.grain,
      identifierCount: entity.identifiers.length,
      attributeCount: entity.attributes.length,
      sourceBindingCount: entity.sourceBindings?.length ?? 0,
      inboundRelationCount: result.relations.filter(
        (relation) => relation.toEntity === entity.name,
      ).length,
      outboundRelationCount: result.relations.filter(
        (relation) => relation.fromEntity === entity.name,
      ).length,
      ownedMetricCount: result.metrics.filter(
        (metric) => metric.ownerEntity === entity.name,
      ).length,
      isSelected: selectedEntities.has(entity.name),
      isInLineage: lineageEntities.has(entity.name),
    }));
}

export function buildDecisionGraphMetricCards(
  result: DecisionGraphQueryResult,
  filters: DecisionGraphExplorerFilters,
  lineage: DecisionGraphExplorerLineageSummary | undefined,
): readonly DecisionGraphExplorerMetricCard[] {
  const { selectedMetrics, lineageMetrics } = buildHighlightSets(
    filters,
    lineage,
  );

  return [...result.metrics]
    .sort((left, right) => compareByName(left.key, right.key))
    .map((metric) => ({
      metricKey: metric.key,
      label: metric.label,
      grain: metric.grain,
      ownerEntity: metric.ownerEntity,
      dependencyCount: metric.dependsOn.length,
      snapshotPolicy: metric.snapshotPolicy,
      timeHorizonRequired: metric.timeHorizonRequired,
      isSelected: selectedMetrics.has(metric.key),
      isInLineage: lineageMetrics.has(metric.key),
    }));
}

export function buildDecisionGraphRelationGraphSummary(
  result: DecisionGraphQueryResult,
  filters: DecisionGraphExplorerFilters,
  lineage: DecisionGraphExplorerLineageSummary | undefined,
): DecisionGraphExplorerRelationGraphSummary {
  const { selectedEntities, lineageEntities, lineageRelations } =
    buildHighlightSets(filters, lineage);
  const entityNames = new Set(result.entities.map((entity) => entity.name));
  const relations = result.relations
    .filter(
      (relation) =>
        entityNames.has(relation.fromEntity) &&
        entityNames.has(relation.toEntity),
    )
    .sort((left, right) => compareByName(left.name, right.name));

  const nodes = [...result.entities]
    .sort((left, right) => compareByName(left.name, right.name))
    .map((entity) => ({
      nodeId: entityNodeId(entity.name),
      entityName: entity.name,
      label: entity.label,
      grain: entity.grain,
      inboundRelationCount: relations.filter(
        (relation) => relation.toEntity === entity.name,
      ).length,
      outboundRelationCount: relations.filter(
        (relation) => relation.fromEntity === entity.name,
      ).length,
      isHighlighted:
        selectedEntities.has(entity.name) || lineageEntities.has(entity.name),
    }));

  const edges = relations.map((relation) => ({
    edgeId: relation.name,
    relationName: relation.name,
    fromNodeId: entityNodeId(relation.fromEntity),
    toNodeId: entityNodeId(relation.toEntity),
    relationType: relation.relationType,
    cardinality: relation.cardinality,
    isHighlighted: lineageRelations.has(relation.name),
  }));

  return {
    entityCount: nodes.length,
    relationCount: edges.length,
    highlightedEntityCount: nodes.filter((node) => node.isHighlighted).length,
    highlightedRelationCount: edges.filter((edge) => edge.isHighlighted).length,
    nodes,
    edges,
  };
}

function summarizeHighestImpactLevel(
  impacts: readonly DecisionGraphChangeImpact[],
): DecisionGraphImpactLevel | null {
  if (impacts.some((impact) => impact.impactLevel === "high")) {
    return "high";
  }
  if (impacts.some((impact) => impact.impactLevel === "medium")) {
    return "medium";
  }
  if (impacts.some((impact) => impact.impactLevel === "low")) {
    return "low";
  }
  return null;
}

function impactTone(
  level: DecisionGraphImpactLevel,
): DecisionGraphExplorerImpactTone {
  if (level === "high") {
    return "danger";
  }
  if (level === "medium") {
    return "warning";
  }
  return "neutral";
}

export function buildDecisionGraphImpactBadges(
  graph: DecisionGraph,
): readonly DecisionGraphExplorerImpactBadge[] {
  return [...(graph.changeImpact ?? [])]
    .sort((left, right) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      const severityDiff =
        severityOrder[left.impactLevel] - severityOrder[right.impactLevel];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return compareByName(left.contractId, right.contractId);
    })
    .map((impact) => ({
      contractId: impact.contractId,
      minimumContractVersion: impact.minimumContractVersion,
      impactLevel: impact.impactLevel,
      tone: impactTone(impact.impactLevel),
    }));
}

function countActiveFilters(
  filters: DecisionGraphExplorerFilters,
  lineage: DecisionGraphExplorerLineageRequest | undefined,
): number {
  const candidates = [
    filters.pack,
    filters.search,
    ...(filters.entityNames ?? []),
    ...(filters.relationNames ?? []),
    ...(filters.relationTypes ?? []),
    ...(filters.metricKeys ?? []),
    ...(filters.metricOwnerEntities ?? []),
    ...(filters.dimensionKeys ?? []),
    ...(filters.horizonIds ?? []),
    ...(filters.grains ?? []),
    filters.includeConnectedRelations ? "connected-relations" : undefined,
    filters.includeConnectedEntities ? "connected-entities" : undefined,
    ...(lineage?.entityNames ?? []),
    ...(lineage?.metricKeys ?? []),
    lineage?.direction,
    lineage?.maxDepth?.toString(),
  ];

  return candidates.filter((value) => value != null).length;
}

export function buildDecisionGraphExplorerResponse(
  graph: DecisionGraph,
  request: DecisionGraphExplorerRequest = {},
): DecisionGraphExplorerResponse {
  assertDecisionGraphIntegrity(graph);

  const filters = normalizeFilters(request.filters);
  const lineageRequest = normalizeLineageRequest(request.lineage);
  const queriedResult = queryDecisionGraph(graph, filters);
  const filteredResult = applySearchFilter(queriedResult, filters.search);
  const lineageResult =
    lineageRequest == null
      ? undefined
      : getDecisionGraphLineage(graph, lineageRequest);
  const lineage = buildLineageSummary(lineageRequest, lineageResult);

  return {
    summary: {
      graphId: graph.graphId,
      graphVersion: graph.graphVersion,
      name: graph.name,
      status: graph.status,
      canonicalModelVersion: graph.canonicalModelVersion,
      supportedPacks: [...graph.supportedPacks],
    },
    filters,
    entities: filteredResult.entities,
    metrics: filteredResult.metrics,
    relations: filteredResult.relations,
    dimensions: filteredResult.dimensions,
    horizons: filteredResult.horizons,
    lineage,
    entityCards: buildDecisionGraphEntityCards(
      filteredResult,
      filters,
      lineage,
    ),
    metricCards: buildDecisionGraphMetricCards(
      filteredResult,
      filters,
      lineage,
    ),
    relationGraph: buildDecisionGraphRelationGraphSummary(
      filteredResult,
      filters,
      lineage,
    ),
    impactSummary: {
      breakingChange: graph.compatibility.breakingChange,
      highestImpactLevel: summarizeHighestImpactLevel(graph.changeImpact ?? []),
      backwardCompatibleWith: [...graph.compatibility.backwardCompatibleWith],
      impactedContractCount: graph.changeImpact?.length ?? 0,
      badges: buildDecisionGraphImpactBadges(graph),
    },
    debug: {
      activeFilterCount: countActiveFilters(filters, lineageRequest),
      resultEntityCount: filteredResult.entities.length,
      resultMetricCount: filteredResult.metrics.length,
      resultRelationCount: filteredResult.relations.length,
      lineageEnabled: lineage != null,
      searchApplied: filters.search != null,
    },
  };
}
