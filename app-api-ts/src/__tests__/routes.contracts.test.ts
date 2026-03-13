import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { routes } from "../routes.js";
import type { RouteContext, RouteDefinition } from "../types.js";

const PRODUCT_ORG_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_HOME_ORG_ID = "22222222-2222-4222-8222-222222222222";
const TARGET_ORG_ID = "33333333-3333-4333-8333-333333333333";

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
      email: "ops.client@praedixa.com",
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
      permissions: [],
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
