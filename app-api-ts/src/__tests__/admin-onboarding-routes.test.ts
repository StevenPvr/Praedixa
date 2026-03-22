import { afterEach, describe, expect, it, vi } from "vitest";

const mockListOnboardingCases = vi.fn();
const mockCreateOnboardingCase = vi.fn();
const mockGetOnboardingCase = vi.fn();
const mockGetOnboardingCaseBundle = vi.fn();
const mockCompleteOnboardingTask = vi.fn();
const mockListOrganizationOnboardingCases = vi.fn();
const mockSaveOnboardingTaskDraft = vi.fn();
const mockRecomputeOnboardingReadiness = vi.fn();
const mockCancelOnboardingCase = vi.fn();
const mockReopenOnboardingCase = vi.fn();

vi.mock("../services/admin-onboarding.js", () => ({
  listOnboardingCases: (...args: unknown[]) => mockListOnboardingCases(...args),
  createOnboardingCase: (...args: unknown[]) =>
    mockCreateOnboardingCase(...args),
  getOnboardingCase: (...args: unknown[]) => mockGetOnboardingCase(...args),
  getOnboardingCaseBundle: (...args: unknown[]) =>
    mockGetOnboardingCaseBundle(...args),
  completeOnboardingTask: (...args: unknown[]) =>
    mockCompleteOnboardingTask(...args),
  recomputeOnboardingReadiness: (...args: unknown[]) =>
    mockRecomputeOnboardingReadiness(...args),
  cancelOnboardingCase: (...args: unknown[]) =>
    mockCancelOnboardingCase(...args),
  reopenOnboardingCase: (...args: unknown[]) =>
    mockReopenOnboardingCase(...args),
  saveOnboardingTaskDraft: (...args: unknown[]) =>
    mockSaveOnboardingTaskDraft(...args),
  listOrganizationOnboardingCases: (...args: unknown[]) =>
    mockListOrganizationOnboardingCases(...args),
}));

import { routes } from "../routes.js";
import type { RouteContext, RouteDefinition } from "../types.js";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const CASE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function findRoute(method: "GET" | "POST", template: string): RouteDefinition {
  const route = routes.find(
    (entry) => entry.method === method && entry.template === template,
  );
  if (!route) {
    throw new Error(`Route not found: ${method} ${template}`);
  }
  return route;
}

function makeAdminContext(
  method: "GET" | "POST",
  path: string,
  query = "",
): RouteContext {
  return {
    method,
    path,
    query: new URLSearchParams(query),
    requestId: "req-onboarding",
    telemetry: {
      requestId: "req-onboarding",
      traceId: "trace-onboarding",
      traceparent: null,
      tracestate: null,
      runId: null,
      connectorRunId: null,
      actionId: null,
      contractVersion: null,
      organizationId: ORGANIZATION_ID,
      siteId: null,
    },
    clientIp: "127.0.0.1",
    userAgent: "vitest",
    headers: {},
    params: {},
    body: null,
    rawBody: null,
    rawBodyBytes: null,
    user: {
      userId: "keycloak|admin-1",
      email: "admin@praedixa.com",
      organizationId: ORGANIZATION_ID,
      role: "super_admin",
      siteIds: [],
      permissions: ["admin:onboarding:read", "admin:onboarding:write"],
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("admin onboarding routes", () => {
  it("lists global onboarding cases with filters", async () => {
    mockListOnboardingCases.mockResolvedValue({
      total: 1,
      items: [
        {
          id: CASE_ID,
          organizationId: ORGANIZATION_ID,
          organizationName: "Acme Logistics",
          organizationSlug: "acme-logistics",
          status: "blocked",
          phase: "source_activation",
          activationMode: "shadow",
          environmentTarget: "sandbox",
          dataResidencyRegion: "fr-par",
          subscriptionModules: ["connectors"],
          selectedPacks: ["coverage"],
          sourceModes: ["api"],
          lastReadinessStatus: "blocked",
          lastReadinessScore: 0,
          openTaskCount: 4,
          openBlockerCount: 2,
          ownerUserId: null,
          sponsorUserId: null,
          startedAt: "2026-03-18T10:00:00.000Z",
          targetGoLiveAt: null,
          closedAt: null,
          process: {
            workflowProvider: "camunda",
            processDefinitionKey: "client-onboarding-v1",
            processDefinitionVersion: 1,
            processInstanceKey: "proc-1",
          },
        },
      ],
    });

    const route = findRoute("GET", "/api/v1/admin/onboarding");
    const result = await route.handler(
      makeAdminContext(
        "GET",
        "/api/v1/admin/onboarding",
        `org_id=${ORGANIZATION_ID}&status=blocked`,
      ),
    );

    expect(result.statusCode).toBe(200);
    expect(mockListOnboardingCases).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      status: "blocked",
      page: 1,
      pageSize: 20,
    });
    expect(result.payload.success).toBe(true);
  });

  it("creates an organization-scoped onboarding case", async () => {
    mockCreateOnboardingCase.mockResolvedValue({
      id: CASE_ID,
      organizationId: ORGANIZATION_ID,
      organizationName: "Acme Logistics",
      organizationSlug: "acme-logistics",
      status: "in_progress",
      phase: "intake",
      activationMode: "shadow",
      environmentTarget: "sandbox",
      dataResidencyRegion: "fr-par",
      subscriptionModules: ["connectors"],
      selectedPacks: ["coverage"],
      sourceModes: ["api"],
      lastReadinessStatus: "blocked",
      lastReadinessScore: 0,
      openTaskCount: 7,
      openBlockerCount: 5,
      ownerUserId: null,
      sponsorUserId: null,
      startedAt: "2026-03-18T10:00:00.000Z",
      targetGoLiveAt: null,
      closedAt: null,
      process: {
        workflowProvider: "camunda",
        processDefinitionKey: "client-onboarding-v1",
        processDefinitionVersion: 1,
        processInstanceKey: "proc-1",
      },
      metadataJson: {},
    });

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/onboarding/cases",
    );
    const context = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${ORGANIZATION_ID}/onboarding/cases`,
    );
    context.params = { orgId: ORGANIZATION_ID };
    context.body = {
      activationMode: "shadow",
      environmentTarget: "sandbox",
      dataResidencyRegion: "fr-par",
      subscriptionModules: ["connectors"],
      selectedPacks: ["coverage"],
      sourceModes: ["api"],
    };

    const result = await route.handler(context);

    expect(result.statusCode).toBe(201);
    expect(mockCreateOnboardingCase).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      actorUserId: "keycloak|admin-1",
      request: context.body,
    });
  });

  it("returns the case detail bundle for the org workspace", async () => {
    const caseDetail = {
      id: CASE_ID,
      organizationId: ORGANIZATION_ID,
      organizationName: "Acme Logistics",
      organizationSlug: "acme-logistics",
      status: "blocked",
      phase: "source_activation",
      activationMode: "shadow",
      environmentTarget: "sandbox",
      dataResidencyRegion: "fr-par",
      subscriptionModules: ["connectors"],
      selectedPacks: ["coverage"],
      sourceModes: ["api"],
      lastReadinessStatus: "blocked",
      lastReadinessScore: 0,
      openTaskCount: 4,
      openBlockerCount: 2,
      ownerUserId: null,
      sponsorUserId: null,
      startedAt: "2026-03-18T10:00:00.000Z",
      targetGoLiveAt: null,
      closedAt: null,
      process: {
        workflowProvider: "camunda",
        processDefinitionKey: "client-onboarding-v1",
        processDefinitionVersion: 1,
        processInstanceKey: "proc-1",
      },
      metadataJson: {},
    };
    mockGetOnboardingCase.mockResolvedValue(caseDetail);
    mockGetOnboardingCaseBundle.mockResolvedValue({
      case: caseDetail,
      tasks: [
        {
          id: "task-1",
          caseId: CASE_ID,
          taskKey: "publish-mappings",
          title: "Publier les mappings",
          domain: "mapping",
          taskType: "mapping_publish",
          status: "todo",
          assigneeUserId: null,
          sortOrder: 60,
          dueAt: null,
          completedAt: null,
          detailsJson: {},
          createdAt: "2026-03-18T10:00:00.000Z",
          updatedAt: "2026-03-18T10:00:00.000Z",
        },
      ],
      blockers: [],
      events: [],
    });

    const route = findRoute(
      "GET",
      "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId",
    );
    const context = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${ORGANIZATION_ID}/onboarding/cases/${CASE_ID}`,
    );
    context.params = { orgId: ORGANIZATION_ID, caseId: CASE_ID };

    const result = await route.handler(context);

    expect(result.statusCode).toBe(200);
    expect(mockGetOnboardingCase).toHaveBeenCalledTimes(1);
    expect(mockGetOnboardingCaseBundle).toHaveBeenCalledWith(CASE_ID);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload.data).toMatchObject({
      case: {
        id: CASE_ID,
        organizationId: ORGANIZATION_ID,
      },
      tasks: [{ id: "task-1" }],
      blockers: [],
      events: [],
    });
  });

  it("completes an onboarding task for the selected case", async () => {
    mockGetOnboardingCase.mockResolvedValue({
      id: CASE_ID,
      organizationId: ORGANIZATION_ID,
      organizationName: "Acme Logistics",
      organizationSlug: "acme-logistics",
      status: "in_progress",
      phase: "mapping_validation",
      activationMode: "shadow",
      environmentTarget: "sandbox",
      dataResidencyRegion: "fr-par",
      subscriptionModules: ["connectors"],
      selectedPacks: ["coverage"],
      sourceModes: ["api"],
      lastReadinessStatus: "in_progress",
      lastReadinessScore: 63,
      openTaskCount: 2,
      openBlockerCount: 1,
      ownerUserId: null,
      sponsorUserId: null,
      startedAt: "2026-03-18T10:00:00.000Z",
      targetGoLiveAt: null,
      closedAt: null,
      process: {
        workflowProvider: "camunda",
        processDefinitionKey: "client-onboarding-v1",
        processDefinitionVersion: 1,
        processInstanceKey: "proc-1",
      },
      metadataJson: {},
    });
    mockCompleteOnboardingTask.mockResolvedValue({
      case: { id: CASE_ID, organizationId: ORGANIZATION_ID },
      tasks: [],
      blockers: [],
      events: [],
    });

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/complete",
    );
    const context = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${ORGANIZATION_ID}/onboarding/cases/${CASE_ID}/tasks/cccccccc-cccc-4ccc-8ccc-cccccccccccc/complete`,
    );
    context.params = {
      orgId: ORGANIZATION_ID,
      caseId: CASE_ID,
      taskId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    };
    context.body = {
      note: "Ready for next step",
      payloadJson: {
        mappingVersion: "mapping-v3",
        criticalFieldsCovered: true,
        quarantineClosed: true,
        coveragePercent: 98,
      },
    };

    const result = await route.handler(context);

    expect(result.statusCode).toBe(200);
    expect(mockCompleteOnboardingTask).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      caseId: CASE_ID,
      taskId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      actorUserId: "keycloak|admin-1",
      note: "Ready for next step",
      payloadJson: {
        mappingVersion: "mapping-v3",
        criticalFieldsCovered: true,
        quarantineClosed: true,
        coveragePercent: 98,
      },
    });
  });

  it("saves an onboarding task draft for the selected case", async () => {
    mockGetOnboardingCase.mockResolvedValue({
      id: CASE_ID,
      organizationId: ORGANIZATION_ID,
      organizationName: "Acme Logistics",
      organizationSlug: "acme-logistics",
      status: "in_progress",
      phase: "access_setup",
      activationMode: "shadow",
      environmentTarget: "sandbox",
      dataResidencyRegion: "fr-par",
      subscriptionModules: ["connectors"],
      selectedPacks: ["coverage"],
      sourceModes: ["api"],
      lastReadinessStatus: "in_progress",
      lastReadinessScore: 25,
      openTaskCount: 6,
      openBlockerCount: 4,
      ownerUserId: null,
      sponsorUserId: null,
      startedAt: "2026-03-18T10:00:00.000Z",
      targetGoLiveAt: null,
      closedAt: null,
      process: {
        workflowProvider: "camunda",
        processDefinitionKey: "client-onboarding-v1",
        processDefinitionVersion: 1,
        processInstanceKey: "proc-1",
      },
      metadataJson: {},
    });
    mockSaveOnboardingTaskDraft.mockResolvedValue({
      case: { id: CASE_ID, organizationId: ORGANIZATION_ID },
      tasks: [],
      blockers: [],
      events: [],
    });

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/save",
    );
    const context = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${ORGANIZATION_ID}/onboarding/cases/${CASE_ID}/tasks/cccccccc-cccc-4ccc-8ccc-cccccccccccc/save`,
    );
    context.params = {
      orgId: ORGANIZATION_ID,
      caseId: CASE_ID,
      taskId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    };
    context.body = {
      note: "Draft access model",
      payloadJson: {
        ssoMode: "oidc",
        roleModelConfirmed: true,
      },
    };

    const result = await route.handler(context);

    expect(result.statusCode).toBe(200);
    expect(mockSaveOnboardingTaskDraft).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      caseId: CASE_ID,
      taskId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      actorUserId: "keycloak|admin-1",
      note: "Draft access model",
      payloadJson: {
        ssoMode: "oidc",
        roleModelConfirmed: true,
      },
    });
  });

  it("recomputes readiness for the selected case", async () => {
    mockGetOnboardingCase.mockResolvedValue({
      id: CASE_ID,
      organizationId: ORGANIZATION_ID,
      metadataJson: {},
    });
    mockRecomputeOnboardingReadiness.mockResolvedValue({
      case: { id: CASE_ID, organizationId: ORGANIZATION_ID },
      tasks: [],
      blockers: [],
      events: [],
    });

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/readiness/recompute",
    );
    const context = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${ORGANIZATION_ID}/onboarding/cases/${CASE_ID}/readiness/recompute`,
    );
    context.params = { orgId: ORGANIZATION_ID, caseId: CASE_ID };
    context.body = {};

    const result = await route.handler(context);

    expect(result.statusCode).toBe(200);
    expect(mockRecomputeOnboardingReadiness).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      caseId: CASE_ID,
    });
  });

  it("cancels the selected onboarding case", async () => {
    mockGetOnboardingCase.mockResolvedValue({
      id: CASE_ID,
      organizationId: ORGANIZATION_ID,
      metadataJson: {},
    });
    mockCancelOnboardingCase.mockResolvedValue({
      case: { id: CASE_ID, organizationId: ORGANIZATION_ID },
      tasks: [],
      blockers: [],
      events: [],
    });

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/cancel",
    );
    const context = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${ORGANIZATION_ID}/onboarding/cases/${CASE_ID}/cancel`,
    );
    context.params = { orgId: ORGANIZATION_ID, caseId: CASE_ID };
    context.body = { reason: "Cancel test" };

    const result = await route.handler(context);

    expect(result.statusCode).toBe(200);
    expect(mockCancelOnboardingCase).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      caseId: CASE_ID,
      actorUserId: "keycloak|admin-1",
      reason: "Cancel test",
    });
  });

  it("reopens the selected onboarding case as a new case", async () => {
    mockGetOnboardingCase.mockResolvedValue({
      id: CASE_ID,
      organizationId: ORGANIZATION_ID,
      metadataJson: {},
    });
    mockReopenOnboardingCase.mockResolvedValue({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      organizationId: ORGANIZATION_ID,
    });

    const route = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/reopen",
    );
    const context = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${ORGANIZATION_ID}/onboarding/cases/${CASE_ID}/reopen`,
    );
    context.params = { orgId: ORGANIZATION_ID, caseId: CASE_ID };
    context.body = { reason: "Reopen test" };

    const result = await route.handler(context);

    expect(result.statusCode).toBe(201);
    expect(mockReopenOnboardingCase).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      caseId: CASE_ID,
      actorUserId: "keycloak|admin-1",
      reason: "Reopen test",
    });
  });
});
