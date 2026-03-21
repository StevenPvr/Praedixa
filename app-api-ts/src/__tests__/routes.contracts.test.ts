import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DecisionContractStudioDetailResponse,
  DecisionContractStudioForkDraftResponse,
  DecisionContractStudioRollbackCandidateResponse,
} from "@praedixa/shared-types/api";

import { routes } from "../routes.js";
import { getAdminBackofficeService } from "../services/admin-backoffice.js";
import { closeDecisionContractRuntimeService } from "../services/decision-contract-runtime.js";
import type { RouteContext, RouteDefinition } from "../types.js";

const PRODUCT_ORG_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_HOME_ORG_ID = "22222222-2222-4222-8222-222222222222";
const TARGET_ORG_ID = "33333333-3333-4333-8333-333333333333";
const COMPATIBILITY_CONTRACT = {
  kind: "DecisionContract",
  schemaVersion: "1.0.0",
  contractId: "coverage-core",
  contractVersion: 2,
  name: "Coverage core",
  pack: "coverage",
  status: "testing",
  graphRef: { graphId: "coverage-graph", graphVersion: 2 },
  scope: {
    entityType: "site",
    selector: { mode: "all" },
    horizonId: "J+7",
  },
  inputs: [
    {
      key: "coverage_gap_h",
      entity: "Site",
      attribute: "coverage_gap_h",
      required: true,
    },
  ],
  objective: { metricKey: "service_level_pct", direction: "maximize" },
  decisionVariables: [
    {
      key: "overtime_hours",
      label: "Overtime hours",
      domain: { kind: "number", min: 0 },
    },
  ],
  hardConstraints: [{ key: "labor_rest", expression: "rest_hours >= 11" }],
  softConstraints: [],
  approvals: [
    {
      ruleId: "ops_review",
      approverRole: "ops_manager",
      minStepOrder: 1,
      thresholdKey: "service_level_pct",
    },
  ],
  actions: [
    {
      actionType: "schedule.adjust",
      destinationType: "wfm.shift",
      templateId: "wfm.shift.schedule_adjust",
    },
  ],
  policyHooks: [],
  roiFormula: {
    currency: "EUR",
    estimatedExpression: "recommended - baseline",
    components: [
      {
        key: "labor_delta",
        label: "Labor delta",
        kind: "benefit",
        expression: "recommended - baseline",
      },
    ],
  },
  explanationTemplate: {
    summaryTemplate: "{{top_driver}}",
    topDriverKeys: ["coverage_gap_h"],
    bindingConstraintKeys: ["labor_rest"],
  },
  validation: {
    status: "passed",
    checkedAt: "2026-03-13T09:00:00.000Z",
    issues: [],
  },
  audit: {
    createdBy: "11111111-1111-4111-8111-111111111111",
    createdAt: "2026-03-13T08:00:00.000Z",
    updatedBy: "11111111-1111-4111-8111-111111111111",
    updatedAt: "2026-03-13T08:30:00.000Z",
    changeReason: "Initial contract",
    previousVersion: 1,
  },
} as const;
const COMPATIBILITY_GRAPH = {
  kind: "DecisionGraph",
  schemaVersion: "1.0.0",
  graphId: "coverage-graph",
  graphVersion: 2,
  name: "Coverage graph",
  status: "testing",
  canonicalModelVersion: "1.2.0",
  supportedPacks: ["coverage", "core"],
  entities: [
    {
      name: "Site",
      label: "Site",
      grain: "site",
      identifiers: ["site_code"],
      attributes: [
        { key: "coverage_gap_h", valueType: "number", nullable: false },
      ],
      sourceBindings: [{ sourceSystem: "wms", field: "coverage_gap_h" }],
    },
  ],
  relations: [],
  metrics: [
    {
      key: "service_level_pct",
      label: "Service level",
      grain: "site",
      ownerEntity: "Site",
      valueType: "number",
      expression: "served / planned",
      dependsOn: ["Site.coverage_gap_h"],
      snapshotPolicy: "recomputable",
      timeHorizonRequired: true,
    },
  ],
  dimensions: [],
  horizons: [
    {
      horizonId: "J+7",
      label: "J+7",
      startOffsetDays: 0,
      endOffsetDays: 7,
      snapshotMode: "rolling_window",
    },
  ],
  entityResolution: {
    duplicatePolicy: "fail",
    strategies: [
      {
        entity: "Site",
        sourceSystem: "wms",
        matchKeys: ["site_code"],
        confidenceThreshold: 1,
      },
    ],
  },
  compatibility: {
    backwardCompatibleWith: [1],
    breakingChange: false,
  },
  audit: {
    createdAt: "2026-03-13T08:00:00.000Z",
    createdBy: "11111111-1111-4111-8111-111111111111",
    changeReason: "Initial graph",
  },
} as const;

function findRoute(
  method: "GET" | "POST" | "PATCH",
  template: string,
): RouteDefinition {
  const route = routes.find(
    (entry) => entry.method === method && entry.template === template,
  );
  if (route == null) {
    throw new Error(`Route not found: ${method} ${template}`);
  }
  return route;
}

function makeContext(
  method: "GET" | "POST" | "PATCH",
  path: string,
  query = "",
): RouteContext {
  return {
    method,
    path,
    query: new URLSearchParams(query),
    requestId: "req-test",
    telemetry: {
      requestId: "req-test",
      traceId: "trace-test",
      traceparent: null,
      tracestate: null,
      runId: null,
      connectorRunId: null,
      actionId: null,
      contractVersion: null,
      organizationId: PRODUCT_ORG_ID,
      siteId: "site-lyon",
    },
    clientIp: "127.0.0.1",
    userAgent: "vitest",
    params: {},
    body: null,
    user: {
      userId: "user-test",
      email: "viewer@client.example",
      organizationId: PRODUCT_ORG_ID,
      role: "viewer",
      siteIds: ["site-lyon"],
      permissions: [],
    },
  };
}

function makeAdminContext(
  method: "GET" | "POST" | "PATCH",
  path: string,
  query = "",
): RouteContext {
  return {
    ...makeContext(method, path, query),
    user: {
      userId: "admin-test",
      email: "admin@praedixa.com",
      organizationId: ADMIN_HOME_ORG_ID,
      role: "super_admin",
      siteIds: [],
      permissions: ["admin:org:write", "shift.write"],
    },
  };
}

const originalDemoMode = process.env.DEMO_MODE;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalConnectorsRuntimeUrl = process.env.CONNECTORS_RUNTIME_URL;
const originalConnectorsRuntimeToken = process.env.CONNECTORS_RUNTIME_TOKEN;

beforeEach(() => {
  delete process.env.DEMO_MODE;
  delete process.env.DATABASE_URL;
  delete process.env.CONNECTORS_RUNTIME_URL;
  delete process.env.CONNECTORS_RUNTIME_TOKEN;
});

afterEach(() => {
  vi.unstubAllGlobals();

  if (originalDemoMode == null) {
    delete process.env.DEMO_MODE;
  } else {
    process.env.DEMO_MODE = originalDemoMode;
  }

  if (originalDatabaseUrl == null) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }

  if (originalConnectorsRuntimeUrl == null) {
    delete process.env.CONNECTORS_RUNTIME_URL;
  } else {
    process.env.CONNECTORS_RUNTIME_URL = originalConnectorsRuntimeUrl;
  }

  if (originalConnectorsRuntimeToken == null) {
    delete process.env.CONNECTORS_RUNTIME_TOKEN;
  } else {
    process.env.CONNECTORS_RUNTIME_TOKEN = originalConnectorsRuntimeToken;
  }
});

afterEach(async () => {
  await closeDecisionContractRuntimeService();
});

describe("route contracts", () => {
  it("keeps the public contact request endpoint functional without persistence", async () => {
    const route = findRoute("POST", "/api/v1/public/contact-requests");

    const invalidResult = await route.handler({
      ...makeContext("POST", "/api/v1/public/contact-requests"),
      user: null,
      body: {
        companyName: "Acme Logistics",
        email: "invalid-email",
        message: "trop court",
        consent: false,
      },
    });
    expect(invalidResult.statusCode).toBe(422);

    const validResult = await route.handler({
      ...makeContext("POST", "/api/v1/public/contact-requests"),
      user: null,
      body: {
        companyName: "Acme Logistics",
        firstName: "Alice",
        lastName: "Martin",
        role: "Operations Director",
        email: "ops@acme.test",
        message:
          "Nous souhaitons organiser un audit historique du staffing sur deux sites pilotes pour valider le ROI.",
        consent: true,
      },
    });

    expect(validResult.statusCode).toBe(201);
    expect(validResult.payload.success).toBe(true);
  });

  it("keeps live decision config available because it has an explicit non-demo implementation", async () => {
    const route = findRoute("GET", "/api/v1/live/decision-config");
    const result = await route.handler(
      makeContext("GET", "/api/v1/live/decision-config"),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload.data).toEqual(
      expect.objectContaining({
        payload: expect.any(Object),
      }),
    );
  });

  it("keeps the admin root alive without opening a demo data path", async () => {
    const route = findRoute("GET", "/api/v1/admin");
    const result = await route.handler(
      makeAdminContext("GET", "/api/v1/admin"),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload.data).toMatchObject({
      status: "ok",
      modules: expect.any(Array),
    });
  });

  it("exposes decision contract templates without requiring persistence", async () => {
    const route = findRoute("GET", "/api/v1/admin/decision-contract-templates");
    const result = await route.handler(
      makeAdminContext(
        "GET",
        "/api/v1/admin/decision-contract-templates",
        "pack=coverage",
      ),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload.data).toMatchObject({
      total: expect.any(Number),
      items: expect.arrayContaining([
        expect.objectContaining({
          pack: "coverage",
          templateId: expect.any(String),
        }),
      ]),
    });
  });

  it("exposes decision contract template preview and compatibility evaluation routes", async () => {
    const previewRoute = findRoute(
      "POST",
      "/api/v1/admin/decision-contract-templates/instantiate-preview",
    );
    const previewContext = makeAdminContext(
      "POST",
      "/api/v1/admin/decision-contract-templates/instantiate-preview",
    );
    previewContext.body = {
      templateId: "coverage.site.standard",
      templateVersion: 2,
      contractId: "preview-coverage-core",
      name: "Coverage preview",
      tags: ["coverage", "preview"],
    };

    const previewResult = await previewRoute.handler(previewContext);
    expect(previewResult.statusCode).toBe(200);
    expect(previewResult.payload.success).toBe(true);
    if (!previewResult.payload.success) {
      throw new Error("expected success payload");
    }
    expect(previewResult.payload.data).toMatchObject({
      template: expect.objectContaining({
        templateId: "coverage.site.standard",
      }),
      contract: expect.objectContaining({
        kind: "DecisionContract",
        contractId: "preview-coverage-core",
      }),
    });

    const compatibilityRoute = findRoute(
      "POST",
      "/api/v1/admin/decision-compatibility/evaluate",
    );
    const compatibilityContext = makeAdminContext(
      "POST",
      "/api/v1/admin/decision-compatibility/evaluate",
    );
    compatibilityContext.body = {
      contract: COMPATIBILITY_CONTRACT,
      graph: COMPATIBILITY_GRAPH,
      versionAssumptions: {
        expectedGraphVersion: 2,
        expectedCanonicalModelVersion: "1.2.0",
      },
      eventAssumptions: {
        requiredSourceSystems: ["wms"],
      },
    };

    const compatibilityResult =
      await compatibilityRoute.handler(compatibilityContext);
    expect(compatibilityResult.statusCode).toBe(200);
    expect(compatibilityResult.payload.success).toBe(true);
    if (!compatibilityResult.payload.success) {
      throw new Error("expected success payload");
    }
    expect(compatibilityResult.payload.data).toMatchObject({
      compatible: true,
      blockingIssueCount: 0,
      warningCount: 0,
    });
  });

  it("exposes persistent decision contract studio routes through the admin surface", async () => {
    const saveRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/decision-contracts",
    );
    const saveContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/decision-contracts`,
    );
    saveContext.params = { orgId: TARGET_ORG_ID };
    saveContext.user = {
      ...saveContext.user!,
      userId: "designer-1",
    };
    saveContext.body = {
      templateId: "coverage.site.standard",
      templateVersion: 2,
      contractId: "coverage-core",
      name: "Coverage core",
      reason: "initial_draft",
    };

    const saveResult = await saveRoute.handler(saveContext);
    expect(saveResult.statusCode).toBe(201);
    expect(saveResult.payload.success).toBe(true);
    if (!saveResult.payload.success) {
      throw new Error("expected success payload");
    }
    const saveData = saveResult.payload
      .data as DecisionContractStudioDetailResponse;
    expect(saveData.contract).toMatchObject({
      contractId: "coverage-core",
      contractVersion: 1,
      status: "draft",
    });

    const transitionRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/transition",
    );
    const testingContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/decision-contracts/coverage-core/versions/1/transition`,
    );
    testingContext.params = {
      orgId: TARGET_ORG_ID,
      contractId: "coverage-core",
      contractVersion: "1",
    };
    testingContext.user = {
      ...testingContext.user!,
      userId: "designer-1",
    };
    testingContext.body = {
      transition: "submit_for_testing",
      reason: "testing_gate",
    };

    const testingResult = await transitionRoute.handler(testingContext);
    expect(testingResult.statusCode).toBe(200);
    expect(testingResult.payload.success).toBe(true);

    const approveContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/decision-contracts/coverage-core/versions/1/transition`,
    );
    approveContext.params = {
      orgId: TARGET_ORG_ID,
      contractId: "coverage-core",
      contractVersion: "1",
    };
    approveContext.user = {
      ...approveContext.user!,
      userId: "reviewer-1",
    };
    approveContext.body = {
      transition: "approve",
      reason: "approval_gate",
    };

    const approveResult = await transitionRoute.handler(approveContext);
    expect(approveResult.statusCode).toBe(200);
    expect(approveResult.payload.success).toBe(true);

    const publishContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/decision-contracts/coverage-core/versions/1/transition`,
    );
    publishContext.params = {
      orgId: TARGET_ORG_ID,
      contractId: "coverage-core",
      contractVersion: "1",
    };
    publishContext.user = {
      ...publishContext.user!,
      userId: "publisher-1",
    };
    publishContext.body = {
      transition: "publish",
      reason: "publish_gate",
    };

    const publishResult = await transitionRoute.handler(publishContext);
    expect(publishResult.statusCode).toBe(200);
    expect(publishResult.payload.success).toBe(true);
    if (!publishResult.payload.success) {
      throw new Error("expected success payload");
    }
    const publishData = publishResult.payload
      .data as DecisionContractStudioDetailResponse;
    expect(publishData.contract.status).toBe("published");

    const forkRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/fork",
    );
    const forkContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/decision-contracts/coverage-core/versions/1/fork`,
    );
    forkContext.params = {
      orgId: TARGET_ORG_ID,
      contractId: "coverage-core",
      contractVersion: "1",
    };
    forkContext.user = {
      ...forkContext.user!,
      userId: "designer-2",
    };
    forkContext.body = {
      reason: "iter_v2",
      name: "Coverage core v2",
    };

    const forkResult = await forkRoute.handler(forkContext);
    expect(forkResult.statusCode).toBe(201);
    expect(forkResult.payload.success).toBe(true);
    if (!forkResult.payload.success) {
      throw new Error("expected success payload");
    }
    const forkData = forkResult.payload
      .data as DecisionContractStudioForkDraftResponse;
    expect(forkData.draftContract).toMatchObject({
      contractVersion: 2,
      status: "draft",
    });

    const candidatesRoute = findRoute(
      "GET",
      "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/rollback-candidates",
    );
    const candidatesContext = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/decision-contracts/coverage-core/versions/2/rollback-candidates`,
    );
    candidatesContext.params = {
      orgId: TARGET_ORG_ID,
      contractId: "coverage-core",
      contractVersion: "2",
    };

    const candidatesResult = await candidatesRoute.handler(candidatesContext);
    expect(candidatesResult.statusCode).toBe(200);
    expect(candidatesResult.payload.success).toBe(true);
    if (!candidatesResult.payload.success) {
      throw new Error("expected success payload");
    }
    const candidatesData = candidatesResult.payload
      .data as DecisionContractStudioRollbackCandidateResponse;
    expect(
      candidatesData.candidates.map((candidate) => candidate.contractVersion),
    ).toEqual([1]);

    const rollbackRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/rollback",
    );
    const rollbackContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/decision-contracts/coverage-core/versions/2/rollback`,
    );
    rollbackContext.params = {
      orgId: TARGET_ORG_ID,
      contractId: "coverage-core",
      contractVersion: "2",
    };
    rollbackContext.user = {
      ...rollbackContext.user!,
      userId: "rollback-1",
    };
    rollbackContext.body = {
      targetVersion: 1,
      reason: "rollback_after_regression",
    };

    const rollbackResult = await rollbackRoute.handler(rollbackContext);
    expect(rollbackResult.statusCode).toBe(201);
    expect(rollbackResult.payload.success).toBe(true);
    if (!rollbackResult.payload.success) {
      throw new Error("expected success payload");
    }
    const rollbackData = rollbackResult.payload
      .data as DecisionContractStudioForkDraftResponse;
    expect(rollbackData.draftContract).toMatchObject({
      contractVersion: 3,
      status: "draft",
    });

    const detailRoute = findRoute(
      "GET",
      "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion",
    );
    const detailContext = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/decision-contracts/coverage-core/versions/3`,
      "compare_to_version=1",
    );
    detailContext.params = {
      orgId: TARGET_ORG_ID,
      contractId: "coverage-core",
      contractVersion: "3",
    };

    const detailResult = await detailRoute.handler(detailContext);
    expect(detailResult.statusCode).toBe(200);
    expect(detailResult.payload.success).toBe(true);
    if (!detailResult.payload.success) {
      throw new Error("expected success payload");
    }
    const detailData = detailResult.payload
      .data as DecisionContractStudioDetailResponse;
    expect(detailData.changeSummary?.hasChanges).toBe(true);
  });

  it("fails closed on former broad product fallbacks even when DEMO_MODE is enabled", async () => {
    process.env.DEMO_MODE = "true";

    const expectations = [
      {
        method: "GET" as const,
        template: "/api/v1/organizations/me",
        context: makeContext("GET", "/api/v1/organizations/me"),
      },
      {
        method: "GET" as const,
        template: "/api/v1/forecasts",
        context: makeContext("GET", "/api/v1/forecasts"),
      },
      {
        method: "GET" as const,
        template: "/api/v1/alerts",
        context: makeContext("GET", "/api/v1/alerts"),
      },
      {
        method: "GET" as const,
        template: "/api/v1/datasets",
        context: makeContext("GET", "/api/v1/datasets"),
      },
      {
        method: "GET" as const,
        template: "/api/v1/operational-decisions",
        context: makeContext("GET", "/api/v1/operational-decisions"),
      },
      {
        method: "GET" as const,
        template: "/api/v1/conversations",
        context: makeContext("GET", "/api/v1/conversations"),
      },
    ];

    for (const expectation of expectations) {
      const route = findRoute(expectation.method, expectation.template);
      const result = await route.handler(expectation.context);
      expect(result.statusCode).toBe(503);
      expect(result.payload.success).toBe(false);
      if (result.payload.success) {
        throw new Error("expected error payload");
      }
      expect(result.payload.error.code).toBe("PERSISTENCE_UNAVAILABLE");
    }
  });

  it("fails closed on former broad admin fallbacks even when DEMO_MODE is enabled", async () => {
    process.env.DEMO_MODE = "true";

    const overviewContext = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/overview`,
    );
    overviewContext.params = { orgId: TARGET_ORG_ID };

    const scenariosContext = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/scenarios`,
    );
    scenariosContext.params = { orgId: TARGET_ORG_ID };

    const expectations = [
      {
        method: "GET" as const,
        template: "/api/v1/admin/organizations",
        context: makeAdminContext("GET", "/api/v1/admin/organizations"),
      },
      {
        method: "GET" as const,
        template: "/api/v1/admin/organizations/:orgId/overview",
        context: overviewContext,
      },
      {
        method: "GET" as const,
        template: "/api/v1/admin/audit-log",
        context: makeAdminContext("GET", "/api/v1/admin/audit-log"),
      },
      {
        method: "GET" as const,
        template: "/api/v1/admin/contact-requests",
        context: makeAdminContext("GET", "/api/v1/admin/contact-requests"),
      },
      {
        method: "GET" as const,
        template: "/api/v1/admin/organizations/:orgId/scenarios",
        context: scenariosContext,
      },
    ];

    for (const expectation of expectations) {
      const route = findRoute(expectation.method, expectation.template);
      const result = await route.handler(expectation.context);
      expect(result.statusCode).toBe(503);
      expect(result.payload.success).toBe(false);
      if (result.payload.success) {
        throw new Error("expected error payload");
      }
      expect(result.payload.error.code).toBe("PERSISTENCE_UNAVAILABLE");
    }
  });

  it("returns a paginated admin organizations list when backoffice persistence is configured", async () => {
    const route = findRoute("GET", "/api/v1/admin/organizations");
    const service = getAdminBackofficeService();
    const originalPool = Reflect.get(
      service as unknown as Record<string, unknown>,
      "pool",
    );

    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: "1" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: TARGET_ORG_ID,
            name: "Acme Logistics",
            slug: "acme-logistics",
            status: "active",
            plan: "free",
            contact_email: "ops@acme.fr",
            settings: { adminBackoffice: { isTest: false } },
            user_count: "12",
            site_count: "3",
            created_at: new Date("2026-03-01T08:00:00.000Z"),
          },
        ],
      });

    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    try {
      const result = await route.handler(
        makeAdminContext(
          "GET",
          "/api/v1/admin/organizations",
          "search=acme&status=active&plan=free&page=1&page_size=20",
        ),
      );

      expect(result.statusCode).toBe(200);
      expect(result.payload.success).toBe(true);
      if (!result.payload.success) {
        throw new Error("expected success payload");
      }
      expect(result.payload.data).toEqual([
        {
          id: TARGET_ORG_ID,
          name: "Acme Logistics",
          slug: "acme-logistics",
          status: "active",
          plan: "free",
          contactEmail: "ops@acme.fr",
          isTest: false,
          userCount: 12,
          siteCount: 3,
          createdAt: "2026-03-01T08:00:00.000Z",
        },
      ]);
      expect("pagination" in result.payload).toBe(true);
      if (!("pagination" in result.payload)) {
        throw new Error("expected paginated payload");
      }
      expect(result.payload.pagination).toMatchObject({
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    } finally {
      Reflect.set(
        service as unknown as Record<string, unknown>,
        "pool",
        originalPool,
      );
    }
  });

  it("creates an admin organization when backoffice persistence is configured", async () => {
    const route = findRoute("POST", "/api/v1/admin/organizations");
    const service = getAdminBackofficeService();
    const originalPool = Reflect.get(
      service as unknown as Record<string, unknown>,
      "pool",
    );
    const originalIdentityService = Reflect.get(
      service as unknown as Record<string, unknown>,
      "identityService",
    );
    const actorUserId = "11111111-1111-4111-8111-111111111111";

    const provisionUser = vi.fn().mockResolvedValue({
      authUserId: "keycloak-user-1",
    });
    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql === "BEGIN" || sql === "COMMIT") {
          return { rows: [] };
        }

        if (sql === "ROLLBACK") {
          throw new Error("ROLLBACK should not be called");
        }

        if (sql.includes("SELECT id::text FROM organizations WHERE slug")) {
          expect(params).toEqual(["nouvel-acteur"]);
          return { rows: [] };
        }

        if (sql.includes("INSERT INTO organizations")) {
          expect(params?.[5]).toBe('{"adminBackoffice":{"isTest":true}}');
          return {
            rows: [
              {
                id: TARGET_ORG_ID,
                name: "Nouvel acteur",
                slug: "nouvel-acteur",
                status: "trial",
                plan: "free",
                contact_email: "ops@nouvel-acteur.fr",
                settings: { adminBackoffice: { isTest: true } },
                user_count: "0",
                site_count: "0",
                created_at: new Date("2026-03-18T11:00:00.000Z"),
              },
            ],
          };
        }

        if (sql === "SELECT id::text FROM users WHERE email = $1 LIMIT 1") {
          expect(params).toEqual(["ops@nouvel-acteur.fr"]);
          return { rows: [] };
        }

        if (sql.includes("INSERT INTO users (")) {
          expect(params).toEqual([
            expect.any(String),
            TARGET_ORG_ID,
            "keycloak-user-1",
            "ops@nouvel-acteur.fr",
          ]);
          return {
            rows: [
              {
                id: "55555555-5555-4555-8555-555555555555",
                organization_id: TARGET_ORG_ID,
                auth_user_id: "keycloak-user-1",
                email: "ops@nouvel-acteur.fr",
                role: "org_admin",
                status: "pending",
                site_id: null,
                site_name: null,
                last_login_at: null,
                created_at: new Date("2026-03-18T11:00:00.000Z"),
                updated_at: new Date("2026-03-18T11:00:00.000Z"),
              },
            ],
          };
        }

        if (
          sql.includes("FROM users") &&
          sql.includes("auth_user_id = $1") &&
          sql.includes("ORDER BY CASE WHEN id::text = $1")
        ) {
          expect(params).toEqual([actorUserId]);
          return { rows: [] };
        }

        if (sql.includes("INSERT INTO admin_audit_log")) {
          expect(params?.[2]).toBe(actorUserId);
          return { rows: [] };
        }

        throw new Error(
          `Unexpected SQL in organization create route test: ${sql}`,
        );
      }),
      release: vi.fn(),
    };

    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown);
    Reflect.set(
      service as unknown as Record<string, unknown>,
      "identityService",
      {
        provisionUser,
      } as unknown,
    );

    try {
      const context = makeAdminContext("POST", "/api/v1/admin/organizations");
      context.user = {
        ...(context.user ?? {
          email: "admin@praedixa.com",
          organizationId: ADMIN_HOME_ORG_ID,
          role: "super_admin",
          siteIds: [],
          permissions: ["admin:org:write"],
        }),
        userId: actorUserId,
      };
      context.body = {
        name: "Nouvel acteur",
        slug: "nouvel-acteur",
        contactEmail: "ops@nouvel-acteur.fr",
        isTest: true,
      };

      const result = await route.handler(context);

      expect(result.statusCode).toBe(201);
      expect(result.payload.success).toBe(true);
      if (!result.payload.success) {
        throw new Error("expected success payload");
      }
      expect(result.payload.data).toEqual({
        id: TARGET_ORG_ID,
        name: "Nouvel acteur",
        slug: "nouvel-acteur",
        status: "trial",
        plan: "free",
        contactEmail: "ops@nouvel-acteur.fr",
        isTest: true,
        userCount: 1,
        siteCount: 0,
        createdAt: "2026-03-18T11:00:00.000Z",
      });
      expect(provisionUser).toHaveBeenCalledWith({
        email: "ops@nouvel-acteur.fr",
        organizationId: TARGET_ORG_ID,
        role: "org_admin",
        siteId: null,
      });
    } finally {
      Reflect.set(
        service as unknown as Record<string, unknown>,
        "pool",
        originalPool,
      );
      Reflect.set(
        service as unknown as Record<string, unknown>,
        "identityService",
        originalIdentityService,
      );
    }
  });

  it("deletes a test admin organization when confirmations are valid", async () => {
    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/delete",
    );
    const service = getAdminBackofficeService();
    const originalPool = Reflect.get(
      service as unknown as Record<string, unknown>,
      "pool",
    );
    const actorUserId = "11111111-1111-4111-8111-111111111111";
    const originalIdentityService = Reflect.get(
      service as unknown as Record<string, unknown>,
      "identityService",
    );
    const deleteProvisionedUser = vi.fn().mockResolvedValue(undefined);
    const findManagedUsersByEmail = vi.fn().mockResolvedValue([
      {
        authUserId: "keycloak-user-1",
        username: "ops@test.fr",
        email: "ops@test.fr",
        organizationId: TARGET_ORG_ID,
        role: "org_admin",
        siteId: null,
        enabled: true,
      },
    ]);
    const findManagedUsersByUsername = vi.fn().mockResolvedValue([
      {
        authUserId: "orphan-keycloak-user-2",
        username: "ops@test.fr",
        email: null,
        organizationId: TARGET_ORG_ID,
        role: null,
        siteId: null,
        enabled: true,
      },
    ]);

    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql === "BEGIN" || sql === "COMMIT") {
          return { rows: [] };
        }

        if (sql === "ROLLBACK") {
          throw new Error("ROLLBACK should not be called");
        }

        if (
          sql.includes("FROM organizations o") &&
          sql.includes("FOR UPDATE")
        ) {
          expect(params).toEqual([TARGET_ORG_ID]);
          return {
            rows: [
              {
                id: TARGET_ORG_ID,
                name: "Client test",
                slug: "client-test",
                contact_email: "ops@test.fr",
                settings: { adminBackoffice: { isTest: true } },
              },
            ],
          };
        }

        if (
          sql.includes("FROM users") &&
          sql.includes("auth_user_id = $1") &&
          sql.includes("ORDER BY CASE WHEN id::text = $1")
        ) {
          expect(params).toEqual([actorUserId]);
          return { rows: [] };
        }

        if (
          sql.includes("FROM users u") &&
          sql.includes(
            "LEFT JOIN organizations o ON o.id = u.organization_id",
          ) &&
          sql.includes("WHERE u.auth_user_id = $1")
        ) {
          if (params?.[0] === "keycloak-user-1") {
            return {
              rows: [
                {
                  organization_id: TARGET_ORG_ID,
                  settings: { adminBackoffice: { isTest: true } },
                },
              ],
            };
          }
          if (params?.[0] === "orphan-keycloak-user-2") {
            return { rows: [] };
          }
        }

        if (
          sql.includes("FROM users u") &&
          sql.includes("u.organization_id = $1::uuid") &&
          sql.includes("u.auth_user_id IS NOT NULL")
        ) {
          expect(params).toEqual([TARGET_ORG_ID]);
          return {
            rows: [
              {
                id: "55555555-5555-4555-8555-555555555555",
                auth_user_id: "keycloak-user-1",
                email: "ops@test.fr",
              },
            ],
          };
        }

        if (sql.includes("INSERT INTO admin_audit_log")) {
          expect(params).toEqual([
            expect.any(String),
            null,
            actorUserId,
            expect.any(String),
            "delete_org",
            "organization",
            TARGET_ORG_ID,
            "127.0.0.1",
            "vitest",
            "req-test",
            expect.stringContaining('"slug":"client-test"'),
            "INFO",
          ]);
          return { rows: [] };
        }

        if (sql.includes("DELETE FROM organizations")) {
          expect(params).toEqual([TARGET_ORG_ID]);
          return { rows: [] };
        }

        throw new Error(
          `Unexpected SQL in organization delete route test: ${sql}`,
        );
      }),
      release: vi.fn(),
    };

    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown);
    Reflect.set(
      service as unknown as Record<string, unknown>,
      "identityService",
      {
        deleteProvisionedUser,
        findManagedUsersByEmail,
        findManagedUsersByUsername,
      } as unknown,
    );

    try {
      const context = makeAdminContext(
        "POST",
        `/api/v1/admin/organizations/${TARGET_ORG_ID}/delete`,
      );
      context.params = { orgId: TARGET_ORG_ID };
      context.user = {
        ...(context.user ?? {
          email: "admin@praedixa.com",
          organizationId: ADMIN_HOME_ORG_ID,
          role: "super_admin",
          siteIds: [],
          permissions: ["admin:org:write"],
        }),
        userId: actorUserId,
      };
      context.body = {
        organizationSlug: "client-test",
        confirmationText: "SUPPRIMER",
        acknowledgeTestDeletion: true,
      };

      const result = await route.handler(context);

      expect(result.statusCode).toBe(200);
      expect(result.payload.success).toBe(true);
      if (!result.payload.success) {
        throw new Error("expected success payload");
      }
      expect(result.payload.data).toEqual({
        organizationId: TARGET_ORG_ID,
        slug: "client-test",
        deleted: true,
      });
      expect(deleteProvisionedUser).toHaveBeenCalledWith("keycloak-user-1");
      expect(deleteProvisionedUser).toHaveBeenCalledWith(
        "orphan-keycloak-user-2",
      );
      expect(findManagedUsersByEmail).toHaveBeenCalledWith("ops@test.fr");
      expect(findManagedUsersByUsername).toHaveBeenCalledWith("ops@test.fr");
    } finally {
      Reflect.set(
        service as unknown as Record<string, unknown>,
        "pool",
        originalPool,
      );
      Reflect.set(
        service as unknown as Record<string, unknown>,
        "identityService",
        originalIdentityService,
      );
    }
  });

  it("returns admin unread counts when backoffice persistence is configured", async () => {
    const route = findRoute("GET", "/api/v1/admin/conversations/unread-count");
    const service = getAdminBackofficeService();
    const originalPool = Reflect.get(
      service as unknown as Record<string, unknown>,
      "pool",
    );

    const query = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT COUNT(m.id)::text AS total")) {
        return { rows: [{ total: "8" }] };
      }

      if (sql.includes("GROUP BY c.organization_id, o.name")) {
        return {
          rows: [
            {
              org_id: TARGET_ORG_ID,
              org_name: "Acme Logistics",
              unread_count: "6",
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in unread count route test: ${sql}`);
    });

    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    try {
      const result = await route.handler(
        makeAdminContext("GET", "/api/v1/admin/conversations/unread-count"),
      );

      expect(result.statusCode).toBe(200);
      expect(result.payload.success).toBe(true);
      if (!result.payload.success) {
        throw new Error("expected success payload");
      }
      expect(result.payload.data).toEqual({
        total: 8,
        byOrg: [
          {
            orgId: TARGET_ORG_ID,
            orgName: "Acme Logistics",
            count: 6,
          },
        ],
      });
    } finally {
      Reflect.set(
        service as unknown as Record<string, unknown>,
        "pool",
        originalPool,
      );
    }
  });

  it("returns organization detail when backoffice persistence is configured", async () => {
    const route = findRoute("GET", "/api/v1/admin/organizations/:orgId");
    const service = getAdminBackofficeService();
    const originalPool = Reflect.get(
      service as unknown as Record<string, unknown>,
      "pool",
    );

    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: TARGET_ORG_ID,
            name: "Acme Logistics",
            slug: "acme-logistics",
            status: "active",
            plan: "professional",
            contact_email: "ops@acme.fr",
            settings: { adminBackoffice: { isTest: false } },
            sector: "logistics",
            size: "mid_market",
            user_count: "12",
            site_count: "1",
            created_at: new Date("2026-03-01T08:00:00.000Z"),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            site_id: "77777777-7777-4777-8777-777777777777",
            site_name: "Lyon",
            site_city: "Lyon",
            department_id: "88888888-8888-4888-8888-888888888888",
            department_name: "Exploitants",
            department_headcount: "14",
          },
        ],
      });

    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    try {
      const context = makeAdminContext(
        "GET",
        `/api/v1/admin/organizations/${TARGET_ORG_ID}`,
      );
      context.params = { orgId: TARGET_ORG_ID };

      const result = await route.handler(context);

      expect(result.statusCode).toBe(200);
      expect(result.payload.success).toBe(true);
      if (!result.payload.success) {
        throw new Error("expected success payload");
      }
      expect(result.payload.data).toEqual({
        id: TARGET_ORG_ID,
        name: "Acme Logistics",
        slug: "acme-logistics",
        status: "active",
        plan: "professional",
        contactEmail: "ops@acme.fr",
        isTest: false,
        sector: "logistics",
        size: "mid_market",
        userCount: 12,
        siteCount: 1,
        createdAt: "2026-03-01T08:00:00.000Z",
        sites: [
          {
            id: "77777777-7777-4777-8777-777777777777",
            name: "Lyon",
            city: "Lyon",
            departments: [
              {
                id: "88888888-8888-4888-8888-888888888888",
                name: "Exploitants",
                employeeCount: 14,
              },
            ],
          },
        ],
      });
    } finally {
      Reflect.set(
        service as unknown as Record<string, unknown>,
        "pool",
        originalPool,
      );
    }
  });

  it("returns the persistent admin ingestion log when backoffice persistence is configured", async () => {
    const route = findRoute(
      "GET",
      "/api/v1/admin/organizations/:orgId/ingestion-log",
    );
    const service = getAdminBackofficeService();
    const originalPool = Reflect.get(
      service as unknown as Record<string, unknown>,
      "pool",
    );

    const query = vi.fn().mockResolvedValueOnce({
      rows: [
        {
          id: "12121212-1212-4212-8212-121212121212",
          dataset_id: "34343434-3434-4434-8434-343434343434",
          dataset_name: "Absences bronze",
          file_name: "absences-2026-03.csv",
          status: "failed",
          rows_received: "124",
          rows_transformed: "120",
          started_at: new Date("2026-03-19T07:30:00.000Z"),
          completed_at: new Date("2026-03-19T07:31:00.000Z"),
          mode: "manual_upload",
          triggered_by: "ops@acme.fr",
        },
      ],
    });

    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    try {
      const context = makeAdminContext(
        "GET",
        `/api/v1/admin/organizations/${TARGET_ORG_ID}/ingestion-log`,
      );
      context.params = { orgId: TARGET_ORG_ID };

      const result = await route.handler(context);

      expect(result.statusCode).toBe(200);
      expect(result.payload.success).toBe(true);
      if (!result.payload.success) {
        throw new Error("expected success payload");
      }
      expect(result.payload.data).toEqual([
        {
          id: "12121212-1212-4212-8212-121212121212",
          datasetId: "34343434-3434-4434-8434-343434343434",
          datasetName: "Absences bronze",
          fileName: "absences-2026-03.csv",
          status: "failed",
          rowsProcessed: 120,
          rowsRejected: 4,
          createdAt: "2026-03-19T07:30:00.000Z",
          completedAt: "2026-03-19T07:31:00.000Z",
          mode: "manual_upload",
          triggeredBy: "ops@acme.fr",
        },
      ]);
    } finally {
      Reflect.set(
        service as unknown as Record<string, unknown>,
        "pool",
        originalPool,
      );
    }
  });

  it("returns a paginated admin contact requests list when backoffice persistence is configured", async () => {
    const route = findRoute("GET", "/api/v1/admin/contact-requests");
    const service = getAdminBackofficeService();
    const originalPool = Reflect.get(
      service as unknown as Record<string, unknown>,
      "pool",
    );

    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: "1" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "55555555-5555-4555-8555-555555555555",
            created_at: new Date("2026-03-18T08:00:00.000Z"),
            updated_at: new Date("2026-03-18T09:00:00.000Z"),
            locale: "fr",
            request_type: "product_demo",
            company_name: "Acme Logistics",
            first_name: "Alice",
            last_name: "Martin",
            role: "Operations Director",
            email: "alice@acme.fr",
            phone: "+33102030405",
            subject: "Demo produit",
            message: "Nous souhaitons une demo.",
            status: "new",
            consent: true,
            metadata_json: { source: "landing" },
          },
        ],
      });

    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    try {
      const result = await route.handler(
        makeAdminContext(
          "GET",
          "/api/v1/admin/contact-requests",
          "search=acme&status=new&request_type=product_demo&page=1&page_size=20",
        ),
      );

      expect(result.statusCode).toBe(200);
      expect(result.payload.success).toBe(true);
      if (!result.payload.success) {
        throw new Error("expected success payload");
      }
      expect(result.payload.data).toEqual([
        {
          id: "55555555-5555-4555-8555-555555555555",
          createdAt: "2026-03-18T08:00:00.000Z",
          updatedAt: "2026-03-18T09:00:00.000Z",
          locale: "fr",
          requestType: "product_demo",
          companyName: "Acme Logistics",
          firstName: "Alice",
          lastName: "Martin",
          role: "Operations Director",
          email: "alice@acme.fr",
          phone: "+33102030405",
          subject: "Demo produit",
          message: "Nous souhaitons une demo.",
          status: "new",
          consent: true,
          metadataJson: { source: "landing" },
        },
      ]);
      expect("pagination" in result.payload).toBe(true);
      if (!("pagination" in result.payload)) {
        throw new Error("expected paginated payload");
      }
      expect(result.payload.pagination).toMatchObject({
        total: 1,
        page: 1,
        pageSize: 20,
      });
    } finally {
      Reflect.set(
        service as unknown as Record<string, unknown>,
        "pool",
        originalPool,
      );
    }
  });

  it("returns a paginated admin audit log when backoffice persistence is configured", async () => {
    const route = findRoute("GET", "/api/v1/admin/audit-log");
    const service = getAdminBackofficeService();
    const originalPool = Reflect.get(
      service as unknown as Record<string, unknown>,
      "pool",
    );

    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: "1" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "66666666-6666-4666-8666-666666666666",
            admin_user_id: "11111111-1111-4111-8111-111111111111",
            target_org_id: "33333333-3333-4333-8333-333333333333",
            action: "change_role",
            resource_type: "user",
            resource_id: "77777777-7777-4777-8777-777777777777",
            ip_address: "127.0.0.1",
            user_agent: "vitest",
            request_id: "req-audit",
            metadata_json: { targetRole: "manager" },
            severity: "INFO",
            created_at: new Date("2026-03-18T11:00:00.000Z"),
          },
        ],
      });

    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    try {
      const result = await route.handler(
        makeAdminContext(
          "GET",
          "/api/v1/admin/audit-log",
          "action=change_role&page=1&page_size=30",
        ),
      );

      expect(result.statusCode).toBe(200);
      expect(result.payload.success).toBe(true);
      if (!result.payload.success) {
        throw new Error("expected success payload");
      }
      expect(result.payload.data).toEqual([
        {
          id: "66666666-6666-4666-8666-666666666666",
          adminUserId: "11111111-1111-4111-8111-111111111111",
          targetOrgId: "33333333-3333-4333-8333-333333333333",
          action: "change_role",
          resourceType: "user",
          resourceId: "77777777-7777-4777-8777-777777777777",
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
          requestId: "req-audit",
          metadataJson: { targetRole: "manager" },
          severity: "INFO",
          createdAt: "2026-03-18T11:00:00.000Z",
        },
      ]);
      expect("pagination" in result.payload).toBe(true);
      if (!("pagination" in result.payload)) {
        throw new Error("expected paginated payload");
      }
      expect(result.payload.pagination).toMatchObject({
        total: 1,
        page: 1,
        pageSize: 30,
      });
    } finally {
      Reflect.set(
        service as unknown as Record<string, unknown>,
        "pool",
        originalPool,
      );
    }
  });

  it("updates admin contact request status when backoffice persistence is configured", async () => {
    const route = findRoute(
      "PATCH",
      "/api/v1/admin/contact-requests/:requestId/status",
    );
    const service = getAdminBackofficeService();
    const originalPool = Reflect.get(
      service as unknown as Record<string, unknown>,
      "pool",
    );

    const query = vi.fn().mockResolvedValueOnce({
      rows: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          created_at: new Date("2026-03-18T08:00:00.000Z"),
          updated_at: new Date("2026-03-18T10:00:00.000Z"),
          locale: "fr",
          request_type: "product_demo",
          company_name: "Acme Logistics",
          first_name: "Alice",
          last_name: "Martin",
          role: "Operations Director",
          email: "alice@acme.fr",
          phone: "+33102030405",
          subject: "Demo produit",
          message: "Nous souhaitons une demo.",
          status: "closed",
          consent: true,
          metadata_json: { source: "landing" },
        },
      ],
    });

    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    try {
      const context = makeAdminContext(
        "PATCH",
        "/api/v1/admin/contact-requests/55555555-5555-4555-8555-555555555555/status",
      );
      context.params = {
        requestId: "55555555-5555-4555-8555-555555555555",
      };
      if (!context.user) {
        throw new Error("expected admin context user");
      }
      context.user.permissions = ["admin:support:write"];
      context.body = { status: "closed" };

      const result = await route.handler(context);

      expect(result.statusCode).toBe(200);
      expect(result.payload.success).toBe(true);
      if (!result.payload.success) {
        throw new Error("expected success payload");
      }
      expect(result.payload.data).toMatchObject({
        id: "55555555-5555-4555-8555-555555555555",
        status: "closed",
        requestType: "product_demo",
      });
    } finally {
      Reflect.set(
        service as unknown as Record<string, unknown>,
        "pool",
        originalPool,
      );
    }
  });

  it("keeps admin read-only decisionops endpoints fail-closed with validated params", async () => {
    process.env.DEMO_MODE = "true";

    const approvalInboxContext = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/approval-inbox`,
    );
    approvalInboxContext.params = { orgId: TARGET_ORG_ID };

    const actionDispatchContext = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/action-dispatches/44444444-4444-4444-8444-444444444444`,
    );
    actionDispatchContext.params = {
      orgId: TARGET_ORG_ID,
      actionId: "44444444-4444-4444-8444-444444444444",
    };

    const ledgerDetailContext = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/ledgers/55555555-5555-4555-8555-555555555555`,
      "revision=2",
    );
    ledgerDetailContext.params = {
      orgId: TARGET_ORG_ID,
      ledgerId: "55555555-5555-4555-8555-555555555555",
    };

    const expectations = [
      {
        method: "GET" as const,
        template: "/api/v1/admin/organizations/:orgId/approval-inbox",
        context: approvalInboxContext,
      },
      {
        method: "GET" as const,
        template:
          "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId",
        context: actionDispatchContext,
      },
      {
        method: "GET" as const,
        template: "/api/v1/admin/organizations/:orgId/ledgers/:ledgerId",
        context: ledgerDetailContext,
      },
    ];

    for (const expectation of expectations) {
      const route = findRoute(expectation.method, expectation.template);
      const result = await route.handler(expectation.context);
      expect(result.statusCode).toBe(503);
      expect(result.payload.success).toBe(false);
      if (result.payload.success) {
        throw new Error("expected error payload");
      }
      expect(result.payload.error.code).toBe("PERSISTENCE_UNAVAILABLE");
    }
  });

  it("keeps admin approval decision writes fail-closed with validated params", async () => {
    process.env.DEMO_MODE = "true";

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/approvals/:approvalId/decision",
    );
    const context = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/approvals/44444444-4444-4444-8444-444444444444/decision`,
    );
    context.params = {
      orgId: TARGET_ORG_ID,
      approvalId: "44444444-4444-4444-8444-444444444444",
    };
    context.body = {
      outcome: "granted",
      reasonCode: "policy_ok",
      comment: "Approved by admin.",
    };

    const result = await route.handler(context);
    expect(result.statusCode).toBe(503);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("PERSISTENCE_UNAVAILABLE");
  });

  it("keeps admin action dispatch decisions fail-closed with validated params", async () => {
    process.env.DEMO_MODE = "true";

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId/decision",
    );
    const context = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/action-dispatches/44444444-4444-4444-8444-444444444444/decision`,
    );
    context.params = {
      orgId: TARGET_ORG_ID,
      actionId: "44444444-4444-4444-8444-444444444444",
    };
    context.body = {
      outcome: "dispatched",
      reasonCode: "connector_write_started",
      comment: "Dispatch started by admin.",
    };

    const result = await route.handler(context);
    expect(result.statusCode).toBe(503);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("PERSISTENCE_UNAVAILABLE");
  });

  it("keeps admin action dispatch fallback writes fail-closed with validated params", async () => {
    process.env.DEMO_MODE = "true";

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId/fallback",
    );
    const context = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/action-dispatches/44444444-4444-4444-8444-444444444444/fallback`,
    );
    context.params = {
      orgId: TARGET_ORG_ID,
      actionId: "44444444-4444-4444-8444-444444444444",
    };
    context.body = {
      operation: "prepare",
      reasonCode: "manual_handoff_required",
      channel: "task_copy",
      comment: "Ops should execute the write-back manually.",
    };

    const result = await route.handler(context);
    expect(result.statusCode).toBe(503);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("PERSISTENCE_UNAVAILABLE");
  });

  it("keeps admin ledger decisions fail-closed with validated params", async () => {
    process.env.DEMO_MODE = "true";

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/ledgers/:ledgerId/decision",
    );
    const context = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/ledgers/55555555-5555-4555-8555-555555555555/decision`,
    );
    context.params = {
      orgId: TARGET_ORG_ID,
      ledgerId: "55555555-5555-4555-8555-555555555555",
    };
    context.body = {
      operation: "validate",
      reasonCode: "finance_review_complete",
      validationStatus: "validated",
    };

    const result = await route.handler(context);
    expect(result.statusCode).toBe(503);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("PERSISTENCE_UNAVAILABLE");
  });

  it("rejects invalid ids on admin read-only decisionops endpoints before fail-close", async () => {
    process.env.DEMO_MODE = "true";

    const actionRoute = findRoute(
      "GET",
      "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId",
    );
    const invalidActionContext = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/action-dispatches/not-a-uuid`,
    );
    invalidActionContext.params = {
      orgId: TARGET_ORG_ID,
      actionId: "not-a-uuid",
    };

    const invalidActionResult = await actionRoute.handler(invalidActionContext);
    expect(invalidActionResult.statusCode).toBe(400);
    expect(invalidActionResult.payload.success).toBe(false);
    if (invalidActionResult.payload.success) {
      throw new Error("expected error payload");
    }
    expect(invalidActionResult.payload.error.code).toBe("INVALID_ACTION_ID");

    const ledgerRoute = findRoute(
      "GET",
      "/api/v1/admin/organizations/:orgId/ledgers/:ledgerId",
    );
    const invalidLedgerContext = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/ledgers/55555555-5555-4555-8555-555555555555`,
      "revision=abc",
    );
    invalidLedgerContext.params = {
      orgId: TARGET_ORG_ID,
      ledgerId: "55555555-5555-4555-8555-555555555555",
    };

    const invalidLedgerResult = await ledgerRoute.handler(invalidLedgerContext);
    expect(invalidLedgerResult.statusCode).toBe(400);
    expect(invalidLedgerResult.payload.success).toBe(false);
    if (invalidLedgerResult.payload.success) {
      throw new Error("expected error payload");
    }
    expect(invalidLedgerResult.payload.error.code).toBe(
      "INVALID_LEDGER_REVISION",
    );
  });

  it("rejects invalid approval decision payloads before persistence", async () => {
    process.env.DEMO_MODE = "true";

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/approvals/:approvalId/decision",
    );
    const invalidIdContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/approvals/not-a-uuid/decision`,
    );
    invalidIdContext.params = {
      orgId: TARGET_ORG_ID,
      approvalId: "not-a-uuid",
    };
    invalidIdContext.body = {
      outcome: "granted",
      reasonCode: "policy_ok",
    };

    const invalidIdResult = await route.handler(invalidIdContext);
    expect(invalidIdResult.statusCode).toBe(400);
    expect(invalidIdResult.payload.success).toBe(false);
    if (invalidIdResult.payload.success) {
      throw new Error("expected error payload");
    }
    expect(invalidIdResult.payload.error.code).toBe("INVALID_APPROVAL_ID");

    const invalidBodyContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/approvals/44444444-4444-4444-8444-444444444444/decision`,
    );
    invalidBodyContext.params = {
      orgId: TARGET_ORG_ID,
      approvalId: "44444444-4444-4444-8444-444444444444",
    };
    invalidBodyContext.body = {
      outcome: "granted",
      reasonCode: "",
    };

    const invalidBodyResult = await route.handler(invalidBodyContext);
    expect(invalidBodyResult.statusCode).toBe(400);
    expect(invalidBodyResult.payload.success).toBe(false);
    if (invalidBodyResult.payload.success) {
      throw new Error("expected error payload");
    }
    expect(invalidBodyResult.payload.error.code).toBe(
      "INVALID_APPROVAL_DECISION_BODY",
    );
  });

  it("rejects invalid action dispatch decision payloads before persistence", async () => {
    process.env.DEMO_MODE = "true";

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId/decision",
    );
    const invalidIdContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/action-dispatches/not-a-uuid/decision`,
    );
    invalidIdContext.params = {
      orgId: TARGET_ORG_ID,
      actionId: "not-a-uuid",
    };
    invalidIdContext.body = {
      outcome: "dispatched",
      reasonCode: "connector_write_started",
    };

    const invalidIdResult = await route.handler(invalidIdContext);
    expect(invalidIdResult.statusCode).toBe(400);
    expect(invalidIdResult.payload.success).toBe(false);
    if (invalidIdResult.payload.success) {
      throw new Error("expected error payload");
    }
    expect(invalidIdResult.payload.error.code).toBe("INVALID_ACTION_ID");

    const invalidBodyContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/action-dispatches/44444444-4444-4444-8444-444444444444/decision`,
    );
    invalidBodyContext.params = {
      orgId: TARGET_ORG_ID,
      actionId: "44444444-4444-4444-8444-444444444444",
    };
    invalidBodyContext.body = {
      outcome: "unsupported",
      reasonCode: "",
    };

    const invalidBodyResult = await route.handler(invalidBodyContext);
    expect(invalidBodyResult.statusCode).toBe(400);
    expect(invalidBodyResult.payload.success).toBe(false);
    if (invalidBodyResult.payload.success) {
      throw new Error("expected error payload");
    }
    expect(invalidBodyResult.payload.error.code).toBe(
      "INVALID_ACTION_DISPATCH_DECISION_BODY",
    );
  });

  it("rejects invalid action dispatch fallback payloads before persistence", async () => {
    process.env.DEMO_MODE = "true";

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId/fallback",
    );
    const invalidIdContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/action-dispatches/not-a-uuid/fallback`,
    );
    invalidIdContext.params = {
      orgId: TARGET_ORG_ID,
      actionId: "not-a-uuid",
    };
    invalidIdContext.body = {
      operation: "prepare",
      reasonCode: "manual_handoff_required",
      channel: "task_copy",
    };

    const invalidIdResult = await route.handler(invalidIdContext);
    expect(invalidIdResult.statusCode).toBe(400);
    expect(invalidIdResult.payload.success).toBe(false);
    if (invalidIdResult.payload.success) {
      throw new Error("expected error payload");
    }
    expect(invalidIdResult.payload.error.code).toBe("INVALID_ACTION_ID");

    const invalidBodyContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/action-dispatches/44444444-4444-4444-8444-444444444444/fallback`,
    );
    invalidBodyContext.params = {
      orgId: TARGET_ORG_ID,
      actionId: "44444444-4444-4444-8444-444444444444",
    };
    invalidBodyContext.body = {
      operation: "prepare",
      reasonCode: "",
      channel: "sms",
    };

    const invalidBodyResult = await route.handler(invalidBodyContext);
    expect(invalidBodyResult.statusCode).toBe(400);
    expect(invalidBodyResult.payload.success).toBe(false);
    if (invalidBodyResult.payload.success) {
      throw new Error("expected error payload");
    }
    expect(invalidBodyResult.payload.error.code).toBe(
      "INVALID_ACTION_DISPATCH_FALLBACK_BODY",
    );
  });

  it("rejects invalid ledger decision payloads before persistence", async () => {
    process.env.DEMO_MODE = "true";

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/ledgers/:ledgerId/decision",
    );
    const invalidIdContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/ledgers/not-a-uuid/decision`,
    );
    invalidIdContext.params = {
      orgId: TARGET_ORG_ID,
      ledgerId: "not-a-uuid",
    };
    invalidIdContext.body = {
      operation: "validate",
      reasonCode: "finance_review_complete",
      validationStatus: "validated",
    };

    const invalidIdResult = await route.handler(invalidIdContext);
    expect(invalidIdResult.statusCode).toBe(400);
    expect(invalidIdResult.payload.success).toBe(false);
    if (invalidIdResult.payload.success) {
      throw new Error("expected error payload");
    }
    expect(invalidIdResult.payload.error.code).toBe("INVALID_LEDGER_ID");

    const invalidBodyContext = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${TARGET_ORG_ID}/ledgers/55555555-5555-4555-8555-555555555555/decision`,
    );
    invalidBodyContext.params = {
      orgId: TARGET_ORG_ID,
      ledgerId: "55555555-5555-4555-8555-555555555555",
    };
    invalidBodyContext.body = {
      operation: "recalculate",
      reasonCode: "",
      actual: {
        values: {},
      },
      roi: {
        validationStatus: "estimated",
        components: [],
      },
    };

    const invalidBodyResult = await route.handler(invalidBodyContext);
    expect(invalidBodyResult.statusCode).toBe(400);
    expect(invalidBodyResult.payload.success).toBe(false);
    if (invalidBodyResult.payload.success) {
      throw new Error("expected error payload");
    }
    expect(invalidBodyResult.payload.error.code).toBe(
      "INVALID_LEDGER_DECISION_BODY",
    );
  });

  it("returns PERSISTENCE_UNAVAILABLE for unimplemented real routes", async () => {
    process.env.DATABASE_URL =
      "postgres://postgres:postgres@127.0.0.1:5432/praedixa";
    process.env.DEMO_MODE = "true";

    const route = findRoute("GET", "/api/v1/organizations/me");
    const result = await route.handler(
      makeContext("GET", "/api/v1/organizations/me"),
    );

    expect(result.statusCode).toBe(503);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("PERSISTENCE_UNAVAILABLE");
    expect(result.payload.error.message).toMatch(
      /persistent implementation is configured/i,
    );
  });

  it("rejects invalid organization ids before attempting a fail-closed persistence path", async () => {
    process.env.DEMO_MODE = "true";

    const route = findRoute("GET", "/api/v1/organizations/me");
    const context = makeContext("GET", "/api/v1/organizations/me");
    context.user = {
      ...context.user!,
      organizationId: "org-not-a-uuid",
    };

    const result = await route.handler(context);

    expect(result.statusCode).toBe(400);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("INVALID_ORGANIZATION_ID");
  });

  it("keeps connector-backed admin catalog routes available without local demo data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [
          {
            vendor: "salesforce",
            label: "Salesforce CRM",
            domain: "crm",
            authModes: ["oauth2"],
            sourceObjects: ["Account"],
            recommendedSyncMinutes: 30,
            medallionTargets: ["bronze", "silver", "gold"],
          },
        ],
        timestamp: new Date().toISOString(),
      }),
    });

    vi.stubGlobal("fetch", fetchMock);
    process.env.CONNECTORS_RUNTIME_URL = "http://127.0.0.1:8100";
    process.env.CONNECTORS_RUNTIME_TOKEN = "t".repeat(32);

    const route = findRoute("GET", "/api/v1/admin/integrations/catalog");
    const result = await route.handler(
      makeAdminContext("GET", "/api/v1/admin/integrations/catalog"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          vendor: "salesforce",
          authModes: expect.arrayContaining(["oauth2"]),
        }),
      ]),
    );
  });
});
