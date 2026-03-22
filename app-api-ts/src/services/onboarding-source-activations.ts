import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import type {
  OnboardingApiSourceActivation,
  OnboardingApiSourceActivationResult,
  OnboardingCaseBundle,
  OnboardingFileFormat,
  OnboardingFileSourceActivation,
  OnboardingFileSourceUploadResult,
  OnboardingSourceActivation,
  OnboardingSourceActivationRun,
} from "@praedixa/shared-types/api";
import type { PoolClient } from "pg";

import {
  getIntegrationConnection,
  testIntegrationConnection,
  triggerIntegrationSync,
} from "../admin-integrations.js";
import { PersistenceError } from "./persistence.js";
import {
  readCaseById,
  withOrganizationWriteScope,
} from "./admin-onboarding-store.js";
import {
  readOnboardingCaseBundle,
  saveOnboardingCaseTaskDraft,
} from "./admin-onboarding-runtime.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");
const APP_API_ROOT = path.join(REPO_ROOT, "app-api");
const DEFAULT_DATA_ROOT = path.join(REPO_ROOT, "data");
const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = new Set<OnboardingFileFormat>([
  "csv",
  "tsv",
  "xlsx",
]);
const SEGMENT_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;

type BinaryHeaders = Record<string, string | string[] | undefined>;

type UploadSourceInput = {
  organizationId: string;
  caseId: string;
  taskId: string;
  actorUserId: string;
  headers: BinaryHeaders;
  rawBodyBytes: Buffer | null;
};

type ActivateApiSourceInput = {
  organizationId: string;
  caseId: string;
  taskId: string;
  actorUserId: string;
  connectionId: string;
};

type UploadFields = {
  label: string;
  domain: string;
  datasetKey: string;
  importProfile: string;
  replayStrategy: string | null;
  file: File;
};

type SourceTaskContext = {
  bundle: OnboardingCaseBundle;
  task: OnboardingCaseBundle["tasks"][number];
  organizationSlug: string;
};

type MedallionMatch = {
  manifestMatched: boolean;
  quarantined: boolean;
  errorMessage: string | null;
};

function resolveDataRoot(): string {
  const configured = process.env["INGEST_LANDING_ROOT"]?.trim();
  if (!configured) {
    return DEFAULT_DATA_ROOT;
  }
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(REPO_ROOT, configured);
}

function resolveMaxUploadBytes(): number {
  const raw = process.env["ONBOARDING_SOURCE_UPLOAD_MAX_BYTES"]?.trim();
  if (!raw) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }
  return Math.min(parsed, 100 * 1024 * 1024);
}

function normalizeSegment(value: string, label: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (!SEGMENT_PATTERN.test(normalized)) {
    throw new PersistenceError(
      `${label} contains unsupported characters.`,
      422,
      "VALIDATION_ERROR",
      { [label]: value },
    );
  }
  return normalized;
}

function resolveFileFormat(fileName: string): OnboardingFileFormat {
  const ext = path.extname(fileName).toLowerCase().replace(/^\./, "");
  if (!ALLOWED_FILE_EXTENSIONS.has(ext as OnboardingFileFormat)) {
    throw new PersistenceError(
      "Only .csv, .tsv, and .xlsx uploads are allowed.",
      422,
      "VALIDATION_ERROR",
      { fileName },
    );
  }
  return ext as OnboardingFileFormat;
}

function buildHeaders(headers: BinaryHeaders): Headers {
  const out = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      out.set(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        out.append(key, item);
      }
    }
  }
  return out;
}

async function parseUploadFields(
  headers: BinaryHeaders,
  rawBodyBytes: Buffer | null,
): Promise<UploadFields> {
  if (!rawBodyBytes || rawBodyBytes.byteLength === 0) {
    throw new PersistenceError(
      "A file upload payload is required.",
      400,
      "INVALID_BODY",
    );
  }

  const contentType = String(headers["content-type"] ?? "");
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw new PersistenceError(
      "File upload requests must use multipart/form-data.",
      415,
      "UNSUPPORTED_MEDIA_TYPE",
    );
  }

  const request = new Request("http://localhost/internal/onboarding-upload", {
    method: "POST",
    headers: buildHeaders(headers),
    body: rawBodyBytes,
  });
  const formData = await request.formData();
  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    throw new PersistenceError(
      "The upload must include a file field.",
      422,
      "VALIDATION_ERROR",
      { field: "file" },
    );
  }

  const label = String(formData.get("label") ?? "").trim();
  const domain = String(formData.get("domain") ?? "").trim();
  const datasetKey = String(formData.get("datasetKey") ?? "").trim();
  const importProfile = String(formData.get("importProfile") ?? "").trim();
  const replayStrategyRaw = String(formData.get("replayStrategy") ?? "").trim();

  if (!label || !domain || !datasetKey || !importProfile) {
    throw new PersistenceError(
      "label, domain, datasetKey, and importProfile are required.",
      422,
      "VALIDATION_ERROR",
    );
  }

  const uploadedBytes = fileEntry.size;
  if (uploadedBytes <= 0) {
    throw new PersistenceError(
      "Uploaded file is empty.",
      422,
      "VALIDATION_ERROR",
      { field: "file" },
    );
  }
  if (uploadedBytes > resolveMaxUploadBytes()) {
    throw new PersistenceError(
      "Uploaded file exceeds the allowed size.",
      413,
      "PAYLOAD_TOO_LARGE",
      { maxBytes: resolveMaxUploadBytes() },
    );
  }

  return {
    label,
    domain: normalizeSegment(domain, "domain"),
    datasetKey: normalizeSegment(datasetKey, "datasetKey"),
    importProfile: importProfile.trim(),
    replayStrategy: replayStrategyRaw || null,
    file: fileEntry,
  };
}

function assertTaskKey(
  task: OnboardingCaseBundle["tasks"][number],
  expectedTaskKey: string,
): void {
  if (task.taskKey !== expectedTaskKey) {
    throw new PersistenceError(
      `Task ${task.id} does not match ${expectedTaskKey}.`,
      409,
      "CONFLICT",
      { taskId: task.id, taskKey: task.taskKey, expectedTaskKey },
    );
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readDraftPayload(
  task: OnboardingCaseBundle["tasks"][number],
): Record<string, unknown> {
  const draftPayload = asRecord(task.detailsJson["draftPayload"]);
  if (Object.keys(draftPayload).length > 0) {
    return draftPayload;
  }
  return asRecord(task.detailsJson["completionPayload"]);
}

function readSourceActivations(
  payload: Record<string, unknown>,
): OnboardingSourceActivation[] {
  const rawValue = payload["sourceActivations"];
  if (!Array.isArray(rawValue)) {
    return [];
  }
  return rawValue.filter((entry): entry is OnboardingSourceActivation =>
    Boolean(entry && typeof entry === "object"),
  );
}

function upsertSourceActivation(
  payload: Record<string, unknown>,
  activation: OnboardingSourceActivation,
): Record<string, unknown> {
  const current = readSourceActivations(payload).filter(
    (entry) => entry.id !== activation.id,
  );
  return {
    ...payload,
    sourceActivations: [...current, activation],
  };
}

async function loadSourceTaskContext(
  client: PoolClient,
  caseId: string,
  taskId: string,
): Promise<SourceTaskContext> {
  const caseDetail = await readCaseById(client, caseId);
  const bundle = await readOnboardingCaseBundle(client, caseId);
  const task = bundle.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    throw new PersistenceError("Onboarding task not found.", 404, "NOT_FOUND", {
      caseId,
      taskId,
    });
  }

  const organizationSlug = caseDetail.organizationSlug?.trim();
  if (!organizationSlug) {
    throw new PersistenceError(
      "Organization slug is required for source activation.",
      422,
      "VALIDATION_ERROR",
      { caseId },
    );
  }

  return {
    bundle,
    task,
    organizationSlug: normalizeSegment(organizationSlug, "organizationSlug"),
  };
}

async function storeUploadedFile(args: {
  organizationSlug: string;
  domain: string;
  datasetKey: string;
  file: File;
  fileFormat: OnboardingFileFormat;
}): Promise<{ storedRelativePath: string; storedAbsolutePath: string }> {
  const relativePath = path.join(
    args.organizationSlug,
    args.domain,
    `${args.datasetKey}.${args.fileFormat}`,
  );
  const absolutePath = path.join(resolveDataRoot(), relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const bytes = Buffer.from(await args.file.arrayBuffer());
  await fs.writeFile(absolutePath, bytes);
  return {
    storedRelativePath: relativePath.replaceAll(path.sep, "/"),
    storedAbsolutePath: absolutePath,
  };
}

async function parseJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function runMedallionOrchestrator(): Promise<{
  run: OnboardingSourceActivationRun;
}> {
  const child = spawn(
    "uv",
    [
      "run",
      "python",
      "-m",
      "scripts.medallion_orchestrator",
      "--once",
      "--config",
      "config/medallion/orchestrator.json",
    ],
    {
      cwd: APP_API_ROOT,
      env: {
        ...process.env,
      },
    },
  );

  const startedAt = new Date().toISOString();
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

  const lastRunSummary = await parseJsonFile<{
    run_at?: string;
    bronze_files?: number;
    silver_rows?: number;
    gold_rows?: number;
  }>(path.join(REPO_ROOT, "data-ready", "reports", "last_run_summary.json"));
  const heartbeat = await parseJsonFile<{
    changed?: boolean;
    message?: string;
  }>(
    path.join(
      REPO_ROOT,
      "data-ready",
      "reports",
      "orchestrator_heartbeat.json",
    ),
  );

  if (exitCode !== 0) {
    return {
      run: {
        status: "failed",
        triggeredAt: startedAt,
        completedAt: new Date().toISOString(),
        errorMessage: stderr.trim() || "Medallion orchestrator failed.",
      },
    };
  }

  return {
    run: {
      status: "success",
      triggeredAt: startedAt,
      completedAt: new Date().toISOString(),
      bronzeFiles: Number(lastRunSummary?.bronze_files ?? 0),
      silverRows: Number(lastRunSummary?.silver_rows ?? 0),
      goldRows: Number(lastRunSummary?.gold_rows ?? 0),
      quarantinedFiles: heartbeat?.changed === false ? 0 : null,
      errorMessage: null,
    },
  };
}

async function inspectUploadedSource(
  pathToMatch: string,
): Promise<MedallionMatch> {
  const outputRoot = path.join(REPO_ROOT, "data-ready");
  const manifestsRoot = path.join(outputRoot, "bronze", "_manifests");
  const quarantineRoot = path.join(outputRoot, "quarantine", "_manifests");

  const latestManifestMatch = await findManifestMatch(
    manifestsRoot,
    pathToMatch,
  );
  if (latestManifestMatch) {
    return {
      manifestMatched: true,
      quarantined: false,
      errorMessage: null,
    };
  }

  const latestQuarantineMatch = await findQuarantineMatch(
    quarantineRoot,
    pathToMatch,
  );
  if (latestQuarantineMatch) {
    return {
      manifestMatched: false,
      quarantined: true,
      errorMessage: latestQuarantineMatch.reason_detail ?? "File quarantined.",
    };
  }

  return {
    manifestMatched: false,
    quarantined: false,
    errorMessage: null,
  };
}

async function listJsonFiles(root: string): Promise<string[]> {
  try {
    const names = await fs.readdir(root);
    return names
      .filter((entry) => entry.endsWith(".json"))
      .sort()
      .reverse()
      .map((entry) => path.join(root, entry));
  } catch {
    return [];
  }
}

async function findManifestMatch(
  root: string,
  sourcePath: string,
): Promise<boolean> {
  const candidates = await listJsonFiles(root);
  for (const candidate of candidates.slice(0, 5)) {
    try {
      const payload = JSON.parse(
        await fs.readFile(candidate, "utf8"),
      ) as Array<{
        source_path?: string;
      }>;
      if (
        Array.isArray(payload) &&
        payload.some((entry) => entry.source_path === sourcePath)
      ) {
        return true;
      }
    } catch {
      // ignore broken manifests
    }
  }
  return false;
}

async function findQuarantineMatch(
  root: string,
  sourcePath: string,
): Promise<{ reason_detail?: string } | null> {
  const candidates = await listJsonFiles(root);
  for (const candidate of candidates.slice(0, 5)) {
    try {
      const payload = JSON.parse(
        await fs.readFile(candidate, "utf8"),
      ) as Array<{
        source_path?: string;
        reason_detail?: string;
      }>;
      if (!Array.isArray(payload)) {
        continue;
      }
      const match = payload.find((entry) => entry.source_path === sourcePath);
      if (match) {
        return typeof match.reason_detail === "string"
          ? { reason_detail: match.reason_detail }
          : {};
      }
    } catch {
      // ignore broken manifests
    }
  }
  return null;
}

export async function uploadOnboardingFileSource(
  input: UploadSourceInput,
): Promise<OnboardingFileSourceUploadResult> {
  const uploadFields = await parseUploadFields(
    input.headers,
    input.rawBodyBytes,
  );
  const fileFormat = resolveFileFormat(uploadFields.file.name);

  return await withOrganizationWriteScope(
    input.organizationId,
    async (client) => {
      const context = await loadSourceTaskContext(
        client,
        input.caseId,
        input.taskId,
      );
      assertTaskKey(context.task, "configure-file-sources");

      const activationId = `file:${uploadFields.domain}:${uploadFields.datasetKey}`;
      const stored = await storeUploadedFile({
        organizationSlug: context.organizationSlug,
        domain: uploadFields.domain,
        datasetKey: uploadFields.datasetKey,
        file: uploadFields.file,
        fileFormat,
      });
      const medallionResult = await runMedallionOrchestrator();
      const medallionMatch = await inspectUploadedSource(
        stored.storedAbsolutePath,
      );
      const activationStatus =
        medallionResult.run.status === "failed" || medallionMatch.quarantined
          ? "failed"
          : "ready";
      const activation: OnboardingFileSourceActivation = {
        id: activationId,
        label: uploadFields.label,
        sourceMode: "file",
        transport: "manual_upload",
        datasetKey: uploadFields.datasetKey,
        domain: uploadFields.domain,
        importProfile: uploadFields.importProfile,
        replayStrategy: uploadFields.replayStrategy,
        status: activationStatus,
        lastError:
          medallionMatch.errorMessage ??
          medallionResult.run.errorMessage ??
          null,
        lastRun: medallionResult.run,
        fileName: uploadFields.file.name,
        fileFormat,
        storedRelativePath: stored.storedRelativePath,
        uploadedAt: new Date().toISOString(),
      };

      const nextPayload = upsertSourceActivation(
        readDraftPayload(context.task),
        activation,
      );
      nextPayload["importProfile"] = uploadFields.importProfile;
      nextPayload["replayStrategy"] = uploadFields.replayStrategy;
      nextPayload["sampleFileReceived"] = true;

      const bundle = await saveOnboardingCaseTaskDraft(client, {
        caseId: input.caseId,
        taskId: input.taskId,
        actorUserId: input.actorUserId,
        payloadJson: nextPayload,
      });

      return {
        activation,
        bundle,
      };
    },
  );
}

export async function activateOnboardingApiSource(
  input: ActivateApiSourceInput,
): Promise<OnboardingApiSourceActivationResult> {
  return await withOrganizationWriteScope(
    input.organizationId,
    async (client) => {
      const context = await loadSourceTaskContext(
        client,
        input.caseId,
        input.taskId,
      );
      assertTaskKey(context.task, "activate-api-sources");

      const connection = await getIntegrationConnection(
        input.organizationId,
        input.connectionId,
      );
      const activationId = `api:${connection.id}`;
      let probeStatus: OnboardingApiSourceActivation["probeStatus"] = "pending";
      let syncStatus: OnboardingApiSourceActivation["syncStatus"] = "pending";
      let lastError: string | null = null;

      try {
        await testIntegrationConnection(
          input.organizationId,
          input.connectionId,
          input.actorUserId,
        );
        probeStatus = "success";
      } catch (error) {
        probeStatus = "failed";
        lastError =
          error instanceof Error ? error.message : "Connection test failed.";
      }

      if (probeStatus === "success") {
        try {
          const sync = await triggerIntegrationSync(
            input.organizationId,
            input.connectionId,
            {
              triggerType: "manual",
              forceFull: false,
            },
            input.actorUserId,
          );
          syncStatus = sync.status === "canceled" ? "failed" : sync.status;
        } catch (error) {
          syncStatus = "failed";
          lastError =
            error instanceof Error ? error.message : "Initial sync failed.";
        }
      }

      const activation: OnboardingApiSourceActivation = {
        id: activationId,
        label: connection.displayName,
        sourceMode: "api",
        transport: "api_pull",
        datasetKey: connection.vendor,
        domain: "api",
        importProfile: connection.vendor,
        replayStrategy: null,
        status:
          probeStatus === "success" && syncStatus !== "failed"
            ? "ready"
            : "failed",
        lastError,
        lastRun: {
          status: syncStatus === "failed" ? "failed" : "success",
          triggeredAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          errorMessage: lastError,
        },
        connectionId: connection.id,
        vendor: connection.vendor,
        displayName: connection.displayName,
        probeStatus,
        syncStatus,
      };

      const nextPayload = upsertSourceActivation(
        readDraftPayload(context.task),
        activation,
      );
      nextPayload["datasetsValidated"] =
        nextPayload["datasetsValidated"] === true ? true : null;

      const bundle = await saveOnboardingCaseTaskDraft(client, {
        caseId: input.caseId,
        taskId: input.taskId,
        actorUserId: input.actorUserId,
        payloadJson: nextPayload,
      });

      return {
        activation,
        bundle,
      };
    },
  );
}
