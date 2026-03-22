import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import type {
  OnboardingApiSourceActivation,
  OnboardingCaseBundle,
  OnboardingFileSourceActivation,
  OnboardingFileSourceUploadResult,
  OnboardingSourceActivation,
  OnboardingSourceActivationRun,
} from "@praedixa/shared-types/api";

import {
  testIntegrationConnection,
  triggerIntegrationSync,
} from "../admin-integrations.js";
import { readSourceActivations } from "./admin-onboarding-support.js";
import {
  insertEvent,
  insertOnboardingSourceRun,
  readCaseById,
  readTaskRowById,
  updateOnboardingSourceRun,
  updateTaskDetailsDraft,
  withOrganizationWriteScope,
} from "./admin-onboarding-store.js";
import { PersistenceError } from "./persistence.js";
import { readOnboardingCaseBundle } from "./admin-onboarding-runtime.js";

type SourceActionTask = Awaited<ReturnType<typeof readTaskRowById>>;

const MAX_FILE_IMPORT_BYTES = 50 * 1024 * 1024;
const SOURCE_TRANSPORT_BY_MODE = {
  api: "api_pull",
  file: "manual_upload",
  sftp: "sftp_pull",
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractPersistedTaskPayload(
  detailsJson: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const details = asRecord(detailsJson);
  const draftPayload = asRecord(details["draftPayload"]);
  if (Object.keys(draftPayload).length > 0) {
    return draftPayload;
  }
  return asRecord(details["completionPayload"]);
}

function ensureCaseScopedTask(
  task: SourceActionTask,
  caseId: string,
): asserts task is NonNullable<SourceActionTask> {
  if (!task || task.case_id !== caseId) {
    throw new PersistenceError(
      "Onboarding task not found for this case.",
      404,
      "NOT_FOUND",
      { caseId },
    );
  }
}

function getTaskPayload(
  task: NonNullable<SourceActionTask>,
): Record<string, unknown> {
  return extractPersistedTaskPayload(task.details_json);
}

function findSourceActivation(
  payload: Record<string, unknown>,
  sourceId: string,
): OnboardingSourceActivation {
  const source = readSourceActivations(payload, "sourceActivations").find(
    (entry) => entry.id === sourceId,
  );
  if (!source) {
    throw new PersistenceError(
      "Onboarding source activation not found.",
      404,
      "NOT_FOUND",
      { sourceId },
    );
  }
  return source;
}

function replaceSourceActivation(
  payload: Record<string, unknown>,
  sourceId: string,
  nextSource: OnboardingSourceActivation,
): Record<string, unknown> {
  return {
    ...payload,
    sourceActivations: readSourceActivations(payload, "sourceActivations").map(
      (entry) => (entry.id === sourceId ? nextSource : entry),
    ),
  };
}

function withSourceRun(
  source: OnboardingSourceActivation,
  run: OnboardingSourceActivationRun,
  patch?: Partial<OnboardingSourceActivation>,
): OnboardingSourceActivation {
  return {
    ...source,
    ...patch,
    status:
      run.status === "success"
        ? "ready"
        : run.status === "pending"
          ? "processing"
          : "failed",
    lastError:
      run.status === "failed"
        ? (run.errorMessage ?? "Source action failed")
        : null,
    lastRun: run,
  } as OnboardingSourceActivation;
}

async function loadCaseAndTask(
  client: Parameters<typeof withOrganizationWriteScope>[1] extends (
    client: infer T,
  ) => Promise<unknown>
    ? T
    : never,
  input: {
    caseId: string;
    taskId: string;
    expectedOrganizationId: string;
  },
) {
  const caseDetail = await readCaseById(client, input.caseId);
  if (caseDetail.organizationId !== input.expectedOrganizationId) {
    throw new PersistenceError(
      "Onboarding case not found for this organization.",
      404,
      "NOT_FOUND",
      { caseId: input.caseId, organizationId: input.expectedOrganizationId },
    );
  }

  const task = await readTaskRowById(client, input.taskId);
  ensureCaseScopedTask(task, input.caseId);
  return { caseDetail, task };
}

async function persistUpdatedSourcePayload(
  client: Parameters<typeof withOrganizationWriteScope>[1] extends (
    client: infer T,
  ) => Promise<unknown>
    ? T
    : never,
  task: NonNullable<SourceActionTask>,
  payload: Record<string, unknown>,
): Promise<void> {
  const details = {
    ...asRecord(task.details_json),
    draftPayload: payload,
    lastSavedAt: new Date().toISOString(),
  };
  await updateTaskDetailsDraft(client, {
    caseId: task.case_id,
    taskKey: task.task_key,
    detailsJson: details,
  });
}

function getImportRoot(): string {
  return path.resolve(process.cwd(), "../data");
}

function getAppApiRoot(): string {
  return path.resolve(process.cwd(), "../app-api");
}

function normalizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!/^[A-Za-z0-9._-]{3,255}$/.test(trimmed)) {
    throw new PersistenceError(
      "File name contains unsupported characters.",
      422,
      "VALIDATION_ERROR",
      { fileName },
    );
  }
  return trimmed;
}

function resolveFileExtension(fileName: string): "csv" | "xlsx" {
  const extension = path.extname(fileName).replace(".", "").toLowerCase();
  if (extension === "csv" || extension === "xlsx") {
    return extension;
  }
  throw new PersistenceError(
    "Only .csv and .xlsx file imports are supported from onboarding.",
    422,
    "VALIDATION_ERROR",
    { fileName },
  );
}

function buildTargetFilePath(
  organizationSlug: string,
  source: OnboardingFileSourceActivation,
  extension: "csv" | "xlsx",
): { absolutePath: string; relativePath: string } {
  const relativePath = path.posix.join(
    organizationSlug,
    source.domain,
    `${source.datasetKey}.${extension}`,
  );
  return {
    absolutePath: path.join(getImportRoot(), relativePath),
    relativePath,
  };
}

function runTriggerCommand(): string | null {
  const explicit = normalizeText(
    process.env["ONBOARDING_FILE_IMPORT_TRIGGER_COMMAND"],
  );
  if (explicit) {
    return explicit;
  }
  if (process.env["NODE_ENV"] === "development") {
    return "uv run python -m scripts.medallion_pipeline";
  }
  return null;
}

async function executeMedallionTrigger(relativePath: string): Promise<{
  status: "queued" | "success" | "failed";
  message: string | null;
}> {
  const command = runTriggerCommand();
  if (!command) {
    return {
      status: "queued",
      message: "File staged. Waiting for external medallion orchestrator.",
    };
  }

  return await new Promise((resolve) => {
    const child = spawn(command, {
      cwd: getAppApiRoot(),
      env: {
        ...process.env,
      },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          status: "success",
          message: `Medallion pipeline processed ${relativePath}.`,
        });
        return;
      }
      resolve({
        status: "failed",
        message: stderr.trim().slice(0, 400) || "Medallion pipeline failed.",
      });
    });
    child.on("error", (error) => {
      resolve({
        status: "failed",
        message: error.message.slice(0, 400),
      });
    });
  });
}

export async function probeOnboardingApiSource(input: {
  organizationId: string;
  caseId: string;
  taskId: string;
  sourceId: string;
  actorUserId: string;
}): Promise<OnboardingCaseBundle> {
  return await withOrganizationWriteScope(
    input.organizationId,
    async (client) => {
      const { task } = await loadCaseAndTask(client, {
        caseId: input.caseId,
        taskId: input.taskId,
        expectedOrganizationId: input.organizationId,
      });
      const payload = getTaskPayload(task);
      const source = findSourceActivation(payload, input.sourceId);
      if (source.sourceMode !== "api") {
        throw new PersistenceError(
          "Only API sources can be probed from this action.",
          422,
          "VALIDATION_ERROR",
          { sourceId: input.sourceId },
        );
      }

      const runId = await insertOnboardingSourceRun(client, {
        caseId: input.caseId,
        taskId: input.taskId,
        sourceKey: source.id,
        sourceType: "api",
        action: "probe",
        status: "running",
        startedAt: new Date().toISOString(),
        statsJson: {
          connectionId: source.connectionId,
        },
      });

      try {
        const result = await testIntegrationConnection(
          input.organizationId,
          source.connectionId,
          input.actorUserId,
        );
        const nextSource = withSourceRun(
          source,
          {
            status: result.ok ? "success" : "failed",
            triggeredAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            errorMessage:
              result.ok === false
                ? result.warnings.join(" | ") || "Probe failed."
                : null,
          },
          {
            probeStatus: result.ok ? "success" : "failed",
            status: result.ok ? "ready" : "failed",
          },
        ) as OnboardingApiSourceActivation;
        await persistUpdatedSourcePayload(
          client,
          task,
          replaceSourceActivation(payload, source.id, nextSource),
        );
        await updateOnboardingSourceRun(client, {
          runId,
          status: result.ok ? "success" : "failed",
          completedAt: new Date().toISOString(),
          message: result.ok
            ? "API source probe succeeded."
            : "API source probe failed.",
          statsJson: {
            latencyMs: result.latencyMs,
            warnings: result.warnings,
            checkedScopes: result.checkedScopes,
          },
        });
        await insertEvent(client, {
          caseId: input.caseId,
          actorUserId: input.actorUserId,
          eventType: "onboarding.source.probe",
          message: `Probe execute sur la source API ${source.label}.`,
          payloadJson: {
            taskId: input.taskId,
            sourceId: source.id,
            connectionId: source.connectionId,
            ok: result.ok,
          },
        });
        return await readOnboardingCaseBundle(client, input.caseId);
      } catch (error) {
        await updateOnboardingSourceRun(client, {
          runId,
          status: "failed",
          completedAt: new Date().toISOString(),
          message:
            error instanceof Error
              ? error.message.slice(0, 400)
              : "API source probe failed.",
        });
        throw error;
      }
    },
  );
}

export async function syncOnboardingApiSource(input: {
  organizationId: string;
  caseId: string;
  taskId: string;
  sourceId: string;
  actorUserId: string;
}): Promise<OnboardingCaseBundle> {
  return await withOrganizationWriteScope(
    input.organizationId,
    async (client) => {
      const { task } = await loadCaseAndTask(client, {
        caseId: input.caseId,
        taskId: input.taskId,
        expectedOrganizationId: input.organizationId,
      });
      const payload = getTaskPayload(task);
      const source = findSourceActivation(payload, input.sourceId);
      if (source.sourceMode !== "api") {
        throw new PersistenceError(
          "Only API sources can be synced from this action.",
          422,
          "VALIDATION_ERROR",
          { sourceId: input.sourceId },
        );
      }

      const run = await triggerIntegrationSync(
        input.organizationId,
        source.connectionId,
        { triggerType: "manual" },
        input.actorUserId,
      );
      const nextSource = withSourceRun(
        source,
        {
          status: "pending",
          triggeredAt: new Date().toISOString(),
        },
        {
          syncStatus:
            run.status === "success"
              ? "success"
              : run.status === "failed"
                ? "failed"
                : "queued",
          status:
            run.status === "failed"
              ? "failed"
              : source.probeStatus === "success"
                ? "ready"
                : "processing",
        },
      ) as OnboardingApiSourceActivation;
      await persistUpdatedSourcePayload(
        client,
        task,
        replaceSourceActivation(payload, source.id, nextSource),
      );
      await insertOnboardingSourceRun(client, {
        caseId: input.caseId,
        taskId: input.taskId,
        sourceKey: source.id,
        sourceType: "api",
        action: "sync",
        status:
          run.status === "success"
            ? "success"
            : run.status === "failed"
              ? "failed"
              : "queued",
        startedAt: run.startedAt,
        completedAt: run.endedAt,
        message:
          run.status === "failed"
            ? run.errorMessage
            : "Initial API sync triggered.",
        statsJson: {
          integrationRunId: run.id,
          triggerType: run.triggerType,
          status: run.status,
        },
      });
      await insertEvent(client, {
        caseId: input.caseId,
        actorUserId: input.actorUserId,
        eventType: "onboarding.source.sync",
        message: `Premiere sync declenchee pour ${source.label}.`,
        payloadJson: {
          taskId: input.taskId,
          sourceId: source.id,
          connectionId: source.connectionId,
          integrationRunId: run.id,
        },
      });
      return await readOnboardingCaseBundle(client, input.caseId);
    },
  );
}

export async function importOnboardingFileSource(input: {
  organizationId: string;
  caseId: string;
  taskId: string;
  sourceId: string;
  actorUserId: string;
  fileName: string;
  content: Buffer;
}): Promise<OnboardingFileSourceUploadResult> {
  if (input.content.byteLength === 0) {
    throw new PersistenceError(
      "Imported file is empty.",
      422,
      "VALIDATION_ERROR",
    );
  }
  if (input.content.byteLength > MAX_FILE_IMPORT_BYTES) {
    throw new PersistenceError(
      "Imported file exceeds the 50 MB limit.",
      413,
      "PAYLOAD_TOO_LARGE",
    );
  }

  return await withOrganizationWriteScope(
    input.organizationId,
    async (client) => {
      const { caseDetail, task } = await loadCaseAndTask(client, {
        caseId: input.caseId,
        taskId: input.taskId,
        expectedOrganizationId: input.organizationId,
      });
      const payload = getTaskPayload(task);
      const source = findSourceActivation(payload, input.sourceId);
      if (source.sourceMode === "api") {
        throw new PersistenceError(
          "API sources do not accept file imports.",
          422,
          "VALIDATION_ERROR",
          { sourceId: input.sourceId },
        );
      }

      const normalizedFileName = normalizeFileName(input.fileName);
      const extension = resolveFileExtension(normalizedFileName);
      const target = buildTargetFilePath(
        caseDetail.organizationSlug ?? caseDetail.organizationId,
        source,
        extension,
      );

      await fs.mkdir(path.dirname(target.absolutePath), { recursive: true });
      await fs.writeFile(target.absolutePath, input.content, { mode: 0o600 });

      const startedAt = new Date().toISOString();
      const runId = await insertOnboardingSourceRun(client, {
        caseId: input.caseId,
        taskId: input.taskId,
        sourceKey: source.id,
        sourceType: source.sourceMode,
        action: "file_import",
        status: "running",
        fileName: normalizedFileName,
        fileSizeBytes: input.content.byteLength,
        storedPath: target.relativePath,
        startedAt,
        statsJson: {
          importProfile: source.importProfile,
          datasetKey: source.datasetKey,
          domain: source.domain,
        },
      });

      const triggerResult = await executeMedallionTrigger(target.relativePath);
      const completedAt = new Date().toISOString();
      const activationRun: OnboardingSourceActivationRun = {
        status:
          triggerResult.status === "success"
            ? "success"
            : triggerResult.status === "failed"
              ? "failed"
              : "pending",
        triggeredAt: startedAt,
        completedAt: triggerResult.status === "queued" ? null : completedAt,
        errorMessage:
          triggerResult.status === "failed" ? triggerResult.message : null,
      };
      const nextSource = withSourceRun(
        {
          ...source,
          transport: SOURCE_TRANSPORT_BY_MODE[source.sourceMode],
        } as OnboardingFileSourceActivation,
        activationRun,
        {
          fileName: normalizedFileName,
          fileFormat: extension,
          storedRelativePath: target.relativePath,
          uploadedAt: startedAt,
        },
      ) as OnboardingFileSourceActivation;
      const nextPayload = {
        ...replaceSourceActivation(payload, source.id, nextSource),
        sampleFileReceived: true,
      };

      await persistUpdatedSourcePayload(client, task, nextPayload);
      await updateOnboardingSourceRun(client, {
        runId,
        status: triggerResult.status,
        completedAt: triggerResult.status === "queued" ? null : completedAt,
        message: triggerResult.message,
        statsJson: {
          relativePath: target.relativePath,
          triggerStatus: triggerResult.status,
        },
      });
      await insertEvent(client, {
        caseId: input.caseId,
        actorUserId: input.actorUserId,
        eventType: "onboarding.source.file_import",
        message: `Fichier ${normalizedFileName} importe pour ${source.label}.`,
        payloadJson: {
          taskId: input.taskId,
          sourceId: source.id,
          relativePath: target.relativePath,
          triggerStatus: triggerResult.status,
        },
      });

      return {
        activation: nextSource,
        bundle: await readOnboardingCaseBundle(client, input.caseId),
      };
    },
  );
}
