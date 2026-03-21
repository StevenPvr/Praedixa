import { randomUUID } from "node:crypto";

import type {
  CreateOnboardingCaseRequest,
  OnboardingCaseBundle,
  OnboardingCaseBlocker,
  OnboardingCaseDetail,
  OnboardingCaseEvent,
  OnboardingCaseSummary,
  OnboardingCaseTask,
} from "@praedixa/shared-types/api";

import { isUuidString, PersistenceError } from "./persistence.js";
import {
  assertInSet,
  assertUuid,
  CASE_STATUSES,
  mapCaseSummaryRow,
  normalizeRequestedCase,
  normalizeText,
  phaseFromTasks,
  requireActorId,
  seedBlockers,
  seedTasks,
  type CreateOnboardingCaseInput,
} from "./admin-onboarding-support.js";
import { getOnboardingCamundaRuntime } from "./admin-onboarding-camunda.js";
import {
  ensureOrganizationExists,
  ensureUserInOrganization,
  insertEvent,
  markOpenTasksBlocked,
  insertSeedBlockers,
  insertSeedTasks,
  readCaseById,
  updateCaseLifecycleState,
  withAdminReadScope,
  withOrganizationWriteScope,
} from "./admin-onboarding-store.js";
import {
  completeOnboardingCaseTask as completeOnboardingCaseTaskProjection,
  readOnboardingCaseBundle,
  saveOnboardingCaseTaskDraft as saveOnboardingCaseTaskDraftProjection,
  synchronizeOnboardingCaseProjection,
} from "./admin-onboarding-runtime.js";

const READ_FALLBACK_CAMUNDA_CODES = new Set([
  "CAMUNDA_DEPLOY_FAILED",
  "CAMUNDA_RUNTIME_FAILED",
  "CAMUNDA_UNAVAILABLE",
]);

function canReadFromPersistedProjection(
  error: unknown,
): error is PersistenceError {
  return (
    error instanceof PersistenceError &&
    error.statusCode === 503 &&
    READ_FALLBACK_CAMUNDA_CODES.has(error.code)
  );
}

function withPersistedProjectionMetadata(
  caseDetail: OnboardingCaseDetail,
  error: PersistenceError,
): OnboardingCaseDetail {
  return {
    ...caseDetail,
    metadataJson: {
      ...caseDetail.metadataJson,
      projectionSync: {
        code: error.code,
        degradedAt: new Date().toISOString(),
        message: error.message,
        status: "stale",
      },
    },
  };
}

export async function listOrganizationOnboardingCases(input: {
  organizationId: string;
  page: number;
  pageSize: number;
}): Promise<{ items: readonly OnboardingCaseSummary[]; total: number }> {
  return listOnboardingCases(input);
}

export async function listOnboardingCases(input: {
  organizationId?: string | null;
  status?: string | null;
  page: number;
  pageSize: number;
}): Promise<{ items: readonly OnboardingCaseSummary[]; total: number }> {
  const organizationId = normalizeText(input.organizationId ?? null);
  if (organizationId) {
    assertUuid(organizationId, "organizationId");
  }

  const status = normalizeText(input.status ?? null);
  if (status) {
    assertInSet(status, CASE_STATUSES, "status");
  }

  return withAdminReadScope(async (client) => {
    const filters: string[] = [];
    const values: unknown[] = [];

    if (organizationId) {
      await ensureOrganizationExists(client, organizationId);
      values.push(organizationId);
      filters.push(`oc.organization_id = $${values.length}::uuid`);
    }
    if (status) {
      values.push(status);
      filters.push(`oc.status = $${values.length}`);
    }

    const whereClause =
      filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const page = Math.max(1, Math.floor(input.page));
    const pageSize = Math.min(100, Math.max(1, Math.floor(input.pageSize)));
    const offset = (page - 1) * pageSize;

    const totalResult = await client.query<{ total: string | number }>(
      `
      SELECT COUNT(*)::text AS total
      FROM onboarding_cases oc
      ${whereClause}
      `,
      values,
    );

    const rows = await client.query<Parameters<typeof mapCaseSummaryRow>[0]>(
      `
      SELECT
        oc.id::text,
        oc.organization_id::text,
        o.name AS organization_name,
        o.slug AS organization_slug,
        oc.status,
        oc.phase,
        oc.activation_mode,
        oc.environment_target,
        oc.data_residency_region,
        oc.workflow_provider,
        oc.process_definition_key,
        oc.process_definition_version,
        oc.process_instance_key,
        oc.subscription_modules,
        oc.selected_packs,
        oc.source_modes,
        oc.last_readiness_status,
        oc.last_readiness_score,
        oc.owner_user_id::text,
        oc.sponsor_user_id::text,
        oc.started_at,
        oc.target_go_live_at,
        oc.closed_at,
        oc.metadata_json,
        (
          SELECT COUNT(*)::text
          FROM onboarding_case_tasks oct
          WHERE oct.case_id = oc.id
            AND oct.status <> 'done'
        ) AS open_task_count,
        (
          SELECT COUNT(*)::text
          FROM onboarding_case_blockers ocb
          WHERE ocb.case_id = oc.id
            AND ocb.status = 'open'
        ) AS open_blocker_count
      FROM onboarding_cases oc
      JOIN organizations o
        ON o.id = oc.organization_id
      ${whereClause}
      ORDER BY oc.created_at DESC, oc.id DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `,
      [...values, pageSize, offset],
    );

    return {
      items: rows.rows.map((row) => mapCaseSummaryRow(row)),
      total: Number(totalResult.rows[0]?.total) || 0,
    };
  });
}

export async function createOnboardingCase(input: CreateOnboardingCaseInput) {
  assertUuid(input.organizationId, "organizationId");
  const actorUserId = requireActorId(input.actorUserId, "actorUserId");
  const request = normalizeRequestedCase(input.request);

  return withOrganizationWriteScope(input.organizationId, async (client) => {
    await ensureOrganizationExists(client, input.organizationId);
    await ensureUserInOrganization(
      client,
      input.organizationId,
      request.ownerUserId ?? null,
      "ownerUserId",
    );
    await ensureUserInOrganization(
      client,
      input.organizationId,
      request.sponsorUserId ?? null,
      "sponsorUserId",
    );

    const tasks = seedTasks(request);
    const blockers = seedBlockers();
    const caseId = randomUUID();
    const runtime = getOnboardingCamundaRuntime();
    const workflow = await runtime.startOnboardingWorkflow({
      caseId,
      organizationId: input.organizationId,
      request,
    });
    const phase = phaseFromTasks(tasks);

    try {
      await client.query(
        `
        INSERT INTO onboarding_cases (
          id,
          organization_id,
          owner_user_id,
          sponsor_user_id,
          status,
          phase,
          activation_mode,
          environment_target,
          data_residency_region,
          workflow_provider,
          process_definition_key,
          process_definition_version,
          process_instance_key,
          subscription_modules,
          selected_packs,
          source_modes,
          last_readiness_status,
          last_readiness_score,
          started_at,
          target_go_live_at,
          metadata_json
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::uuid,
          'in_progress',
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13::jsonb,
          $14::jsonb,
          $15::jsonb,
          'blocked',
          0,
          NOW(),
          $16::timestamptz,
          $17::jsonb
        )
        `,
        [
          caseId,
          input.organizationId,
          request.ownerUserId ?? null,
          request.sponsorUserId ?? null,
          phase,
          request.activationMode,
          request.environmentTarget,
          request.dataResidencyRegion,
          workflow.workflowProvider,
          workflow.processDefinitionKey,
          workflow.processDefinitionVersion,
          workflow.processInstanceKey,
          JSON.stringify(request.subscriptionModules),
          JSON.stringify(request.selectedPacks),
          JSON.stringify(request.sourceModes),
          request.targetGoLiveAt ?? null,
          JSON.stringify(request.metadataJson ?? {}),
        ],
      );

      await insertSeedTasks(client, caseId, tasks);
      await insertSeedBlockers(client, caseId, blockers);
      await insertEvent(client, {
        caseId,
        actorUserId: isUuidString(actorUserId) ? actorUserId : null,
        eventType: "case_created",
        message: "Onboarding BPM case created",
        payloadJson: {
          actorAuthUserId: actorUserId,
          activationMode: request.activationMode,
          environmentTarget: request.environmentTarget,
          dataResidencyRegion: request.dataResidencyRegion,
        },
      });
      await insertEvent(client, {
        caseId,
        actorUserId: isUuidString(actorUserId) ? actorUserId : null,
        eventType: "workflow_started",
        message: "Process Camunda onboarding demarre",
        payloadJson: {
          actorAuthUserId: actorUserId,
          processDefinitionKey: workflow.processDefinitionKey,
          processDefinitionVersion: workflow.processDefinitionVersion,
          processInstanceKey: workflow.processInstanceKey,
        },
      });
      await synchronizeOnboardingCaseProjection(client, caseId);

      return readCaseById(client, caseId);
    } catch (error) {
      await runtime
        .cancelWorkflow(workflow.processInstanceKey)
        .catch(() => undefined);
      throw error;
    }
  });
}

function buildRequestFromCase(
  caseDetail: OnboardingCaseDetail,
  metadataJson?: Record<string, unknown>,
): CreateOnboardingCaseRequest {
  return {
    ownerUserId: caseDetail.ownerUserId,
    sponsorUserId: caseDetail.sponsorUserId,
    activationMode: caseDetail.activationMode,
    environmentTarget: caseDetail.environmentTarget,
    dataResidencyRegion: caseDetail.dataResidencyRegion,
    subscriptionModules: [...caseDetail.subscriptionModules],
    selectedPacks: [...caseDetail.selectedPacks],
    sourceModes: [...caseDetail.sourceModes],
    targetGoLiveAt: caseDetail.targetGoLiveAt,
    metadataJson: {
      ...caseDetail.metadataJson,
      ...(metadataJson ?? {}),
    },
  };
}

export async function getOnboardingCase(caseId: string) {
  assertUuid(caseId, "caseId");
  return withAdminReadScope(async (client) => {
    try {
      await synchronizeOnboardingCaseProjection(client, caseId);
      return await readCaseById(client, caseId);
    } catch (error) {
      if (!canReadFromPersistedProjection(error)) {
        throw error;
      }

      return withPersistedProjectionMetadata(
        await readCaseById(client, caseId),
        error,
      );
    }
  });
}

export async function getOnboardingCaseBundle(
  caseId: string,
): Promise<OnboardingCaseBundle> {
  assertUuid(caseId, "caseId");
  return withAdminReadScope(async (client) => {
    try {
      await synchronizeOnboardingCaseProjection(client, caseId);
      return await readOnboardingCaseBundle(client, caseId);
    } catch (error) {
      if (!canReadFromPersistedProjection(error)) {
        throw error;
      }

      const bundle = await readOnboardingCaseBundle(client, caseId);
      return {
        ...bundle,
        case: withPersistedProjectionMetadata(bundle.case, error),
      };
    }
  });
}

export async function listOnboardingCaseTasks(
  caseId: string,
): Promise<readonly OnboardingCaseTask[]> {
  assertUuid(caseId, "caseId");
  const bundle = await getOnboardingCaseBundle(caseId);
  return bundle.tasks;
}

export async function listOnboardingCaseBlockers(
  caseId: string,
): Promise<readonly OnboardingCaseBlocker[]> {
  assertUuid(caseId, "caseId");
  const bundle = await getOnboardingCaseBundle(caseId);
  return bundle.blockers;
}

export async function listOnboardingCaseEvents(
  caseId: string,
): Promise<readonly OnboardingCaseEvent[]> {
  assertUuid(caseId, "caseId");
  const bundle = await getOnboardingCaseBundle(caseId);
  return bundle.events;
}

export async function completeOnboardingTask(input: {
  organizationId: string;
  caseId: string;
  taskId: string;
  actorUserId: string;
  note?: string | null;
  payloadJson?: Record<string, unknown> | null;
}): Promise<OnboardingCaseBundle> {
  assertUuid(input.organizationId, "organizationId");
  assertUuid(input.caseId, "caseId");
  assertUuid(input.taskId, "taskId");
  const actorUserId = requireActorId(input.actorUserId, "actorUserId");

  return withOrganizationWriteScope(input.organizationId, async (client) => {
    const caseDetail = await readCaseById(client, input.caseId);
    if (caseDetail.organizationId !== input.organizationId) {
      throw new PersistenceError(
        "Onboarding case does not belong to the target organization.",
        404,
        "NOT_FOUND",
        {
          organizationId: input.organizationId,
          caseId: input.caseId,
        },
      );
    }

    return await completeOnboardingCaseTaskProjection(client, {
      caseId: input.caseId,
      taskId: input.taskId,
      actorUserId,
      note: input.note ?? null,
      payloadJson: input.payloadJson ?? {},
    });
  });
}

export async function saveOnboardingTaskDraft(input: {
  organizationId: string;
  caseId: string;
  taskId: string;
  actorUserId: string;
  note?: string | null;
  payloadJson?: Record<string, unknown> | null;
}): Promise<OnboardingCaseBundle> {
  assertUuid(input.organizationId, "organizationId");
  assertUuid(input.caseId, "caseId");
  assertUuid(input.taskId, "taskId");
  const actorUserId = requireActorId(input.actorUserId, "actorUserId");

  return withOrganizationWriteScope(input.organizationId, async (client) => {
    const caseDetail = await readCaseById(client, input.caseId);
    if (caseDetail.organizationId !== input.organizationId) {
      throw new PersistenceError(
        "Onboarding case does not belong to the target organization.",
        404,
        "NOT_FOUND",
        {
          organizationId: input.organizationId,
          caseId: input.caseId,
        },
      );
    }

    return await saveOnboardingCaseTaskDraftProjection(client, {
      caseId: input.caseId,
      taskId: input.taskId,
      actorUserId,
      note: input.note ?? null,
      payloadJson: input.payloadJson ?? {},
    });
  });
}

export async function recomputeOnboardingReadiness(input: {
  organizationId: string;
  caseId: string;
}): Promise<OnboardingCaseBundle> {
  assertUuid(input.organizationId, "organizationId");
  assertUuid(input.caseId, "caseId");

  return withOrganizationWriteScope(input.organizationId, async (client) => {
    const caseDetail = await readCaseById(client, input.caseId);
    if (caseDetail.organizationId !== input.organizationId) {
      throw new PersistenceError(
        "Onboarding case does not belong to the target organization.",
        404,
        "NOT_FOUND",
        {
          organizationId: input.organizationId,
          caseId: input.caseId,
        },
      );
    }

    await synchronizeOnboardingCaseProjection(client, input.caseId);
    return await readOnboardingCaseBundle(client, input.caseId);
  });
}

export async function cancelOnboardingCase(input: {
  organizationId: string;
  caseId: string;
  actorUserId: string;
  reason?: string | null;
}): Promise<OnboardingCaseBundle> {
  assertUuid(input.organizationId, "organizationId");
  assertUuid(input.caseId, "caseId");
  const actorUserId = requireActorId(input.actorUserId, "actorUserId");

  return withOrganizationWriteScope(input.organizationId, async (client) => {
    const caseDetail = await readCaseById(client, input.caseId);
    if (caseDetail.organizationId !== input.organizationId) {
      throw new PersistenceError(
        "Onboarding case does not belong to the target organization.",
        404,
        "NOT_FOUND",
        {
          organizationId: input.organizationId,
          caseId: input.caseId,
        },
      );
    }
    if (caseDetail.status === "cancelled") {
      throw new PersistenceError(
        "Onboarding case is already cancelled.",
        409,
        "CONFLICT",
        { caseId: input.caseId },
      );
    }

    await getOnboardingCamundaRuntime()
      .cancelWorkflow(caseDetail.process.processInstanceKey)
      .catch(() => undefined);
    const reason =
      normalizeText(input.reason ?? null) ??
      "Cancelled from admin onboarding workspace";
    await markOpenTasksBlocked(client, {
      caseId: input.caseId,
      reason,
    });
    await updateCaseLifecycleState(client, {
      caseId: input.caseId,
      status: "cancelled",
      closedAt: new Date().toISOString(),
      metadataJsonPatch: {
        lifecycleAction: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancelledBy: actorUserId,
        cancelReason: reason,
      },
    });
    await insertEvent(client, {
      caseId: input.caseId,
      actorUserId: isUuidString(actorUserId) ? actorUserId : null,
      eventType: "case_cancelled",
      message: "Case onboarding annule",
      payloadJson: {
        actorAuthUserId: actorUserId,
        reason,
      },
    });
    await synchronizeOnboardingCaseProjection(client, input.caseId);
    return await readOnboardingCaseBundle(client, input.caseId);
  });
}

export async function reopenOnboardingCase(input: {
  organizationId: string;
  caseId: string;
  actorUserId: string;
  reason?: string | null;
}): Promise<OnboardingCaseDetail> {
  assertUuid(input.organizationId, "organizationId");
  assertUuid(input.caseId, "caseId");
  const actorUserId = requireActorId(input.actorUserId, "actorUserId");

  const sourceCase = await getOnboardingCase(input.caseId);
  if (sourceCase.organizationId !== input.organizationId) {
    throw new PersistenceError(
      "Onboarding case does not belong to the target organization.",
      404,
      "NOT_FOUND",
      {
        organizationId: input.organizationId,
        caseId: input.caseId,
      },
    );
  }

  const reason =
    normalizeText(input.reason ?? null) ??
    "Reopened from admin onboarding workspace";
  const reopenedCase = await createOnboardingCase({
    organizationId: input.organizationId,
    actorUserId,
    request: buildRequestFromCase(sourceCase, {
      reopenedFromCaseId: input.caseId,
      reopenReason: reason,
    }),
  });

  await withOrganizationWriteScope(input.organizationId, async (client) => {
    await insertEvent(client, {
      caseId: input.caseId,
      actorUserId: isUuidString(actorUserId) ? actorUserId : null,
      eventType: "case_reopened",
      message: "Case onboarding rouvert via un nouveau case",
      payloadJson: {
        actorAuthUserId: actorUserId,
        newCaseId: reopenedCase.id,
        reason,
      },
    });
  });

  return reopenedCase;
}
