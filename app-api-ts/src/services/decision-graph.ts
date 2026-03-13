import type {
  DecisionGraph,
  DecisionGraphChangeAnalysis,
  DecisionGraphImpactLevel,
  DecisionGraphLineageQuery,
  DecisionGraphLineageResult,
  DecisionGraphMetric,
  DecisionGraphQuery,
  DecisionGraphQueryResult,
  DecisionGraphRelation,
  DecisionGraphStatus,
} from "@praedixa/shared-types/domain";

const DECISION_GRAPH_TRANSITIONS: Record<
  DecisionGraphStatus,
  readonly DecisionGraphStatus[]
> = {
  draft: ["testing", "archived"],
  testing: ["published", "archived"],
  published: ["archived"],
  archived: [],
};

interface GraphEdge {
  from: string;
  to: string;
  relationName?: string;
}

interface GraphIndex {
  entityByName: Map<string, DecisionGraph["entities"][number]>;
  entityKeysByName: Map<string, Set<string>>;
  relationByName: Map<string, DecisionGraphRelation>;
  metricByKey: Map<string, DecisionGraphMetric>;
  dimensionKeys: Set<string>;
  horizonIds: Set<string>;
  downstreamEdges: readonly GraphEdge[];
  upstreamEdges: readonly GraphEdge[];
}

function entityNodeId(entityName: string): string {
  return `entity:${entityName}`;
}

function metricNodeId(metricKey: string): string {
  return `metric:${metricKey}`;
}

function parseEntityFieldReference(
  reference: string,
): { entityName: string; fieldKey: string } | null {
  const separatorIndex = reference.indexOf(".");
  if (separatorIndex <= 0 || separatorIndex === reference.length - 1) {
    return null;
  }

  return {
    entityName: reference.slice(0, separatorIndex),
    fieldKey: reference.slice(separatorIndex + 1),
  };
}

function assertNonEmpty(value: string | undefined, field: string): void {
  if ((value?.trim().length ?? 0) === 0) {
    throw new Error(`${field} cannot be empty`);
  }
}

function assertUnique<T extends string | number>(
  values: readonly T[],
  field: string,
): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${field} must be unique`);
  }
}

function listEntityKeys(
  entity: DecisionGraph["entities"][number],
): Set<string> {
  return new Set([
    ...entity.identifiers,
    ...entity.attributes.map((attribute) => attribute.key),
  ]);
}

function buildGraphIndex(graph: DecisionGraph): GraphIndex {
  assertNonEmpty(graph.graphId, "graphId");
  assertNonEmpty(graph.canonicalModelVersion, "canonicalModelVersion");
  assertNonEmpty(graph.audit.changeReason, "audit.changeReason");

  if (graph.graphVersion < 1) {
    throw new Error("graphVersion must be >= 1");
  }
  if (graph.entities.length === 0) {
    throw new Error("DecisionGraph requires at least one entity");
  }
  if (graph.metrics.length === 0) {
    throw new Error("DecisionGraph requires at least one metric");
  }
  if (graph.horizons.length === 0) {
    throw new Error("DecisionGraph requires at least one horizon");
  }
  if (graph.supportedPacks.length === 0) {
    throw new Error("DecisionGraph requires at least one supported pack");
  }
  if (graph.status === "published" && !graph.audit.publishedAt) {
    throw new Error("Published DecisionGraph requires audit.publishedAt");
  }

  assertUnique(graph.supportedPacks, "supportedPacks");

  const entityByName = new Map<string, DecisionGraph["entities"][number]>();
  const entityKeysByName = new Map<string, Set<string>>();
  for (const entity of graph.entities) {
    if (entityByName.has(entity.name)) {
      throw new Error(`Duplicate entity ${entity.name}`);
    }
    assertNonEmpty(entity.name, "entity.name");
    assertNonEmpty(entity.label, `entity.${entity.name}.label`);
    if (entity.identifiers.length === 0) {
      throw new Error(`Entity ${entity.name} requires at least one identifier`);
    }
    if (entity.attributes.length === 0) {
      throw new Error(`Entity ${entity.name} requires at least one attribute`);
    }

    assertUnique(entity.identifiers, `Entity ${entity.name} identifiers`);
    const attributeKeys = entity.attributes.map((attribute) => attribute.key);
    assertUnique(attributeKeys, `Entity ${entity.name} attributes`);
    entityByName.set(entity.name, entity);
    entityKeysByName.set(entity.name, listEntityKeys(entity));
  }

  const relationByName = new Map<string, DecisionGraphRelation>();
  const downstreamEdges: GraphEdge[] = [];
  const upstreamEdges: GraphEdge[] = [];
  for (const relation of graph.relations) {
    if (relationByName.has(relation.name)) {
      throw new Error(`Duplicate relation ${relation.name}`);
    }
    const fromEntity = entityByName.get(relation.fromEntity);
    const toEntity = entityByName.get(relation.toEntity);
    if (!fromEntity) {
      throw new Error(
        `Relation ${relation.name} references unknown fromEntity ${relation.fromEntity}`,
      );
    }
    if (!toEntity) {
      throw new Error(
        `Relation ${relation.name} references unknown toEntity ${relation.toEntity}`,
      );
    }
    if (relation.joinKeys.length === 0) {
      throw new Error(
        `Relation ${relation.name} requires at least one join key`,
      );
    }

    const fromKeys = entityKeysByName.get(fromEntity.name)!;
    const toKeys = entityKeysByName.get(toEntity.name)!;
    for (const joinKey of relation.joinKeys) {
      if (!fromKeys.has(joinKey.fromKey)) {
        throw new Error(
          `Relation ${relation.name} references unknown fromKey ${joinKey.fromKey}`,
        );
      }
      if (!toKeys.has(joinKey.toKey)) {
        throw new Error(
          `Relation ${relation.name} references unknown toKey ${joinKey.toKey}`,
        );
      }
    }

    relationByName.set(relation.name, relation);
    downstreamEdges.push({
      from: entityNodeId(relation.fromEntity),
      to: entityNodeId(relation.toEntity),
      relationName: relation.name,
    });
    upstreamEdges.push({
      from: entityNodeId(relation.toEntity),
      to: entityNodeId(relation.fromEntity),
      relationName: relation.name,
    });
  }

  const dimensionKeys = new Set<string>();
  for (const dimension of graph.dimensions) {
    if (dimensionKeys.has(dimension.key)) {
      throw new Error(`Duplicate dimension ${dimension.key}`);
    }
    dimensionKeys.add(dimension.key);
  }

  const horizonIds = new Set<string>();
  for (const horizon of graph.horizons) {
    if (horizonIds.has(horizon.horizonId)) {
      throw new Error(`Duplicate horizon ${horizon.horizonId}`);
    }
    if (horizon.startOffsetDays > horizon.endOffsetDays) {
      throw new Error(
        `Horizon ${horizon.horizonId} startOffsetDays must be <= endOffsetDays`,
      );
    }
    horizonIds.add(horizon.horizonId);
  }

  const metricByKey = new Map<string, DecisionGraphMetric>();
  for (const metric of graph.metrics) {
    if (metricByKey.has(metric.key)) {
      throw new Error(`Duplicate metric ${metric.key}`);
    }
    assertNonEmpty(metric.expression, `Metric ${metric.key} expression`);
    if (metric.dependsOn.length === 0) {
      throw new Error(`Metric ${metric.key} requires at least one dependency`);
    }
    assertUnique(metric.dependsOn, `Metric ${metric.key} dependencies`);

    if (metric.ownerEntity) {
      const ownerEntity = entityByName.get(metric.ownerEntity);
      if (!ownerEntity) {
        throw new Error(
          `Metric ${metric.key} references unknown ownerEntity ${metric.ownerEntity}`,
        );
      }
      if (ownerEntity.grain !== metric.grain) {
        throw new Error(
          `Metric ${metric.key} grain ${metric.grain} does not match owner entity ${metric.ownerEntity}`,
        );
      }
      downstreamEdges.push({
        from: entityNodeId(metric.ownerEntity),
        to: metricNodeId(metric.key),
      });
      upstreamEdges.push({
        from: metricNodeId(metric.key),
        to: entityNodeId(metric.ownerEntity),
      });
    }

    metricByKey.set(metric.key, metric);
  }

  for (const metric of graph.metrics) {
    for (const dependency of metric.dependsOn) {
      if (dependency === metric.key) {
        throw new Error(`Metric ${metric.key} cannot depend on itself`);
      }

      if (metricByKey.has(dependency)) {
        downstreamEdges.push({
          from: metricNodeId(dependency),
          to: metricNodeId(metric.key),
        });
        upstreamEdges.push({
          from: metricNodeId(metric.key),
          to: metricNodeId(dependency),
        });
        continue;
      }

      const entityField = parseEntityFieldReference(dependency);
      if (!entityField) {
        throw new Error(
          `Metric ${metric.key} references unknown dependency ${dependency}`,
        );
      }

      const entityKeys = entityKeysByName.get(entityField.entityName);
      if (!entityKeys?.has(entityField.fieldKey)) {
        throw new Error(
          `Metric ${metric.key} references unknown dependency ${dependency}`,
        );
      }

      downstreamEdges.push({
        from: entityNodeId(entityField.entityName),
        to: metricNodeId(metric.key),
      });
      upstreamEdges.push({
        from: metricNodeId(metric.key),
        to: entityNodeId(entityField.entityName),
      });
    }
  }

  const resolutionPairs = new Set<string>();
  for (const strategy of graph.entityResolution.strategies) {
    const entity = entityByName.get(strategy.entity);
    if (!entity) {
      throw new Error(
        `Entity resolution references unknown entity ${strategy.entity}`,
      );
    }

    const resolutionKey = `${strategy.entity}:${strategy.sourceSystem}`;
    if (resolutionPairs.has(resolutionKey)) {
      throw new Error(
        `Duplicate entity resolution strategy for ${strategy.entity} and ${strategy.sourceSystem}`,
      );
    }
    resolutionPairs.add(resolutionKey);

    const entityKeys = entityKeysByName.get(entity.name)!;
    for (const matchKey of strategy.matchKeys) {
      if (!entityKeys.has(matchKey)) {
        throw new Error(
          `Entity resolution for ${entity.name} references unknown match key ${matchKey}`,
        );
      }
    }

    if (
      strategy.confidenceThreshold != null &&
      (strategy.confidenceThreshold < 0 || strategy.confidenceThreshold > 1)
    ) {
      throw new Error(
        `Entity resolution confidenceThreshold must stay within [0,1]`,
      );
    }
  }

  assertUnique(
    graph.compatibility.backwardCompatibleWith,
    "compatibility.backwardCompatibleWith",
  );
  for (const version of graph.compatibility.backwardCompatibleWith) {
    if (version >= graph.graphVersion) {
      throw new Error(
        "compatibility.backwardCompatibleWith must reference only previous versions",
      );
    }
  }

  if (graph.changeImpact) {
    const impactedContracts = graph.changeImpact.map(
      (impact) => impact.contractId,
    );
    assertUnique(impactedContracts, "changeImpact.contractId");
  }

  return {
    entityByName,
    entityKeysByName,
    relationByName,
    metricByKey,
    dimensionKeys,
    horizonIds,
    downstreamEdges,
    upstreamEdges,
  };
}

function filterBySet<T>(
  items: readonly T[],
  values: Set<string>,
  key: (item: T) => string | undefined,
): T[] {
  if (values.size === 0) {
    return [...items];
  }
  return items.filter((item) => {
    const itemKey = key(item);
    return itemKey != null && values.has(itemKey);
  });
}

function uniqueByKey<T>(
  items: readonly T[],
  key: (item: T) => string,
): readonly T[] {
  const seen = new Set<string>();
  const uniqueItems: T[] = [];
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    uniqueItems.push(item);
  }
  return uniqueItems;
}

function collectLineage(
  graph: DecisionGraph,
  index: GraphIndex,
  query: DecisionGraphLineageQuery,
): DecisionGraphLineageResult {
  const entityNames = new Set(query.entityNames ?? []);
  const metricKeys = new Set(query.metricKeys ?? []);

  if (entityNames.size === 0 && metricKeys.size === 0) {
    throw new Error(
      "DecisionGraph lineage requires at least one entity or metric",
    );
  }

  for (const entityName of entityNames) {
    if (!index.entityByName.has(entityName)) {
      throw new Error(`Unknown entity ${entityName}`);
    }
  }
  for (const metricKey of metricKeys) {
    if (!index.metricByKey.has(metricKey)) {
      throw new Error(`Unknown metric ${metricKey}`);
    }
  }

  const direction = query.direction ?? "both";
  const maxDepth = query.maxDepth ?? Number.POSITIVE_INFINITY;
  if (
    maxDepth !== Number.POSITIVE_INFINITY &&
    (!Number.isInteger(maxDepth) || maxDepth < 1)
  ) {
    throw new Error("DecisionGraph lineage maxDepth must be an integer >= 1");
  }

  const seeds = [
    ...[...entityNames].map(entityNodeId),
    ...[...metricKeys].map(metricNodeId),
  ];
  const visited = new Set(seeds);
  const relationNames = new Set<string>();
  const queue = seeds.map((nodeId) => ({ depth: 0, nodeId }));

  const edges =
    direction === "upstream"
      ? index.upstreamEdges
      : direction === "downstream"
        ? index.downstreamEdges
        : [...index.downstreamEdges, ...index.upstreamEdges];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) {
      continue;
    }

    for (const edge of edges) {
      if (edge.from !== current.nodeId) {
        continue;
      }
      if (edge.relationName) {
        relationNames.add(edge.relationName);
      }
      if (visited.has(edge.to)) {
        continue;
      }
      visited.add(edge.to);
      queue.push({
        depth: current.depth + 1,
        nodeId: edge.to,
      });
    }
  }

  return {
    entities: graph.entities.filter((entity) =>
      visited.has(entityNodeId(entity.name)),
    ),
    metrics: graph.metrics.filter((metric) =>
      visited.has(metricNodeId(metric.key)),
    ),
    relations: graph.relations.filter((relation) =>
      relationNames.has(relation.name),
    ),
  };
}

function diffNamedRecords<T>(
  previousItems: readonly T[],
  nextItems: readonly T[],
  key: (item: T) => string,
): {
  added: readonly string[];
  removed: readonly string[];
  modified: readonly string[];
} {
  const previousMap = new Map(previousItems.map((item) => [key(item), item]));
  const nextMap = new Map(nextItems.map((item) => [key(item), item]));
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const [itemKey, nextItem] of nextMap) {
    const previousItem = previousMap.get(itemKey);
    if (!previousItem) {
      added.push(itemKey);
      continue;
    }
    if (JSON.stringify(previousItem) !== JSON.stringify(nextItem)) {
      modified.push(itemKey);
    }
  }

  for (const itemKey of previousMap.keys()) {
    if (!nextMap.has(itemKey)) {
      removed.push(itemKey);
    }
  }

  return {
    added: added.sort(),
    removed: removed.sort(),
    modified: modified.sort(),
  };
}

function summarizeHighestImpactLevel(
  levels: readonly DecisionGraphImpactLevel[],
): DecisionGraphImpactLevel | null {
  if (levels.includes("high")) {
    return "high";
  }
  if (levels.includes("medium")) {
    return "medium";
  }
  if (levels.includes("low")) {
    return "low";
  }
  return null;
}

export function canTransitionDecisionGraph(
  current: DecisionGraphStatus,
  next: DecisionGraphStatus,
): boolean {
  return DECISION_GRAPH_TRANSITIONS[current].includes(next);
}

export function assertDecisionGraphIntegrity(graph: DecisionGraph): void {
  buildGraphIndex(graph);
}

export function queryDecisionGraph(
  graph: DecisionGraph,
  query: DecisionGraphQuery,
): DecisionGraphQueryResult {
  const index = buildGraphIndex(graph);
  if (query.pack && !graph.supportedPacks.includes(query.pack)) {
    throw new Error(
      `DecisionGraph ${graph.graphId} does not support pack ${query.pack}`,
    );
  }

  const entityNames = new Set(query.entityNames ?? []);
  const relationNames = new Set(query.relationNames ?? []);
  const relationTypes = new Set(query.relationTypes ?? []);
  const metricKeys = new Set(query.metricKeys ?? []);
  const metricOwnerEntities = new Set(query.metricOwnerEntities ?? []);
  const dimensionKeys = new Set(query.dimensionKeys ?? []);
  const horizonIds = new Set(query.horizonIds ?? []);
  const grains = new Set(query.grains ?? []);

  for (const entityName of entityNames) {
    if (!index.entityByName.has(entityName)) {
      throw new Error(`Unknown entity ${entityName}`);
    }
  }
  for (const metricKey of metricKeys) {
    if (!index.metricByKey.has(metricKey)) {
      throw new Error(`Unknown metric ${metricKey}`);
    }
  }
  for (const ownerEntity of metricOwnerEntities) {
    if (!index.entityByName.has(ownerEntity)) {
      throw new Error(`Unknown metric owner entity ${ownerEntity}`);
    }
  }
  for (const relationName of relationNames) {
    if (!index.relationByName.has(relationName)) {
      throw new Error(`Unknown relation ${relationName}`);
    }
  }
  for (const dimensionKey of dimensionKeys) {
    if (!index.dimensionKeys.has(dimensionKey)) {
      throw new Error(`Unknown dimension ${dimensionKey}`);
    }
  }
  for (const horizonId of horizonIds) {
    if (!index.horizonIds.has(horizonId)) {
      throw new Error(`Unknown horizon ${horizonId}`);
    }
  }

  let entities = graph.entities.filter((entity) => {
    if (entityNames.size > 0 && !entityNames.has(entity.name)) {
      return false;
    }
    if (grains.size > 0 && !grains.has(entity.grain)) {
      return false;
    }
    return true;
  });

  const hasExplicitRelationFilters =
    relationNames.size > 0 || relationTypes.size > 0;
  let relations =
    hasExplicitRelationFilters ||
    (!query.includeConnectedRelations && entities.length === 0)
      ? graph.relations.filter((relation) => {
          if (relationNames.size > 0 && !relationNames.has(relation.name)) {
            return false;
          }
          if (
            relationTypes.size > 0 &&
            (!relation.relationType ||
              !relationTypes.has(relation.relationType))
          ) {
            return false;
          }
          return true;
        })
      : [];

  if (query.includeConnectedRelations && entities.length > 0) {
    const selectedEntityNames = new Set(entities.map((entity) => entity.name));
    relations = [
      ...relations,
      ...graph.relations.filter(
        (relation) =>
          selectedEntityNames.has(relation.fromEntity) ||
          selectedEntityNames.has(relation.toEntity),
      ),
    ];
    relations = [...uniqueByKey(relations, (relation) => relation.name)];
  }

  if (query.includeConnectedEntities && relations.length > 0) {
    const relatedEntityNames = new Set(entities.map((entity) => entity.name));
    for (const relation of relations) {
      relatedEntityNames.add(relation.fromEntity);
      relatedEntityNames.add(relation.toEntity);
    }
    entities = graph.entities.filter((entity) =>
      relatedEntityNames.has(entity.name),
    );
  }

  const selectedEntityNames = new Set(entities.map((entity) => entity.name));
  let metrics = graph.metrics.filter((metric) => {
    if (metricKeys.size > 0 && !metricKeys.has(metric.key)) {
      return false;
    }
    if (
      metricOwnerEntities.size > 0 &&
      (!metric.ownerEntity || !metricOwnerEntities.has(metric.ownerEntity))
    ) {
      return false;
    }
    if (grains.size > 0 && !grains.has(metric.grain)) {
      return false;
    }
    if (
      metricKeys.size === 0 &&
      metricOwnerEntities.size === 0 &&
      selectedEntityNames.size > 0 &&
      metric.ownerEntity &&
      !selectedEntityNames.has(metric.ownerEntity)
    ) {
      return false;
    }
    return true;
  });

  if (query.includeConnectedEntities && metrics.length > 0) {
    const expandedEntityNames = new Set(selectedEntityNames);
    for (const metric of metrics) {
      if (metric.ownerEntity) {
        expandedEntityNames.add(metric.ownerEntity);
      }
      for (const dependency of metric.dependsOn) {
        const entityField = parseEntityFieldReference(dependency);
        if (entityField) {
          expandedEntityNames.add(entityField.entityName);
        }
      }
    }
    entities = graph.entities.filter((entity) =>
      expandedEntityNames.has(entity.name),
    );
  }

  return {
    entities,
    relations,
    metrics,
    dimensions: filterBySet(
      graph.dimensions,
      dimensionKeys,
      (dimension) => dimension.key,
    ),
    horizons: filterBySet(
      graph.horizons,
      horizonIds,
      (horizon) => horizon.horizonId,
    ),
  };
}

export function getDecisionGraphLineage(
  graph: DecisionGraph,
  query: DecisionGraphLineageQuery,
): DecisionGraphLineageResult {
  return collectLineage(graph, buildGraphIndex(graph), query);
}

export function computeDecisionGraphChangeImpact(
  previousGraph: DecisionGraph,
  nextGraph: DecisionGraph,
): DecisionGraphChangeAnalysis {
  const previousIndex = buildGraphIndex(previousGraph);
  const nextIndex = buildGraphIndex(nextGraph);

  if (previousGraph.graphId !== nextGraph.graphId) {
    throw new Error("DecisionGraph change impact requires matching graphId");
  }
  if (nextGraph.graphVersion <= previousGraph.graphVersion) {
    throw new Error(
      "DecisionGraph change impact requires a strictly newer next graph version",
    );
  }

  const entityDiff = diffNamedRecords(
    previousGraph.entities,
    nextGraph.entities,
    (entity) => entity.name,
  );
  const relationDiff = diffNamedRecords(
    previousGraph.relations,
    nextGraph.relations,
    (relation) => relation.name,
  );
  const metricDiff = diffNamedRecords(
    previousGraph.metrics,
    nextGraph.metrics,
    (metric) => metric.key,
  );

  const impactedEntities = new Set<string>([
    ...entityDiff.added,
    ...entityDiff.removed,
    ...entityDiff.modified,
  ]);
  const impactedMetrics = new Set<string>([
    ...metricDiff.added,
    ...metricDiff.removed,
    ...metricDiff.modified,
  ]);
  const impactedRelations = new Set<string>([
    ...relationDiff.added,
    ...relationDiff.removed,
    ...relationDiff.modified,
  ]);

  for (const relationName of [
    ...relationDiff.added,
    ...relationDiff.modified,
  ]) {
    const relation = nextIndex.relationByName.get(relationName);
    if (!relation) {
      continue;
    }
    impactedEntities.add(relation.fromEntity);
    impactedEntities.add(relation.toEntity);
  }

  for (const relationName of [
    ...relationDiff.removed,
    ...relationDiff.modified,
  ]) {
    const relation = previousIndex.relationByName.get(relationName);
    if (!relation) {
      continue;
    }
    impactedEntities.add(relation.fromEntity);
    impactedEntities.add(relation.toEntity);
  }

  for (const metricKey of [...metricDiff.added, ...metricDiff.modified]) {
    const metric = nextIndex.metricByKey.get(metricKey);
    if (metric?.ownerEntity) {
      impactedEntities.add(metric.ownerEntity);
    }
  }

  for (const metricKey of [...metricDiff.removed, ...metricDiff.modified]) {
    const metric = previousIndex.metricByKey.get(metricKey);
    if (metric?.ownerEntity) {
      impactedEntities.add(metric.ownerEntity);
    }
  }

  for (const graphCandidate of [previousGraph, nextGraph]) {
    const graphIndex =
      graphCandidate === previousGraph ? previousIndex : nextIndex;

    for (const entityName of [...impactedEntities]) {
      if (!graphIndex.entityByName.has(entityName)) {
        continue;
      }
      const lineage = collectLineage(graphCandidate, graphIndex, {
        direction: "both",
        entityNames: [entityName],
      });
      for (const entity of lineage.entities) {
        impactedEntities.add(entity.name);
      }
      for (const metric of lineage.metrics) {
        impactedMetrics.add(metric.key);
      }
      for (const relation of lineage.relations) {
        impactedRelations.add(relation.name);
      }
    }

    for (const metricKey of [...impactedMetrics]) {
      if (!graphIndex.metricByKey.has(metricKey)) {
        continue;
      }
      const lineage = collectLineage(graphCandidate, graphIndex, {
        direction: "both",
        metricKeys: [metricKey],
      });
      for (const entity of lineage.entities) {
        impactedEntities.add(entity.name);
      }
      for (const metric of lineage.metrics) {
        impactedMetrics.add(metric.key);
      }
      for (const relation of lineage.relations) {
        impactedRelations.add(relation.name);
      }
    }
  }

  const hasStructuralChange =
    impactedEntities.size > 0 ||
    impactedMetrics.size > 0 ||
    impactedRelations.size > 0;
  const contractImpacts = hasStructuralChange
    ? [...(nextGraph.changeImpact ?? [])]
    : [];

  return {
    diff: {
      addedEntities: entityDiff.added,
      removedEntities: entityDiff.removed,
      modifiedEntities: entityDiff.modified,
      addedRelations: relationDiff.added,
      removedRelations: relationDiff.removed,
      modifiedRelations: relationDiff.modified,
      addedMetrics: metricDiff.added,
      removedMetrics: metricDiff.removed,
      modifiedMetrics: metricDiff.modified,
    },
    impactedEntities: [...impactedEntities].sort(),
    impactedMetrics: [...impactedMetrics].sort(),
    impactedRelations: [...impactedRelations].sort(),
    contractImpacts,
    highestImpactLevel: summarizeHighestImpactLevel(
      contractImpacts.map((impact) => impact.impactLevel),
    ),
  };
}
