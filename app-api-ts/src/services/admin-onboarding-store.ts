import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import {
  getPersistencePool,
  mapPersistenceError,
  PersistenceError,
} from "./persistence.js";
import type {
  DbOnboardingBlockerRow,
  DbOnboardingCaseRow,
  DbOnboardingTaskRow,
  SeedBlocker,
  SeedTask,
} from "./admin-onboarding-support.js";
import { mapCaseRow } from "./admin-onboarding-support.js";
import { isUuidString } from "./persistence.js";

type DbQueryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

function requirePool(): Pool {
  const pool = getPersistencePool();
  if (!pool) {
    throw new PersistenceError(
      "Persistent database is not configured.",
      503,
      "PERSISTENCE_UNAVAILABLE",
    );
  }
  return pool;
}

export async function withAdminReadScope<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await requirePool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL app.bypass_rls = 'true'");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw mapPersistenceError(
      error,
      "ONBOARDING_PERSISTENCE_ERROR",
      "Onboarding persistence failed.",
    );
  } finally {
    client.release();
  }
}

export async function withOrganizationWriteScope<T>(
  organizationId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await requirePool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.current_organization_id', $1, true)",
      [organizationId],
    );
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw mapPersistenceError(
      error,
      "ONBOARDING_PERSISTENCE_ERROR",
      "Onboarding persistence failed.",
    );
  } finally {
    client.release();
  }
}

export async function ensureOrganizationExists(
  queryable: DbQueryable,
  organizationId: string,
): Promise<void> {
  const result = await queryable.query<{ id: string }>(
    "SELECT id::text FROM organizations WHERE id = $1::uuid LIMIT 1",
    [organizationId],
  );
  if (!result.rows[0]) {
    throw new PersistenceError("Organization not found.", 404, "NOT_FOUND", {
      organizationId,
    });
  }
}

export async function ensureUserInOrganization(
  queryable: DbQueryable,
  organizationId: string,
  userId: string | null,
  label: string,
): Promise<void> {
  if (!userId) {
    return;
  }

  const result = await queryable.query<{ id: string }>(
    `
    SELECT id::text
    FROM users
    WHERE id = $1::uuid
      AND organization_id = $2::uuid
    LIMIT 1
    `,
    [userId, organizationId],
  );
  if (!result.rows[0]) {
    throw new PersistenceError(
      `${label} does not belong to the target organization.`,
      404,
      "NOT_FOUND",
      { organizationId, [label]: userId },
    );
  }
}

export async function insertSeedTasks(
  client: PoolClient,
  caseId: string,
  tasks: readonly SeedTask[],
): Promise<void> {
  for (const task of tasks) {
    await client.query(
      `
      INSERT INTO onboarding_case_tasks (
        id,
        case_id,
        task_key,
        title,
        domain,
        task_type,
        status,
        sort_order,
        details_json
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5,
        $6,
        'todo',
        $7,
        $8::jsonb
      )
      `,
      [
        randomUUID(),
        caseId,
        task.taskKey,
        task.title,
        task.domain,
        task.taskType,
        task.sortOrder,
        JSON.stringify(task.detailsJson ?? {}),
      ],
    );
  }
}

export async function insertSeedBlockers(
  client: PoolClient,
  caseId: string,
  blockers: readonly SeedBlocker[],
): Promise<void> {
  for (const blocker of blockers) {
    await client.query(
      `
      INSERT INTO onboarding_case_blockers (
        id,
        case_id,
        blocker_key,
        title,
        domain,
        severity,
        status,
        details_json,
        opened_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5,
        $6,
        'open',
        $7::jsonb,
        NOW()
      )
      `,
      [
        randomUUID(),
        caseId,
        blocker.blockerKey,
        blocker.title,
        blocker.domain,
        blocker.severity,
        JSON.stringify(blocker.detailsJson ?? {}),
      ],
    );
  }
}

export async function insertEvent(
  client: PoolClient,
  input: {
    caseId: string;
    actorUserId: string | null;
    eventType: string;
    message: string;
    payloadJson?: Record<string, unknown>;
  },
): Promise<void> {
  const persistedActorUserId = await resolvePersistedActorUserId(
    client,
    input.actorUserId,
  );

  await client.query(
    `
    INSERT INTO onboarding_case_events (
      id,
      case_id,
      actor_user_id,
      event_type,
      message,
      payload_json,
      occurred_at
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4,
      $5,
      $6::jsonb,
      NOW()
    )
    `,
    [
      randomUUID(),
      input.caseId,
      persistedActorUserId,
      input.eventType,
      input.message,
      JSON.stringify(input.payloadJson ?? {}),
    ],
  );
}

async function resolvePersistedActorUserId(
  queryable: DbQueryable,
  actorUserId: string | null,
): Promise<string | null> {
  if (!isUuidString(actorUserId)) {
    return null;
  }

  const result = await queryable.query<{ id: string }>(
    `
    SELECT id::text
    FROM users
    WHERE id::text = $1 OR auth_user_id = $1
    ORDER BY CASE WHEN id::text = $1 THEN 0 ELSE 1 END
    LIMIT 1
    `,
    [actorUserId],
  );

  return result.rows[0]?.id ?? null;
}

export async function listTaskRowsByCaseId(
  queryable: DbQueryable,
  caseId: string,
): Promise<readonly DbOnboardingTaskRow[]> {
  const rows = await queryable.query<DbOnboardingTaskRow>(
    `
    SELECT
      id::text,
      case_id::text,
      task_key,
      title,
      domain,
      task_type,
      status,
      assignee_user_id::text,
      sort_order,
      due_at,
      completed_at,
      details_json,
      created_at,
      updated_at
    FROM onboarding_case_tasks
    WHERE case_id = $1::uuid
    ORDER BY sort_order ASC, created_at ASC
    `,
    [caseId],
  );
  return rows.rows;
}

export async function readTaskRowById(
  queryable: DbQueryable,
  taskId: string,
): Promise<DbOnboardingTaskRow | null> {
  const rows = await queryable.query<DbOnboardingTaskRow>(
    `
    SELECT
      id::text,
      case_id::text,
      task_key,
      title,
      domain,
      task_type,
      status,
      assignee_user_id::text,
      sort_order,
      due_at,
      completed_at,
      details_json,
      created_at,
      updated_at
    FROM onboarding_case_tasks
    WHERE id = $1::uuid
    LIMIT 1
    `,
    [taskId],
  );
  return rows.rows[0] ?? null;
}

export async function listBlockerRowsByCaseId(
  queryable: DbQueryable,
  caseId: string,
): Promise<readonly DbOnboardingBlockerRow[]> {
  const rows = await queryable.query<DbOnboardingBlockerRow>(
    `
    SELECT
      id::text,
      case_id::text,
      blocker_key,
      title,
      domain,
      severity,
      status,
      details_json,
      opened_at,
      resolved_at
    FROM onboarding_case_blockers
    WHERE case_id = $1::uuid
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 3
        WHEN 'warning' THEN 2
        ELSE 1
      END DESC,
      opened_at DESC
    `,
    [caseId],
  );
  return rows.rows;
}

export async function updateTaskProjection(
  client: PoolClient,
  input: {
    caseId: string;
    taskKey: string;
    status: string;
    assignee: string | null;
    dueAt: string | null;
    completedAt: string | null;
    detailsJson: Record<string, unknown>;
  },
): Promise<void> {
  await client.query(
    `
    UPDATE onboarding_case_tasks
    SET
      status = $3,
      assignee_user_id = $4::uuid,
      due_at = $5::timestamptz,
      completed_at = $6::timestamptz,
      details_json = $7::jsonb,
      updated_at = NOW()
    WHERE case_id = $1::uuid
      AND task_key = $2
    `,
    [
      input.caseId,
      input.taskKey,
      input.status,
      input.assignee && isUuidString(input.assignee) ? input.assignee : null,
      input.dueAt,
      input.completedAt,
      JSON.stringify(input.detailsJson),
    ],
  );
}

export async function updateTaskDetailsDraft(
  client: PoolClient,
  input: {
    caseId: string;
    taskKey: string;
    detailsJson: Record<string, unknown>;
  },
): Promise<void> {
  await client.query(
    `
    UPDATE onboarding_case_tasks
    SET
      details_json = $3::jsonb,
      updated_at = NOW()
    WHERE case_id = $1::uuid
      AND task_key = $2
    `,
    [input.caseId, input.taskKey, JSON.stringify(input.detailsJson)],
  );
}

export async function updateBlockerProjection(
  client: PoolClient,
  input: {
    caseId: string;
    blockerKey: string;
    status: string;
    resolvedAt: string | null;
    detailsJson: Record<string, unknown>;
  },
): Promise<void> {
  await client.query(
    `
    UPDATE onboarding_case_blockers
    SET
      status = $3,
      resolved_at = $4::timestamptz,
      details_json = $5::jsonb
    WHERE case_id = $1::uuid
      AND blocker_key = $2
    `,
    [
      input.caseId,
      input.blockerKey,
      input.status,
      input.resolvedAt,
      JSON.stringify(input.detailsJson),
    ],
  );
}

export async function updateCaseProjection(
  client: PoolClient,
  input: {
    caseId: string;
    status: string;
    phase: string;
    readinessStatus: string;
    readinessScore: number;
    processDefinitionVersion?: number;
  },
): Promise<void> {
  await client.query(
    `
    UPDATE onboarding_cases
    SET
      status = $2,
      phase = $3,
      last_readiness_status = $4,
      last_readiness_score = $5,
      process_definition_version = COALESCE($6::int, process_definition_version),
      updated_at = NOW()
    WHERE id = $1::uuid
    `,
    [
      input.caseId,
      input.status,
      input.phase,
      input.readinessStatus,
      input.readinessScore,
      input.processDefinitionVersion ?? null,
    ],
  );
}

export async function updateCaseLifecycleState(
  client: PoolClient,
  input: {
    caseId: string;
    status: string;
    phase?: string | null;
    closedAt?: string | null;
    metadataJsonPatch?: Record<string, unknown>;
  },
): Promise<void> {
  await client.query(
    `
    UPDATE onboarding_cases
    SET
      status = $2,
      phase = COALESCE($3, phase),
      closed_at = $4::timestamptz,
      metadata_json = onboarding_cases.metadata_json || $5::jsonb,
      updated_at = NOW()
    WHERE id = $1::uuid
    `,
    [
      input.caseId,
      input.status,
      input.phase ?? null,
      input.closedAt ?? null,
      JSON.stringify(input.metadataJsonPatch ?? {}),
    ],
  );
}

export async function insertOnboardingSourceRun(
  client: PoolClient,
  input: {
    caseId: string;
    taskId: string;
    sourceKey: string;
    sourceType: string;
    action: string;
    status: string;
    message?: string | null;
    fileName?: string | null;
    fileSizeBytes?: number | null;
    storedPath?: string | null;
    statsJson?: Record<string, unknown>;
    startedAt?: string | null;
    completedAt?: string | null;
  },
): Promise<string> {
  const runId = randomUUID();
  await client.query(
    `
    INSERT INTO onboarding_source_runs (
      id,
      case_id,
      task_id,
      source_key,
      source_type,
      action,
      status,
      message,
      file_name,
      file_size_bytes,
      stored_path,
      stats_json,
      started_at,
      completed_at,
      created_at,
      updated_at
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10::bigint,
      $11,
      $12::jsonb,
      $13::timestamptz,
      $14::timestamptz,
      NOW(),
      NOW()
    )
    `,
    [
      runId,
      input.caseId,
      input.taskId,
      input.sourceKey,
      input.sourceType,
      input.action,
      input.status,
      input.message ?? null,
      input.fileName ?? null,
      input.fileSizeBytes ?? null,
      input.storedPath ?? null,
      JSON.stringify(input.statsJson ?? {}),
      input.startedAt ?? null,
      input.completedAt ?? null,
    ],
  );
  return runId;
}

export async function updateOnboardingSourceRun(
  client: PoolClient,
  input: {
    runId: string;
    status: string;
    message?: string | null;
    statsJson?: Record<string, unknown>;
    completedAt?: string | null;
  },
): Promise<void> {
  await client.query(
    `
    UPDATE onboarding_source_runs
    SET
      status = $2,
      message = COALESCE($3, message),
      stats_json = COALESCE($4::jsonb, stats_json),
      completed_at = $5::timestamptz,
      updated_at = NOW()
    WHERE id = $1::uuid
    `,
    [
      input.runId,
      input.status,
      input.message ?? null,
      input.statsJson ? JSON.stringify(input.statsJson) : null,
      input.completedAt ?? null,
    ],
  );
}

export async function markOpenTasksBlocked(
  client: PoolClient,
  input: {
    caseId: string;
    reason: string;
  },
): Promise<void> {
  await client.query(
    `
    UPDATE onboarding_case_tasks
    SET
      status = CASE WHEN status = 'done' THEN status ELSE 'blocked' END,
      details_json = details_json || $2::jsonb,
      updated_at = NOW()
    WHERE case_id = $1::uuid
    `,
    [
      input.caseId,
      JSON.stringify({
        lifecycleOverride: "blocked",
        lifecycleReason: input.reason,
      }),
    ],
  );
}

export async function readCaseById(queryable: DbQueryable, caseId: string) {
  const result = await queryable.query<DbOnboardingCaseRow>(
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
    WHERE oc.id = $1::uuid
    LIMIT 1
    `,
    [caseId],
  );
  const row = result.rows[0];
  if (!row) {
    throw new PersistenceError("Onboarding case not found.", 404, "NOT_FOUND", {
      caseId,
    });
  }
  return mapCaseRow(row);
}
