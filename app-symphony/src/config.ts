import os from "node:os";
import path from "node:path";

import { z } from "zod";

import type {
  CodexConfig,
  HarnessConfig,
  ServiceConfig,
  StatusServerConfig,
  WorkflowDefinition,
} from "./types.js";
import { normalizeStateName } from "./utils.js";

const DEFAULT_TRACKER_ENDPOINT = "https://api.linear.app/graphql";
const DEFAULT_ACTIVE_STATES = ["Todo", "In Progress"];
const DEFAULT_TERMINAL_STATES = [
  "Closed",
  "Cancelled",
  "Canceled",
  "Duplicate",
  "Done",
];
const DEFAULT_WORKSPACE_ROOT = path.join(os.tmpdir(), "symphony_workspaces");
const DEFAULT_HOOK_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_MAX_CONCURRENT_AGENTS = 10;
const DEFAULT_MAX_RETRY_BACKOFF_MS = 300_000;
const DEFAULT_MAX_TURNS = 20;
const DEFAULT_TURN_TIMEOUT_MS = 3_600_000;
const DEFAULT_READ_TIMEOUT_MS = 5_000;
const DEFAULT_STALL_TIMEOUT_MS = 300_000;

const workflowFrontmatterSchema = z.object({
  tracker: z.record(z.unknown()).optional(),
  polling: z.record(z.unknown()).optional(),
  workspace: z.record(z.unknown()).optional(),
  hooks: z.record(z.unknown()).optional(),
  agent: z.record(z.unknown()).optional(),
  codex: z.record(z.unknown()).optional(),
  harness: z.record(z.unknown()).optional(),
  server: z.record(z.unknown()).optional(),
});

function parseInteger(
  value: unknown,
  fallback: number,
  options?: { minimum?: number; allowZero?: boolean },
): number {
  const minimum = options?.minimum ?? 1;
  const allowZero = options?.allowZero ?? false;
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(raw)) {
    return fallback;
  }

  if (allowZero && raw === 0) {
    return 0;
  }

  return raw >= minimum ? raw : fallback;
}

function parseStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const parsed = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return parsed.length > 0 ? parsed : [...fallback];
}

function resolveEnvToken(raw: unknown, env: NodeJS.ProcessEnv): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const value = raw.trim();
  if (value.length === 0) {
    return null;
  }
  if (!value.startsWith("$")) {
    return value;
  }
  const envName = value.slice(1).trim();
  if (envName.length === 0) {
    return null;
  }
  const resolved = env[envName]?.trim() ?? "";
  return resolved.length > 0 ? resolved : null;
}

function expandPathLike(
  raw: unknown,
  workflowDir: string,
  env: NodeJS.ProcessEnv,
  fallback: string,
): string {
  const resolved = resolveEnvToken(raw, env) ?? String(raw ?? "").trim();
  const value = resolved.length > 0 ? resolved : fallback;
  const withHome =
    value === "~"
      ? os.homedir()
      : value.startsWith(`~${path.sep}`)
        ? path.join(os.homedir(), value.slice(2))
        : value;

  return path.isAbsolute(withHome)
    ? path.normalize(withHome)
    : path.resolve(workflowDir, withHome);
}

function normalizeApprovalPolicy(
  value: unknown,
): string | Record<string, unknown> | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  const aliasMap = new Map<string, string>([
    ["unlessTrusted", "untrusted"],
    ["unless-trusted", "untrusted"],
    ["untrusted", "untrusted"],
    ["onFailure", "on-failure"],
    ["on-failure", "on-failure"],
    ["onRequest", "on-request"],
    ["on-request", "on-request"],
    ["never", "never"],
  ]);
  return aliasMap.get(normalized) ?? normalized;
}

function normalizeSandboxMode(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const normalized = value.trim();
  const aliasMap = new Map<string, string>([
    ["readOnly", "read-only"],
    ["read-only", "read-only"],
    ["workspaceWrite", "workspace-write"],
    ["workspace-write", "workspace-write"],
    ["dangerFullAccess", "danger-full-access"],
    ["danger-full-access", "danger-full-access"],
  ]);
  return aliasMap.get(normalized) ?? normalized;
}

function normalizeSandboxPolicy(
  value: unknown,
): CodexConfig["turnSandboxPolicy"] {
  if (value == null || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const rawType = typeof record.type === "string" ? record.type.trim() : "";
  const typeAliasMap = new Map<string, string>([
    ["dangerFullAccess", "dangerFullAccess"],
    ["danger-full-access", "dangerFullAccess"],
    ["readOnly", "readOnly"],
    ["read-only", "readOnly"],
    ["externalSandbox", "externalSandbox"],
    ["external-sandbox", "externalSandbox"],
    ["workspaceWrite", "workspaceWrite"],
    ["workspace-write", "workspaceWrite"],
  ]);
  const type = typeAliasMap.get(rawType) ?? null;
  if (type == null) {
    return null;
  }

  const writableRoots = Array.isArray(record.writableRoots)
    ? record.writableRoots.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      )
    : undefined;
  const readableRoots = Array.isArray(record.readableRoots)
    ? record.readableRoots.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      )
    : undefined;

  return {
    type,
    networkAccess:
      typeof record.networkAccess === "string" ||
      typeof record.networkAccess === "boolean"
        ? record.networkAccess
        : undefined,
    writableRoots,
    readableRoots,
    includePlatformDefaults:
      typeof record.includePlatformDefaults === "boolean"
        ? record.includePlatformDefaults
        : undefined,
    excludeSlashTmp:
      typeof record.excludeSlashTmp === "boolean"
        ? record.excludeSlashTmp
        : undefined,
    excludeTmpdirEnvVar:
      typeof record.excludeTmpdirEnvVar === "boolean"
        ? record.excludeTmpdirEnvVar
        : undefined,
  };
}

function parsePerStateConcurrency(value: unknown): Map<string, number> {
  const entries = new Map<string, number>();
  if (value == null || typeof value !== "object") {
    return entries;
  }

  for (const [state, limit] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const parsed = parseInteger(limit, -1);
    if (parsed > 0) {
      entries.set(normalizeStateName(state), parsed);
    }
  }

  return entries;
}

function parseHarnessConfig(
  rawHarness: Record<string, unknown> | undefined,
): HarnessConfig {
  return {
    strategy:
      rawHarness?.strategy === "directory" ? "directory" : "git_worktree",
    baseRef:
      typeof rawHarness?.base_ref === "string" && rawHarness.base_ref.trim()
        ? rawHarness.base_ref.trim()
        : "HEAD",
    branchPrefix:
      typeof rawHarness?.branch_prefix === "string" &&
      rawHarness.branch_prefix.trim()
        ? rawHarness.branch_prefix.trim()
        : "symphony/",
    copyFiles: parseStringArray(rawHarness?.copy_files, []),
    portCount: parseInteger(rawHarness?.port_count, 4),
    metadataDirName:
      typeof rawHarness?.metadata_dir_name === "string" &&
      rawHarness.metadata_dir_name.trim()
        ? rawHarness.metadata_dir_name.trim()
        : ".symphony",
  };
}

function parseStatusServerConfig(
  rawServer: Record<string, unknown> | undefined,
): StatusServerConfig {
  const port = parseInteger(rawServer?.port, 0, { allowZero: true });
  const rawPort = rawServer?.port;
  const portExplicitlyConfigured =
    rawPort === 0 ||
    rawPort === "0" ||
    (typeof rawPort === "number" && Number.isFinite(rawPort) && rawPort > 0) ||
    (typeof rawPort === "string" &&
      rawPort.trim().length > 0 &&
      Number.parseInt(rawPort, 10) > 0);
  return {
    host:
      typeof rawServer?.host === "string" && rawServer.host.trim()
        ? rawServer.host.trim()
        : "127.0.0.1",
    port: portExplicitlyConfigured ? port : null,
  };
}

export function buildServiceConfig(
  workflow: WorkflowDefinition,
  env: NodeJS.ProcessEnv,
  processCwd: string,
): ServiceConfig {
  const parsed = workflowFrontmatterSchema.parse(workflow.config);
  const tracker = parsed.tracker ?? {};
  const polling = parsed.polling ?? {};
  const workspace = parsed.workspace ?? {};
  const hooks = parsed.hooks ?? {};
  const agent = parsed.agent ?? {};
  const codex = parsed.codex ?? {};

  const activeStates = parseStringArray(
    tracker.active_states,
    DEFAULT_ACTIVE_STATES,
  );
  const terminalStates = parseStringArray(
    tracker.terminal_states,
    DEFAULT_TERMINAL_STATES,
  );

  const trackerApiKey =
    resolveEnvToken(tracker.api_key, env) ?? env.LINEAR_API_KEY?.trim() ?? null;

  return {
    processCwd,
    workflowPath: workflow.filePath,
    workflowDir: path.dirname(workflow.filePath),
    tracker: {
      kind:
        typeof tracker.kind === "string" && tracker.kind.trim().length > 0
          ? tracker.kind.trim()
          : "",
      endpoint:
        resolveEnvToken(tracker.endpoint, env) ?? DEFAULT_TRACKER_ENDPOINT,
      apiKey: trackerApiKey ?? "",
      projectSlug: resolveEnvToken(tracker.project_slug, env) ?? "",
      activeStates,
      terminalStates,
      normalizedActiveStates: new Set(activeStates.map(normalizeStateName)),
      normalizedTerminalStates: new Set(terminalStates.map(normalizeStateName)),
    },
    polling: {
      intervalMs: parseInteger(polling.interval_ms, DEFAULT_POLL_INTERVAL_MS, {
        minimum: 1,
      }),
    },
    workspace: {
      root: resolveEnvToken(workspace.root, env) ?? DEFAULT_WORKSPACE_ROOT,
      absoluteRoot: expandPathLike(
        workspace.root,
        path.dirname(workflow.filePath),
        env,
        DEFAULT_WORKSPACE_ROOT,
      ),
    },
    hooks: {
      afterCreate:
        typeof hooks.after_create === "string" ? hooks.after_create : null,
      beforeRun: typeof hooks.before_run === "string" ? hooks.before_run : null,
      afterRun: typeof hooks.after_run === "string" ? hooks.after_run : null,
      beforeRemove:
        typeof hooks.before_remove === "string" ? hooks.before_remove : null,
      timeoutMs: parseInteger(hooks.timeout_ms, DEFAULT_HOOK_TIMEOUT_MS, {
        minimum: 1,
      }),
    },
    agent: {
      maxConcurrentAgents: parseInteger(
        agent.max_concurrent_agents,
        DEFAULT_MAX_CONCURRENT_AGENTS,
      ),
      maxConcurrentAgentsByState: parsePerStateConcurrency(
        agent.max_concurrent_agents_by_state,
      ),
      maxRetryBackoffMs: parseInteger(
        agent.max_retry_backoff_ms,
        DEFAULT_MAX_RETRY_BACKOFF_MS,
      ),
      maxTurns: parseInteger(agent.max_turns, DEFAULT_MAX_TURNS),
    },
    codex: {
      command:
        typeof codex.command === "string" && codex.command.trim().length > 0
          ? codex.command.trim()
          : "codex app-server",
      approvalPolicy: normalizeApprovalPolicy(codex.approval_policy),
      approvalsReviewer:
        typeof codex.approvals_reviewer === "string"
          ? codex.approvals_reviewer
          : null,
      threadSandbox: normalizeSandboxMode(codex.thread_sandbox),
      turnSandboxPolicy: normalizeSandboxPolicy(codex.turn_sandbox_policy) ?? {
        type: "workspaceWrite",
        networkAccess: true,
      },
      turnTimeoutMs: parseInteger(
        codex.turn_timeout_ms,
        DEFAULT_TURN_TIMEOUT_MS,
      ),
      readTimeoutMs: parseInteger(
        codex.read_timeout_ms,
        DEFAULT_READ_TIMEOUT_MS,
      ),
      stallTimeoutMs: parseInteger(
        codex.stall_timeout_ms,
        DEFAULT_STALL_TIMEOUT_MS,
        { minimum: 1, allowZero: true },
      ),
      model: typeof codex.model === "string" ? codex.model : null,
      effort: typeof codex.effort === "string" ? codex.effort : null,
      summary: typeof codex.summary === "string" ? codex.summary : null,
      personality:
        typeof codex.personality === "string" ? codex.personality : null,
      serviceTier:
        typeof codex.service_tier === "string" ? codex.service_tier : null,
    },
    harness: parseHarnessConfig(parsed.harness),
    server: parseStatusServerConfig(parsed.server),
  };
}

export function validateDispatchConfig(config: ServiceConfig): void {
  if (config.tracker.kind !== "linear") {
    throw new Error("unsupported_tracker_kind");
  }
  if (config.tracker.apiKey.trim().length === 0) {
    throw new Error("missing_tracker_api_key");
  }
  if (config.tracker.projectSlug.trim().length === 0) {
    throw new Error("missing_tracker_project_slug");
  }
  if (config.codex.command.trim().length === 0) {
    throw new Error("missing_codex_command");
  }
}
