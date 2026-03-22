import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import type { OnboardingCaseBundle } from "@praedixa/shared-types/api";

import { loadConfig } from "../config.js";
import {
  completeOnboardingTask,
  createOnboardingCase,
  getOnboardingCaseBundle,
} from "../services/admin-onboarding.js";
import {
  getOnboardingCamundaRuntime,
  initializeOnboardingCamundaRuntime,
} from "../services/admin-onboarding-camunda.js";
import { getPersistencePool } from "../services/persistence.js";

const runIntegration = process.env["RUN_CAMUNDA_INTEGRATION_TESTS"] === "true";
const describeIf = runIntegration ? describe.sequential : describe.skip;
const REQUEST_ACTOR_ID = "keycloak|camunda-smoke-admin";

let organizationId = randomUUID();
let organizationSlug = `camunda-smoke-${organizationId.slice(0, 8)}`;
let createdProcessInstanceKey: string | null = null;

function createSetupPool(): Pool {
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be configured to run the Camunda onboarding integration test.",
    );
  }

  return new Pool({
    connectionString: databaseUrl,
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
  });
}

async function withOrganizationScope<T>(
  pool: Pool,
  orgId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.current_organization_id', $1, true)",
      [orgId],
    );
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureSmokeOrganization(pool: Pool): Promise<void> {
  await withOrganizationScope(pool, organizationId, async (client) => {
    await client.query(
      `
      INSERT INTO organizations (
        id,
        name,
        slug,
        legal_name,
        status,
        plan,
        timezone,
        locale,
        currency,
        contact_email,
        settings,
        created_at,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        'trial',
        'free',
        'Europe/Paris',
        'fr-FR',
        'EUR',
        $5,
        '{}'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        legal_name = EXCLUDED.legal_name,
        contact_email = EXCLUDED.contact_email,
        updated_at = NOW()
      `,
      [
        organizationId,
        "Camunda Smoke Logistics",
        organizationSlug,
        "Camunda Smoke Logistics SAS",
        `${organizationSlug}@example.test`,
      ],
    );
  });
}

async function cleanupSmokeOrganization(pool: Pool): Promise<void> {
  await withOrganizationScope(pool, organizationId, async (client) => {
    await client.query("DELETE FROM organizations WHERE id = $1::uuid", [
      organizationId,
    ]);
  });
}

async function waitForBundle(
  caseId: string,
  predicate: (bundle: OnboardingCaseBundle) => boolean,
  timeoutMs = 10_000,
): Promise<OnboardingCaseBundle> {
  const startedAt = Date.now();
  let lastBundle: OnboardingCaseBundle | null = null;

  while (Date.now() - startedAt <= timeoutMs) {
    lastBundle = await getOnboardingCaseBundle(caseId);
    if (predicate(lastBundle)) {
      return lastBundle;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Timed out waiting for onboarding case ${caseId} to reach the expected Camunda projection state. Last phase=${lastBundle?.case.phase ?? "unknown"} status=${lastBundle?.case.status ?? "unknown"}`,
  );
}

describeIf("admin onboarding Camunda integration", () => {
  let setupPool: Pool;

  beforeAll(async () => {
    setupPool = createSetupPool();
    const config = loadConfig({
      ...process.env,
      NODE_ENV:
        process.env["NODE_ENV"] === "test"
          ? "development"
          : process.env["NODE_ENV"],
    });
    await initializeOnboardingCamundaRuntime(config.camunda);
    await ensureSmokeOrganization(setupPool);
  });

  afterAll(async () => {
    if (createdProcessInstanceKey) {
      await getOnboardingCamundaRuntime()
        .cancelWorkflow(createdProcessInstanceKey)
        .catch(() => undefined);
    }
    if (setupPool) {
      await cleanupSmokeOrganization(setupPool);
      await setupPool.end();
    }
    const servicePool = getPersistencePool();
    if (servicePool) {
      await servicePool.end();
    }
  });

  it("creates a case and advances the first Camunda user task", async () => {
    const created = await createOnboardingCase({
      organizationId,
      actorUserId: REQUEST_ACTOR_ID,
      request: {
        activationMode: "shadow",
        environmentTarget: "sandbox",
        dataResidencyRegion: "fr-par",
        subscriptionModules: ["connectors", "forecasting"],
        selectedPacks: ["coverage", "workforce"],
        sourceModes: ["api", "file"],
        metadataJson: {
          smoke: true,
          trigger: "vitest-camunda-integration",
        },
      },
    });

    createdProcessInstanceKey = created.process.processInstanceKey;

    expect(created.process.workflowProvider).toBe("camunda");
    expect(created.process.processDefinitionKey).toBe("client-onboarding-v1");

    const initialBundle = await waitForBundle(created.id, (bundle) =>
      bundle.tasks.some(
        (task) =>
          task.taskKey === "scope-contract" &&
          task.status === "in_progress" &&
          typeof task.detailsJson["workflowTaskKey"] === "string",
      ),
    );

    expect(initialBundle.case.organizationId).toBe(organizationId);
    expect(initialBundle.case.phase).toBe("intake");
    expect(initialBundle.case.process.processInstanceKey).toBe(
      created.process.processInstanceKey,
    );

    const firstTask = initialBundle.tasks.find(
      (task) => task.taskKey === "scope-contract",
    );
    expect(firstTask).toBeDefined();
    expect(firstTask?.detailsJson["workflowCandidateGroups"]).toEqual([
      "praedixa-admin-onboarding",
    ]);
    expect(
      initialBundle.events.some(
        (event) => event.eventType === "workflow_started",
      ),
    ).toBe(true);

    const completedBundle = await completeOnboardingTask({
      organizationId,
      caseId: created.id,
      taskId: firstTask!.id,
      actorUserId: REQUEST_ACTOR_ID,
      note: "Smoke integration completion",
      payloadJson: {
        contractScope: "Shadow rollout for coverage + workforce",
        dataResidencyApproved: true,
        environmentValidated: true,
        commercialOwner: "smoke-test-owner@praedixa.com",
      },
    });

    expect(
      completedBundle.events.some(
        (event) => event.eventType === "task_completed",
      ),
    ).toBe(true);

    const progressedBundle = await waitForBundle(created.id, (bundle) => {
      const scopeTask = bundle.tasks.find(
        (task) => task.taskKey === "scope-contract",
      );
      const accessTask = bundle.tasks.find(
        (task) => task.taskKey === "access-model",
      );
      return (
        scopeTask?.status === "done" &&
        accessTask?.status === "in_progress" &&
        typeof accessTask.detailsJson["workflowTaskKey"] === "string"
      );
    });

    expect(progressedBundle.case.phase).toBe("access_setup");
    expect(progressedBundle.case.lastReadinessScore).toBeGreaterThan(0);

    const scopeTask = progressedBundle.tasks.find(
      (task) => task.taskKey === "scope-contract",
    );
    const accessTask = progressedBundle.tasks.find(
      (task) => task.taskKey === "access-model",
    );

    expect(scopeTask?.completedAt).not.toBeNull();
    expect(accessTask?.detailsJson["workflowState"]).toBe("CREATED");
  }, 30_000);
});
