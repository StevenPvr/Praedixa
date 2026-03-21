import { setTimeout as delay } from "node:timers/promises";

import type {
  BlockerRef,
  GraphqlResponse,
  IssueRecord,
  TrackerConfig,
} from "./types.js";
import { coerceString, normalizeStateName } from "./utils.js";

const DEFAULT_PAGE_SIZE = 50;
const REQUEST_TIMEOUT_MS = 30_000;

interface LinearGraphqlClientOptions {
  tracker: TrackerConfig;
  fetchImpl?: typeof fetch;
}

interface RelationMetadata {
  inverseRelationsAvailable: boolean;
  targetFields: string[];
}

function normalizePriority(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function normalizeLabels(value: unknown): string[] {
  if (
    value == null ||
    typeof value !== "object" ||
    !Array.isArray((value as { nodes?: unknown[] }).nodes)
  ) {
    return [];
  }

  return (value as { nodes: unknown[] }).nodes
    .map((label) =>
      typeof label === "object" && label != null
        ? coerceString((label as { name?: unknown }).name)
        : null,
    )
    .filter((label): label is string => label != null)
    .map((label) => label.toLowerCase());
}

function pickRelationIssue(
  issue: { id: string; identifier: string },
  relation: Record<string, unknown>,
  targetFields: string[],
): BlockerRef | null {
  for (const field of targetFields) {
    const candidate = relation[field];
    if (candidate == null || typeof candidate !== "object") {
      continue;
    }
    const candidateRecord = candidate as {
      id?: unknown;
      identifier?: unknown;
      state?: { name?: unknown } | null;
    };
    const candidateId = coerceString(candidateRecord.id) ?? null;
    const candidateIdentifier =
      coerceString(candidateRecord.identifier) ?? null;
    if (candidateId === issue.id || candidateIdentifier === issue.identifier) {
      continue;
    }
    return {
      id: candidateId,
      identifier: candidateIdentifier,
      state:
        candidateRecord.state != null &&
        typeof candidateRecord.state === "object" &&
        "name" in candidateRecord.state
          ? (coerceString(candidateRecord.state.name) ?? null)
          : null,
    };
  }
  return null;
}

function normalizeBlockedBy(
  rawIssue: Record<string, unknown>,
  issue: { id: string; identifier: string },
  relationMetadata: RelationMetadata,
): BlockerRef[] {
  if (!relationMetadata.inverseRelationsAvailable) {
    return [];
  }

  const inverseRelations = rawIssue.inverseRelations;
  if (
    inverseRelations == null ||
    typeof inverseRelations !== "object" ||
    !Array.isArray((inverseRelations as { nodes?: unknown[] }).nodes)
  ) {
    return [];
  }

  const blockers: BlockerRef[] = [];
  for (const node of (inverseRelations as { nodes: unknown[] }).nodes) {
    if (node == null || typeof node !== "object") {
      continue;
    }
    const relation = node as Record<string, unknown>;
    const relationType = coerceString(relation.type);
    if (relationType == null || normalizeStateName(relationType) !== "blocks") {
      continue;
    }
    const blocker = pickRelationIssue(
      issue,
      relation,
      relationMetadata.targetFields,
    );
    if (blocker != null) {
      blockers.push(blocker);
    }
  }

  return blockers;
}

function normalizeIssue(
  rawIssue: Record<string, unknown>,
  relationMetadata: RelationMetadata,
): IssueRecord {
  const id = coerceString(rawIssue.id);
  const identifier = coerceString(rawIssue.identifier);
  const title = coerceString(rawIssue.title);
  const state =
    rawIssue.state != null &&
    typeof rawIssue.state === "object" &&
    "name" in rawIssue.state
      ? coerceString(rawIssue.state.name)
      : null;

  if (id == null || identifier == null || title == null || state == null) {
    throw new Error("linear_unknown_payload");
  }

  const issueIdentity = { id, identifier };

  return {
    id,
    identifier,
    title,
    description: coerceString(rawIssue.description),
    priority: normalizePriority(rawIssue.priority),
    state,
    branchName: coerceString(rawIssue.branchName),
    url: coerceString(rawIssue.url),
    labels: normalizeLabels(rawIssue.labels),
    blockedBy: normalizeBlockedBy(rawIssue, issueIdentity, relationMetadata),
    createdAt: coerceString(rawIssue.createdAt),
    updatedAt: coerceString(rawIssue.updatedAt),
  };
}

function buildIssueSelection(relationMetadata: RelationMetadata): string {
  const relationSelection = relationMetadata.inverseRelationsAvailable
    ? `inverseRelations {
        nodes {
          id
          type
          ${relationMetadata.targetFields.includes("issue") ? "issue { id identifier state { name } }" : ""}
          ${
            relationMetadata.targetFields.includes("relatedIssue")
              ? "relatedIssue { id identifier state { name } }"
              : ""
          }
        }
      }`
    : "";

  return `
    id
    identifier
    title
    description
    priority
    branchName
    url
    createdAt
    updatedAt
    state { name }
    labels { nodes { name } }
    ${relationSelection}
  `;
}

export class LinearClient {
  private readonly fetchImpl: typeof fetch;

  private relationMetadata: RelationMetadata | null = null;

  private tracker: TrackerConfig;

  constructor(private readonly options: LinearGraphqlClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.tracker = options.tracker;
  }

  updateTrackerConfig(tracker: TrackerConfig): void {
    this.tracker = tracker;
  }

  async fetchCandidateIssues(): Promise<IssueRecord[]> {
    const relationMetadata = await this.getRelationMetadata();
    return await this.fetchIssuesWithStates(
      this.tracker.activeStates,
      relationMetadata,
    );
  }

  async fetchIssuesByStates(stateNames: string[]): Promise<IssueRecord[]> {
    if (stateNames.length === 0) {
      return [];
    }
    const relationMetadata = await this.getRelationMetadata();
    return await this.fetchIssuesWithStates(stateNames, relationMetadata);
  }

  async fetchIssueStatesByIds(issueIds: string[]): Promise<IssueRecord[]> {
    if (issueIds.length === 0) {
      return [];
    }

    const query = `
      query SymphonyIssueStates($ids: [ID!], $projectSlug: String!, $first: Int!) {
        issues(
          first: $first
          filter: {
            id: { in: $ids }
            project: { slugId: { eq: $projectSlug } }
          }
        ) {
          nodes {
            id
            identifier
            title
            description
            priority
            branchName
            url
            createdAt
            updatedAt
            state { name }
            labels { nodes { name } }
          }
        }
      }
    `;

    const data = await this.executeGraphql<{
      issues?: { nodes?: Record<string, unknown>[] };
    }>(query, {
      ids: issueIds,
      projectSlug: this.tracker.projectSlug,
      first: issueIds.length,
    });

    const nodes = data.issues?.nodes ?? [];
    return nodes.map((node) =>
      normalizeIssue(node, {
        inverseRelationsAvailable: false,
        targetFields: [],
      }),
    );
  }

  async executeRawGraphql<TData>(
    query: string,
    variables: Record<string, unknown> | null,
  ): Promise<GraphqlResponse<TData>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await this.fetchImpl(this.tracker.endpoint, {
        method: "POST",
        headers: {
          authorization: this.tracker.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: variables ?? {},
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`linear_api_status:${response.status}`);
      }

      return (await response.json()) as GraphqlResponse<TData>;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("linear_api_status:")
      ) {
        throw error;
      }
      throw new Error(
        error instanceof Error
          ? `linear_api_request:${error.message}`
          : "linear_api_request",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchIssuesWithStates(
    stateNames: string[],
    relationMetadata: RelationMetadata,
  ): Promise<IssueRecord[]> {
    const query = `
      query SymphonyIssues(
        $projectSlug: String!
        $stateNames: [String!]
        $first: Int!
        $after: String
      ) {
        issues(
          first: $first
          after: $after
          filter: {
            project: { slugId: { eq: $projectSlug } }
            state: { name: { in: $stateNames } }
          }
        ) {
          nodes {
            ${buildIssueSelection(relationMetadata)}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const issues: IssueRecord[] = [];
    let after: string | null = null;

    while (true) {
      const data: {
        issues?: {
          nodes?: Record<string, unknown>[];
          pageInfo?: {
            hasNextPage?: boolean;
            endCursor?: string | null;
          };
        };
      } = await this.executeGraphql<{
        issues?: {
          nodes?: Record<string, unknown>[];
          pageInfo?: {
            hasNextPage?: boolean;
            endCursor?: string | null;
          };
        };
      }>(query, {
        projectSlug: this.tracker.projectSlug,
        stateNames,
        first: DEFAULT_PAGE_SIZE,
        after,
      });

      const nodes: Record<string, unknown>[] = data.issues?.nodes ?? [];
      issues.push(
        ...nodes.map((node: Record<string, unknown>) =>
          normalizeIssue(node, relationMetadata),
        ),
      );

      const pageInfo:
        | { hasNextPage?: boolean; endCursor?: string | null }
        | undefined = data.issues?.pageInfo;
      if (!pageInfo?.hasNextPage) {
        return issues;
      }
      if (coerceString(pageInfo.endCursor) == null) {
        throw new Error("linear_missing_end_cursor");
      }
      after = pageInfo.endCursor ?? null;
      await delay(0);
    }
  }

  private async executeGraphql<TData>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<TData> {
    const payload = await this.executeRawGraphql<TData>(query, variables);
    if (payload.errors != null && payload.errors.length > 0) {
      throw new Error("linear_graphql_errors");
    }
    if (payload.data == null) {
      throw new Error("linear_unknown_payload");
    }
    return payload.data;
  }

  private async getRelationMetadata(): Promise<RelationMetadata> {
    if (this.relationMetadata != null) {
      return this.relationMetadata;
    }

    const query = `
      query SymphonyIssueRelationIntrospection {
        issueType: __type(name: "Issue") {
          fields {
            name
          }
        }
        issueRelationType: __type(name: "IssueRelation") {
          fields {
            name
          }
        }
      }
    `;

    try {
      const data = await this.executeGraphql<{
        issueType?: { fields?: Array<{ name?: string | null }> };
        issueRelationType?: { fields?: Array<{ name?: string | null }> };
      }>(query, {});

      const issueFields = new Set(
        (data.issueType?.fields ?? [])
          .map((field) => coerceString(field.name))
          .filter((name): name is string => name != null),
      );
      const relationFields = new Set(
        (data.issueRelationType?.fields ?? [])
          .map((field) => coerceString(field.name))
          .filter((name): name is string => name != null),
      );

      this.relationMetadata = {
        inverseRelationsAvailable: issueFields.has("inverseRelations"),
        targetFields: ["issue", "relatedIssue"].filter((field) =>
          relationFields.has(field),
        ),
      };
    } catch {
      this.relationMetadata = {
        inverseRelationsAvailable: false,
        targetFields: [],
      };
    }

    return this.relationMetadata;
  }
}
