import type {
  OnboardingCaseBundle,
  OnboardingCaseBlocker,
  OnboardingCaseTask,
} from "@praedixa/shared-types/api";
import type { PoolClient } from "pg";

import {
  normalizeOnboardingTaskPayload,
  computeCaseProjectionSnapshot,
  mapBlockerRow,
  mapEventRow,
  mapTaskRow,
  type DbOnboardingBlockerRow,
  type DbOnboardingEventRow,
  type DbOnboardingTaskRow,
} from "./admin-onboarding-support.js";
import { getOnboardingCamundaRuntime } from "./admin-onboarding-camunda.js";
import { PersistenceError, isUuidString } from "./persistence.js";
import {
  insertEvent,
  listBlockerRowsByCaseId,
  listTaskRowsByCaseId,
  readCaseById,
  updateBlockerProjection,
  updateCaseProjection,
  updateTaskDetailsDraft,
  updateTaskProjection,
} from "./admin-onboarding-store.js";
import { mapCamundaTaskStateToStatus } from "./admin-onboarding-process.js";

function asDetailsJson(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

async function listEventRowsByCaseId(
  client: PoolClient,
  caseId: string,
): Promise<readonly DbOnboardingEventRow[]> {
  const rows = await client.query<DbOnboardingEventRow>(
    `
    SELECT
      id::text,
      case_id::text,
      actor_user_id::text,
      event_type,
      message,
      payload_json,
      occurred_at
    FROM onboarding_case_events
    WHERE case_id = $1::uuid
    ORDER BY occurred_at DESC, id DESC
    `,
    [caseId],
  );
  return rows.rows;
}

function toBlockers(
  rows: readonly DbOnboardingBlockerRow[],
): readonly OnboardingCaseBlocker[] {
  return rows.map((row) => mapBlockerRow(row));
}

function toTasks(
  rows: readonly DbOnboardingTaskRow[],
): readonly OnboardingCaseTask[] {
  return rows.map((row) => mapTaskRow(row));
}

function resolveBlockerStatus(
  blocker: DbOnboardingBlockerRow,
  tasks: readonly OnboardingCaseTask[],
): { status: "open" | "resolved"; resolvedAt: string | null } {
  const resolveOnTaskKeys = Array.isArray(
    blocker.details_json?.resolveOnTaskKeys,
  )
    ? blocker.details_json.resolveOnTaskKeys.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const tasksInDomain =
    resolveOnTaskKeys.length > 0
      ? tasks.filter((task) => resolveOnTaskKeys.includes(task.taskKey))
      : tasks.filter((task) => task.domain === blocker.domain);
  const domainResolved =
    tasksInDomain.length > 0 &&
    tasksInDomain.every((task) => task.status === "done");
  return {
    status: domainResolved ? "resolved" : "open",
    resolvedAt: domainResolved ? new Date().toISOString() : null,
  };
}

export async function synchronizeOnboardingCaseProjection(
  client: PoolClient,
  caseId: string,
): Promise<void> {
  const caseDetail = await readCaseById(client, caseId);
  const runtime = getOnboardingCamundaRuntime();
  const projection = await runtime.readProjection(
    caseDetail.process.processInstanceKey,
  );
  const taskRows = await listTaskRowsByCaseId(client, caseId);
  const tasksByElementId = new Map(
    projection.userTasks.map((task) => [task.elementId, task] as const),
  );
  const nowIso = new Date().toISOString();

  for (const row of taskRows) {
    const workflowTask = tasksByElementId.get(row.task_key);
    const existingDetails = asDetailsJson(row.details_json);
    const nextStatus = workflowTask
      ? mapCamundaTaskStateToStatus(workflowTask.state)
      : row.status === "done"
        ? "done"
        : "todo";
    const nextCompletedAt =
      nextStatus === "done"
        ? (workflowTask?.completionDate ??
          row.completed_at?.toString() ??
          nowIso)
        : null;

    await updateTaskProjection(client, {
      caseId,
      taskKey: row.task_key,
      status: nextStatus,
      assignee: workflowTask?.assignee ?? null,
      dueAt: workflowTask?.dueDate ?? null,
      completedAt: nextCompletedAt,
      detailsJson: {
        ...existingDetails,
        workflowElementId: row.task_key,
        workflowTaskKey:
          workflowTask?.userTaskKey ?? existingDetails.workflowTaskKey ?? null,
        workflowState: workflowTask?.state ?? null,
        workflowAssignee: workflowTask?.assignee ?? null,
        workflowCandidateGroups: workflowTask?.candidateGroups ?? [],
      },
    });
  }

  const projectedTaskRows = await listTaskRowsByCaseId(client, caseId);
  const projectedTasks = toTasks(projectedTaskRows);
  const blockerRows = await listBlockerRowsByCaseId(client, caseId);
  for (const blocker of blockerRows) {
    const resolved = resolveBlockerStatus(blocker, projectedTasks);
    await updateBlockerProjection(client, {
      caseId,
      blockerKey: blocker.blocker_key,
      status: resolved.status,
      resolvedAt: resolved.resolvedAt,
      detailsJson: {
        ...asDetailsJson(blocker.details_json),
        resolvedFromDomain: blocker.domain,
        lastEvaluatedAt: nowIso,
      },
    });
  }

  const projectedBlockerRows = await listBlockerRowsByCaseId(client, caseId);
  const snapshot = computeCaseProjectionSnapshot({
    activationMode: caseDetail.activationMode,
    tasks: projectedTasks,
    blockers: toBlockers(projectedBlockerRows),
    currentStatus: caseDetail.status,
  });

  await updateCaseProjection(client, {
    caseId,
    status: snapshot.caseStatus,
    phase: snapshot.phase,
    readinessStatus: snapshot.readinessStatus,
    readinessScore: snapshot.readinessScore,
    processDefinitionVersion: caseDetail.process.processDefinitionVersion,
  });
}

export async function readOnboardingCaseBundle(
  client: PoolClient,
  caseId: string,
): Promise<OnboardingCaseBundle> {
  const caseDetail = await readCaseById(client, caseId);
  const taskRows = await listTaskRowsByCaseId(client, caseId);
  const blockerRows = await listBlockerRowsByCaseId(client, caseId);
  const eventRows = await listEventRowsByCaseId(client, caseId);

  return {
    case: caseDetail,
    tasks: toTasks(taskRows),
    blockers: toBlockers(blockerRows),
    events: eventRows.map((row) => mapEventRow(row)),
  };
}

export async function completeOnboardingCaseTask(
  client: PoolClient,
  input: {
    caseId: string;
    taskId: string;
    actorUserId: string;
    note?: string | null;
    payloadJson?: Record<string, unknown> | null;
  },
): Promise<OnboardingCaseBundle> {
  await synchronizeOnboardingCaseProjection(client, input.caseId);
  const bundle = await readOnboardingCaseBundle(client, input.caseId);
  const task = bundle.tasks.find((entry) => entry.id === input.taskId);
  if (!task) {
    throw new PersistenceError("Onboarding task not found.", 404, "NOT_FOUND", {
      caseId: input.caseId,
      taskId: input.taskId,
    });
  }
  if (task.status === "done") {
    throw new PersistenceError(
      "Onboarding task is already completed.",
      409,
      "CONFLICT",
      { taskId: input.taskId },
    );
  }

  const workflowTaskKey = task.detailsJson.workflowTaskKey;
  if (
    typeof workflowTaskKey !== "string" ||
    workflowTaskKey.trim().length === 0
  ) {
    throw new PersistenceError(
      "The onboarding task is not currently actionable in Camunda.",
      409,
      "CAMUNDA_TASK_NOT_ACTIONABLE",
      { taskId: input.taskId, taskKey: task.taskKey },
    );
  }

  const normalizedPayload = normalizeOnboardingTaskPayload({
    taskKey: task.taskKey,
    payloadJson: input.payloadJson ?? {},
    mode: "complete",
  });
  await updateTaskDetailsDraft(client, {
    caseId: input.caseId,
    taskKey: task.taskKey,
    detailsJson: {
      ...task.detailsJson,
      completionPayload: normalizedPayload,
      draftPayload: normalizedPayload,
      lastSavedAt: new Date().toISOString(),
      lastSavedBy: input.actorUserId,
    },
  });

  const runtime = getOnboardingCamundaRuntime();
  await runtime.completeWorkflowTask({
    userTaskKey: workflowTaskKey,
    assignee: input.actorUserId,
    note: input.note ?? null,
  });
  await insertEvent(client, {
    caseId: input.caseId,
    actorUserId: isUuidString(input.actorUserId) ? input.actorUserId : null,
    eventType: "task_completed",
    message: `Tache completee: ${task.title}`,
    payloadJson: {
      actorAuthUserId: input.actorUserId,
      taskId: task.id,
      taskKey: task.taskKey,
      workflowTaskKey,
      note: input.note ?? null,
      completionPayload: normalizedPayload,
    },
  });

  await synchronizeOnboardingCaseProjection(client, input.caseId);
  return await readOnboardingCaseBundle(client, input.caseId);
}

export async function saveOnboardingCaseTaskDraft(
  client: PoolClient,
  input: {
    caseId: string;
    taskId: string;
    actorUserId: string;
    note?: string | null;
    payloadJson?: Record<string, unknown> | null;
  },
): Promise<OnboardingCaseBundle> {
  await synchronizeOnboardingCaseProjection(client, input.caseId);
  const bundle = await readOnboardingCaseBundle(client, input.caseId);
  const task = bundle.tasks.find((entry) => entry.id === input.taskId);
  if (!task) {
    throw new PersistenceError("Onboarding task not found.", 404, "NOT_FOUND", {
      caseId: input.caseId,
      taskId: input.taskId,
    });
  }

  const normalizedPayload = normalizeOnboardingTaskPayload({
    taskKey: task.taskKey,
    payloadJson: input.payloadJson ?? {},
    mode: "save",
  });
  await updateTaskDetailsDraft(client, {
    caseId: input.caseId,
    taskKey: task.taskKey,
    detailsJson: {
      ...task.detailsJson,
      draftPayload: normalizedPayload,
      lastSavedAt: new Date().toISOString(),
      lastSavedBy: input.actorUserId,
      lastDraftNote: input.note ?? null,
    },
  });
  await insertEvent(client, {
    caseId: input.caseId,
    actorUserId: isUuidString(input.actorUserId) ? input.actorUserId : null,
    eventType: "task_saved",
    message: `Brouillon enregistre: ${task.title}`,
    payloadJson: {
      actorAuthUserId: input.actorUserId,
      taskId: task.id,
      taskKey: task.taskKey,
      note: input.note ?? null,
      draftPayload: normalizedPayload,
    },
  });

  await synchronizeOnboardingCaseProjection(client, input.caseId);
  return await readOnboardingCaseBundle(client, input.caseId);
}
