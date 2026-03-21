import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConnect = vi.fn();
const mockPool = { connect: mockConnect };
const mockStartOnboardingWorkflow = vi.fn();
const mockCancelWorkflow = vi.fn();
const mockSynchronizeOnboardingCaseProjection = vi.fn();
const mockReadOnboardingCaseBundle = vi.fn();
const mockSaveOnboardingCaseTaskDraft = vi.fn();
const mockCompleteOnboardingCaseTask = vi.fn();

vi.mock("../services/persistence.js", () => {
  const PersistenceError = class PersistenceError extends Error {
    constructor(
      message: string,
      public readonly statusCode = 500,
      public readonly code = "PERSISTENCE_ERROR",
      public readonly details?: Record<string, unknown>,
    ) {
      super(message);
      this.name = "PersistenceError";
    }
  };

  return {
    PersistenceError,
    getPersistencePool: () => mockPool,
    isUuidString: (value: string | null | undefined) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value ?? "",
      ),
    mapPersistenceError: (error: unknown) =>
      error instanceof PersistenceError
        ? error
        : new PersistenceError("The persistent storage operation failed."),
    normalizeStringArray: (values: readonly string[] | null | undefined) =>
      Array.from(
        new Set(
          (values ?? [])
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        ),
      ),
    toIsoDateTime: (value: Date | string | null) =>
      value == null ? null : new Date(value).toISOString(),
  };
});

vi.mock("../services/admin-onboarding-camunda.js", () => ({
  getOnboardingCamundaRuntime: () => ({
    startOnboardingWorkflow: mockStartOnboardingWorkflow,
    cancelWorkflow: mockCancelWorkflow,
  }),
}));

vi.mock("../services/admin-onboarding-runtime.js", () => ({
  synchronizeOnboardingCaseProjection: (...args: unknown[]) =>
    mockSynchronizeOnboardingCaseProjection(...args),
  readOnboardingCaseBundle: (...args: unknown[]) =>
    mockReadOnboardingCaseBundle(...args),
  completeOnboardingCaseTask: (...args: unknown[]) =>
    mockCompleteOnboardingCaseTask(...args),
  saveOnboardingCaseTaskDraft: (...args: unknown[]) =>
    mockSaveOnboardingCaseTaskDraft(...args),
}));

import {
  createOnboardingCase,
  getOnboardingCaseBundle,
  listOnboardingCases,
  saveOnboardingTaskDraft,
} from "../services/admin-onboarding.js";
import { PersistenceError } from "../services/persistence.js";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const CASE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type QueryResult = {
  rows: Array<Record<string, unknown>>;
};

describe("admin onboarding service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartOnboardingWorkflow.mockResolvedValue({
      workflowProvider: "camunda",
      processDefinitionKey: "client-onboarding-v1",
      processDefinitionVersion: 3,
      processInstanceKey: "camunda-instance-1",
    });
    mockSynchronizeOnboardingCaseProjection.mockResolvedValue(undefined);
    mockReadOnboardingCaseBundle.mockResolvedValue({
      case: {
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
        openTaskCount: 1,
        openBlockerCount: 1,
        ownerUserId: null,
        sponsorUserId: null,
        startedAt: "2026-03-18T10:00:00.000Z",
        targetGoLiveAt: null,
        closedAt: null,
        process: {
          workflowProvider: "camunda",
          processDefinitionKey: "client-onboarding-v1",
          processDefinitionVersion: 3,
          processInstanceKey: "camunda-instance-1",
        },
        metadataJson: {},
      },
      tasks: [],
      blockers: [],
      events: [],
    });
    mockSaveOnboardingCaseTaskDraft.mockResolvedValue({
      case: { id: CASE_ID, organizationId: ORGANIZATION_ID },
      tasks: [],
      blockers: [],
      events: [],
    });
    mockCompleteOnboardingCaseTask.mockResolvedValue({
      case: { id: CASE_ID, organizationId: ORGANIZATION_ID },
      tasks: [],
      blockers: [],
      events: [],
    });
  });

  it("lists onboarding cases with org metadata and filters", async () => {
    const client = {
      query: vi.fn(
        async (sql: string, params?: unknown[]): Promise<QueryResult> => {
          if (sql === "BEGIN" || sql === "COMMIT") {
            return { rows: [] };
          }
          if (sql === "SET LOCAL app.bypass_rls = 'true'") {
            return { rows: [] };
          }
          if (sql.includes("FROM organizations WHERE id = $1::uuid")) {
            expect(params).toEqual([ORGANIZATION_ID]);
            return { rows: [{ id: ORGANIZATION_ID }] };
          }
          if (sql.includes("SELECT COUNT(*)::text AS total")) {
            expect(params).toEqual([ORGANIZATION_ID, "blocked"]);
            return { rows: [{ total: "1" }] };
          }
          if (
            sql.includes("FROM onboarding_cases oc") &&
            sql.includes("JOIN organizations o")
          ) {
            expect(params).toEqual([ORGANIZATION_ID, "blocked", 20, 0]);
            return {
              rows: [
                {
                  id: CASE_ID,
                  organization_id: ORGANIZATION_ID,
                  organization_name: "Acme Logistics",
                  organization_slug: "acme-logistics",
                  status: "blocked",
                  phase: "source_activation",
                  activation_mode: "shadow",
                  environment_target: "sandbox",
                  data_residency_region: "fr-par",
                  workflow_provider: "camunda",
                  process_definition_key: "client-onboarding-v1",
                  process_definition_version: 1,
                  process_instance_key: "proc-1",
                  subscription_modules: ["connectors"],
                  selected_packs: ["coverage"],
                  source_modes: ["api"],
                  last_readiness_status: "blocked",
                  last_readiness_score: 0,
                  owner_user_id: null,
                  sponsor_user_id: null,
                  started_at: new Date("2026-03-18T10:00:00.000Z"),
                  target_go_live_at: null,
                  closed_at: null,
                  metadata_json: {},
                  open_task_count: "4",
                  open_blocker_count: "2",
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in listOnboardingCases test: ${sql}`);
        },
      ),
      release: vi.fn(),
    };

    mockConnect.mockResolvedValue(client);

    const result = await listOnboardingCases({
      organizationId: ORGANIZATION_ID,
      status: "blocked",
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({
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
    expect(client.release).toHaveBeenCalled();
  });

  it("falls back to the persisted bundle when Camunda sync is unavailable during a read", async () => {
    const client = {
      query: vi.fn(async (sql: string): Promise<QueryResult> => {
        if (
          sql === "BEGIN" ||
          sql === "COMMIT" ||
          sql === "ROLLBACK" ||
          sql === "SET LOCAL app.bypass_rls = 'true'"
        ) {
          return { rows: [] };
        }
        throw new Error(
          `Unexpected SQL in getOnboardingCaseBundle test: ${sql}`,
        );
      }),
      release: vi.fn(),
    };
    mockConnect.mockResolvedValue(client);
    mockSynchronizeOnboardingCaseProjection.mockRejectedValue(
      new PersistenceError(
        "Camunda onboarding runtime is unavailable.",
        503,
        "CAMUNDA_UNAVAILABLE",
      ),
    );

    const result = await getOnboardingCaseBundle(CASE_ID);

    expect(mockReadOnboardingCaseBundle).toHaveBeenCalledWith(client, CASE_ID);
    expect(result.case.metadataJson).toMatchObject({
      projectionSync: {
        code: "CAMUNDA_UNAVAILABLE",
        message: "Camunda onboarding runtime is unavailable.",
        status: "stale",
      },
    });
    expect(client.release).toHaveBeenCalled();
  });

  it("creates a case while preserving opaque actor ids in the event payload", async () => {
    const eventInsertCalls: unknown[][] = [];
    const client = {
      query: vi.fn(
        async (sql: string, params?: unknown[]): Promise<QueryResult> => {
          if (
            sql === "BEGIN" ||
            sql === "COMMIT" ||
            sql === "SELECT set_config('app.current_organization_id', $1, true)"
          ) {
            return { rows: [] };
          }
          if (sql.includes("FROM organizations WHERE id = $1::uuid")) {
            return { rows: [{ id: ORGANIZATION_ID }] };
          }
          if (sql.includes("INSERT INTO onboarding_cases")) {
            return { rows: [] };
          }
          if (sql.includes("INSERT INTO onboarding_case_tasks")) {
            return { rows: [] };
          }
          if (sql.includes("INSERT INTO onboarding_case_blockers")) {
            return { rows: [] };
          }
          if (sql.includes("INSERT INTO onboarding_case_events")) {
            eventInsertCalls.push(params ?? []);
            return { rows: [] };
          }
          if (
            sql.includes("FROM onboarding_cases oc") &&
            sql.includes("JOIN organizations o")
          ) {
            return {
              rows: [
                {
                  id: CASE_ID,
                  organization_id: ORGANIZATION_ID,
                  organization_name: "Acme Logistics",
                  organization_slug: "acme-logistics",
                  status: "in_progress",
                  phase: "intake",
                  activation_mode: "shadow",
                  environment_target: "sandbox",
                  data_residency_region: "fr-par",
                  workflow_provider: "camunda",
                  process_definition_key: "client-onboarding-v1",
                  process_definition_version: 3,
                  process_instance_key: "camunda-instance-1",
                  subscription_modules: ["connectors"],
                  selected_packs: ["coverage"],
                  source_modes: ["api"],
                  last_readiness_status: "blocked",
                  last_readiness_score: 0,
                  owner_user_id: null,
                  sponsor_user_id: null,
                  started_at: new Date("2026-03-18T10:00:00.000Z"),
                  target_go_live_at: null,
                  closed_at: null,
                  metadata_json: {},
                  open_task_count: "7",
                  open_blocker_count: "5",
                },
              ],
            };
          }

          throw new Error(
            `Unexpected SQL in createOnboardingCase test: ${sql}`,
          );
        },
      ),
      release: vi.fn(),
    };

    mockConnect.mockResolvedValue(client);

    await createOnboardingCase({
      organizationId: ORGANIZATION_ID,
      actorUserId: "keycloak|admin-opaque-id",
      request: {
        activationMode: "shadow",
        environmentTarget: "sandbox",
        dataResidencyRegion: "fr-par",
        subscriptionModules: ["connectors"],
        selectedPacks: ["coverage"],
        sourceModes: ["api"],
      },
    });

    expect(eventInsertCalls).toHaveLength(2);
    expect(eventInsertCalls[0]?.[2]).toBeNull();
    const payloadJson = eventInsertCalls[0]?.[5];
    expect(typeof payloadJson).toBe("string");
    expect(JSON.parse(payloadJson as string)).toMatchObject({
      actorAuthUserId: "keycloak|admin-opaque-id",
      activationMode: "shadow",
    });
    expect(JSON.parse(String(eventInsertCalls[1]?.[5]))).toMatchObject({
      actorAuthUserId: "keycloak|admin-opaque-id",
      processDefinitionVersion: 3,
      processInstanceKey: "camunda-instance-1",
    });
    expect(mockStartOnboardingWorkflow).toHaveBeenCalledWith({
      caseId: expect.any(String),
      organizationId: ORGANIZATION_ID,
      request: expect.objectContaining({
        activationMode: "shadow",
        environmentTarget: "sandbox",
      }),
    });
    expect(mockSynchronizeOnboardingCaseProjection).toHaveBeenCalled();
  });

  it("saves a task draft with opaque actor ids preserved at the service boundary", async () => {
    const client = {
      query: vi.fn(async (sql: string): Promise<QueryResult> => {
        if (
          sql === "BEGIN" ||
          sql === "COMMIT" ||
          sql === "SELECT set_config('app.current_organization_id', $1, true)"
        ) {
          return { rows: [] };
        }
        if (
          sql.includes("FROM onboarding_cases oc") &&
          sql.includes("JOIN organizations o")
        ) {
          return {
            rows: [
              {
                id: CASE_ID,
                organization_id: ORGANIZATION_ID,
                organization_name: "Acme Logistics",
                organization_slug: "acme-logistics",
                status: "in_progress",
                phase: "access_setup",
                activation_mode: "shadow",
                environment_target: "sandbox",
                data_residency_region: "fr-par",
                workflow_provider: "camunda",
                process_definition_key: "client-onboarding-v1",
                process_definition_version: 3,
                process_instance_key: "camunda-instance-1",
                subscription_modules: ["connectors"],
                selected_packs: ["coverage"],
                source_modes: ["api"],
                last_readiness_status: "blocked",
                last_readiness_score: 0,
                owner_user_id: null,
                sponsor_user_id: null,
                started_at: new Date("2026-03-18T10:00:00.000Z"),
                target_go_live_at: null,
                closed_at: null,
                metadata_json: {},
                open_task_count: "7",
                open_blocker_count: "5",
              },
            ],
          };
        }
        throw new Error(
          `Unexpected SQL in saveOnboardingTaskDraft test: ${sql}`,
        );
      }),
      release: vi.fn(),
    };
    mockConnect.mockResolvedValue(client);

    await saveOnboardingTaskDraft({
      organizationId: ORGANIZATION_ID,
      caseId: CASE_ID,
      taskId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      actorUserId: "keycloak|admin-opaque-id",
      note: "Draft access model",
      payloadJson: {
        ssoMode: "oidc",
        roleModelConfirmed: true,
      },
    });

    expect(mockSaveOnboardingCaseTaskDraft).toHaveBeenCalledWith(client, {
      caseId: CASE_ID,
      taskId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      actorUserId: "keycloak|admin-opaque-id",
      note: "Draft access model",
      payloadJson: {
        ssoMode: "oidc",
        roleModelConfirmed: true,
      },
    });
  });
});
