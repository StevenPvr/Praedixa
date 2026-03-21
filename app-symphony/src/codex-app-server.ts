import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";

import { createLogCorrelation } from "./logging.js";
import { LinearClient } from "./linear-client.js";
import type {
  DynamicToolResult,
  IssueRecord,
  LiveSession,
  ServiceConfig,
  TurnSandboxPolicy,
  WorkflowDefinition,
  WorkspaceInfo,
} from "./types.js";
import { nowIso, truncateText } from "./utils.js";
import { buildContinuationPrompt, renderWorkflowPrompt } from "./workflow.js";

interface JsonRpcRequest {
  id: number | string;
  method: string;
  params?: unknown;
}

interface JsonRpcNotification {
  method: string;
  params?: unknown;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export interface CodexEventPayload {
  event: string;
  message?: string | null;
  session?: Partial<LiveSession> | null;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
  rateLimits?: unknown;
}

export interface AgentRunResult {
  status:
    | "succeeded"
    | "failed"
    | "timed_out"
    | "stalled"
    | "turn_input_required"
    | "cancelled";
  workspace: WorkspaceInfo;
  issue: IssueRecord;
  error: string | null;
}

interface RunAgentAttemptOptions {
  issue: IssueRecord;
  attempt: number | null;
  workflow: WorkflowDefinition;
  config: ServiceConfig;
  workspace: WorkspaceInfo;
  tracker: LinearClient;
  logger: ReturnType<typeof import("./logging.js").createSymphonyLogger>;
  signal: AbortSignal;
  onEvent: (payload: CodexEventPayload) => void;
}

function stripGraphqlComments(query: string): string {
  return query.replace(/#[^\n\r]*/g, "");
}

function countGraphqlOperations(query: string): number {
  const sanitized = stripGraphqlComments(query);
  const matches = sanitized.match(/\b(query|mutation|subscription)\b/g);
  if (matches != null && matches.length > 0) {
    return matches.length;
  }

  let braceDepth = 0;
  let operationCount = 0;
  for (const char of sanitized) {
    if (char === "{") {
      if (braceDepth === 0) {
        operationCount += 1;
      }
      braceDepth += 1;
      continue;
    }
    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
    }
  }
  return operationCount;
}

export function validateLinearGraphqlToolArguments(
  params: Record<string, unknown> | string,
): {
  query: string;
  variables: Record<string, unknown> | null;
  error: string | null;
} {
  const query =
    typeof params === "string"
      ? params.trim()
      : typeof params.query === "string"
        ? params.query.trim()
        : "";
  const rawVariables =
    typeof params === "object" && params != null ? params.variables : null;
  const variables =
    rawVariables == null
      ? null
      : typeof rawVariables === "object" && !Array.isArray(rawVariables)
        ? (rawVariables as Record<string, unknown>)
        : null;

  if (query.length === 0) {
    return {
      query,
      variables,
      error: "query must be a non-empty string",
    };
  }

  if (rawVariables != null && variables == null) {
    return {
      query,
      variables: null,
      error: "variables must be a JSON object when provided",
    };
  }

  if (countGraphqlOperations(query) !== 1) {
    return {
      query,
      variables,
      error: "query must contain exactly one GraphQL operation",
    };
  }

  return {
    query,
    variables,
    error: null,
  };
}

function extractId(value: unknown, ...path: string[]): string | null {
  let current: unknown = value;
  for (const key of path) {
    if (current == null || typeof current !== "object") {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" && current.length > 0 ? current : null;
}

function extractUsage(value: unknown): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} | null {
  if (value == null || typeof value !== "object") {
    return null;
  }

  const queue: unknown[] = [value];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current == null || typeof current !== "object") {
      continue;
    }
    const record = current as Record<string, unknown>;
    const inputTokens =
      typeof record.input_tokens === "number"
        ? record.input_tokens
        : typeof record.inputTokens === "number"
          ? record.inputTokens
          : null;
    const outputTokens =
      typeof record.output_tokens === "number"
        ? record.output_tokens
        : typeof record.outputTokens === "number"
          ? record.outputTokens
          : null;
    const totalTokens =
      typeof record.total_tokens === "number"
        ? record.total_tokens
        : typeof record.totalTokens === "number"
          ? record.totalTokens
          : null;

    if (
      inputTokens != null &&
      outputTokens != null &&
      totalTokens != null &&
      Number.isFinite(inputTokens) &&
      Number.isFinite(outputTokens) &&
      Number.isFinite(totalTokens)
    ) {
      return { inputTokens, outputTokens, totalTokens };
    }

    for (const nested of Object.values(record)) {
      if (nested != null && typeof nested === "object") {
        queue.push(nested);
      }
    }
  }

  return null;
}

function normalizeTurnSandboxPolicy(
  policy: TurnSandboxPolicy | null,
  workspacePath: string,
): Record<string, unknown> | null {
  if (policy == null) {
    return null;
  }

  const normalized: Record<string, unknown> = {
    type: policy.type,
  };

  if (policy.type === "workspaceWrite") {
    normalized.writableRoots =
      policy.writableRoots != null && policy.writableRoots.length > 0
        ? policy.writableRoots
        : [workspacePath];
    normalized.readOnlyAccess =
      policy.readableRoots != null && policy.readableRoots.length > 0
        ? {
            type: "restricted",
            readableRoots: policy.readableRoots,
            includePlatformDefaults: policy.includePlatformDefaults ?? true,
          }
        : {
            type: "fullAccess",
          };
    if (typeof policy.networkAccess === "string") {
      normalized.networkAccess = policy.networkAccess === "enabled";
    } else if (typeof policy.networkAccess === "boolean") {
      normalized.networkAccess = policy.networkAccess;
    }
    if (typeof policy.excludeSlashTmp === "boolean") {
      normalized.excludeSlashTmp = policy.excludeSlashTmp;
    }
    if (typeof policy.excludeTmpdirEnvVar === "boolean") {
      normalized.excludeTmpdirEnvVar = policy.excludeTmpdirEnvVar;
    }
    return normalized;
  }

  if (policy.type === "readOnly") {
    normalized.access =
      policy.readableRoots != null && policy.readableRoots.length > 0
        ? {
            type: "restricted",
            readableRoots: policy.readableRoots,
            includePlatformDefaults: policy.includePlatformDefaults ?? true,
          }
        : {
            type: "fullAccess",
          };
    if (typeof policy.networkAccess === "string") {
      normalized.networkAccess = policy.networkAccess === "enabled";
    } else if (typeof policy.networkAccess === "boolean") {
      normalized.networkAccess = policy.networkAccess;
    }
    return normalized;
  }

  if (policy.type === "externalSandbox") {
    if (typeof policy.networkAccess === "string") {
      normalized.networkAccess = policy.networkAccess;
    } else if (typeof policy.networkAccess === "boolean") {
      normalized.networkAccess = policy.networkAccess
        ? "enabled"
        : "restricted";
    }
    return normalized;
  }

  return normalized;
}

async function buildLinearToolResult(
  tracker: LinearClient,
  params: Record<string, unknown> | string,
): Promise<DynamicToolResult> {
  const validated = validateLinearGraphqlToolArguments(params);

  if (validated.error != null) {
    return {
      success: false,
      contentItems: [
        {
          type: "inputText",
          text: JSON.stringify({
            success: false,
            error: "invalid_input",
            message: validated.error,
          }),
        },
      ],
    };
  }

  const response = await tracker.executeRawGraphql(
    validated.query,
    validated.variables,
  );
  return {
    success: response.errors == null || response.errors.length === 0,
    contentItems: [
      {
        type: "inputText",
        text: JSON.stringify(response),
      },
    ],
  };
}

class AppServerTransport {
  private child: ChildProcessWithoutNullStreams | null = null;

  private nextRequestId = 1;

  private readonly pending = new Map<number | string, PendingRequest>();

  private onNotification:
    | ((notification: JsonRpcNotification) => void | Promise<void>)
    | null = null;

  private onRequest: ((request: JsonRpcRequest) => Promise<unknown>) | null =
    null;

  async start(command: string, cwd: string): Promise<void> {
    this.child = spawn("bash", ["-lc", command], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdout = readline.createInterface({ input: this.child.stdout });
    stdout.on("line", (line) => {
      void this.handleLine(line);
    });

    this.child.stderr.on("data", (chunk) => {
      void chunk;
    });

    this.child.on("exit", () => {
      const error = new Error("codex_app_server_exited");
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(error);
      }
      this.pending.clear();
    });
  }

  setNotificationHandler(
    handler: (notification: JsonRpcNotification) => void | Promise<void>,
  ): void {
    this.onNotification = handler;
  }

  setRequestHandler(
    handler: (request: JsonRpcRequest) => Promise<unknown>,
  ): void {
    this.onRequest = handler;
  }

  async request(
    method: string,
    params: unknown,
    timeoutMs: number,
  ): Promise<unknown> {
    const id = this.nextRequestId;
    this.nextRequestId += 1;
    const payload = { id, method, params };
    this.write(payload);

    return await new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("response_timeout"));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
    });
  }

  notify(method: string, params: unknown): void {
    this.write({ method, params });
  }

  terminate(): void {
    this.child?.kill("SIGKILL");
    this.child = null;
  }

  getPid(): string | null {
    return this.child?.pid != null ? String(this.child.pid) : null;
  }

  private async handleLine(line: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      return;
    }

    if (parsed == null || typeof parsed !== "object") {
      return;
    }

    const message = parsed as Record<string, unknown>;
    if ("method" in message && "id" in message) {
      if (this.onRequest == null) {
        this.write({
          id: message.id as number | string,
          error: { code: -32601, message: "No request handler installed" },
        });
        return;
      }

      try {
        const result = await this.onRequest({
          id: message.id as number | string,
          method: String(message.method),
          params: message.params,
        });
        this.write({
          id: message.id as number | string,
          result,
        });
      } catch (error) {
        this.write({
          id: message.id as number | string,
          error: {
            code: -32000,
            message: error instanceof Error ? error.message : "Request failed",
          },
        });
      }
      return;
    }

    if ("method" in message) {
      await this.onNotification?.({
        method: String(message.method),
        params: message.params,
      });
      return;
    }

    if (!("id" in message)) {
      return;
    }

    const pending = this.pending.get(message.id as number | string);
    if (pending == null) {
      return;
    }
    clearTimeout(pending.timer);
    this.pending.delete(message.id as number | string);
    if (message.error != null) {
      pending.reject(
        new Error(
          typeof message.error === "object" &&
            message.error != null &&
            "message" in message.error &&
            typeof message.error.message === "string"
            ? message.error.message
            : "response_error",
        ),
      );
      return;
    }
    pending.resolve((message as { result?: unknown }).result);
  }

  private write(payload: unknown): void {
    if (this.child == null) {
      throw new Error("codex transport not started");
    }
    this.child.stdin.write(`${JSON.stringify(payload)}\n`);
  }
}

export async function runAgentAttempt(
  options: RunAgentAttemptOptions,
): Promise<AgentRunResult> {
  const { config, workspace, workflow, signal, logger, tracker } = options;
  const transport = new AppServerTransport();
  const currentSession: LiveSession = {
    sessionId: "",
    threadId: "",
    turnId: "",
    codexAppServerPid: null,
    lastCodexEvent: null,
    lastCodexTimestamp: null,
    lastCodexMessage: null,
    codexInputTokens: 0,
    codexOutputTokens: 0,
    codexTotalTokens: 0,
    lastReportedInputTokens: 0,
    lastReportedOutputTokens: 0,
    lastReportedTotalTokens: 0,
    turnCount: 0,
  };

  let currentTurnId: string | null = null;
  let turnFinished:
    | ((result: { status: string; error: string | null }) => void)
    | null = null;
  let terminatedByUserInput = false;

  const emitEvent = (payload: CodexEventPayload): void => {
    const timestamp = nowIso();
    currentSession.lastCodexEvent = payload.event;
    currentSession.lastCodexTimestamp = timestamp;
    if (payload.message !== undefined) {
      currentSession.lastCodexMessage = truncateText(payload.message);
    }
    if (payload.session?.threadId != null) {
      currentSession.threadId = payload.session.threadId;
    }
    if (payload.session?.turnId != null) {
      currentSession.turnId = payload.session.turnId;
    }
    if (payload.session?.sessionId != null) {
      currentSession.sessionId = payload.session.sessionId;
    }
    currentSession.codexAppServerPid = transport.getPid();
    if (payload.usage != null) {
      currentSession.codexInputTokens = payload.usage.inputTokens;
      currentSession.codexOutputTokens = payload.usage.outputTokens;
      currentSession.codexTotalTokens = payload.usage.totalTokens;
    }
    options.onEvent({
      ...payload,
      session: currentSession,
      message: payload.message,
      usage: payload.usage,
      rateLimits: payload.rateLimits,
    });
  };

  try {
    await transport.start(config.codex.command, workspace.path);
    emitEvent({
      event: "session_starting",
      message: "Starting Codex app-server session",
    });

    transport.setRequestHandler(async (request) => {
      if (request.method === "item/commandExecution/requestApproval") {
        emitEvent({
          event: "approval_auto_approved",
          message: "Auto-approving command execution request",
        });
        return { decision: "acceptForSession" };
      }
      if (request.method === "item/fileChange/requestApproval") {
        emitEvent({
          event: "approval_auto_approved",
          message: "Auto-approving file change request",
        });
        return { decision: "acceptForSession" };
      }
      if (
        request.method === "tool/requestUserInput" ||
        request.method === "item/tool/requestUserInput"
      ) {
        terminatedByUserInput = true;
        emitEvent({
          event: "turn_input_required",
          message: "Codex requested user input; terminating run",
        });
        transport.terminate();
        throw new Error("turn_input_required");
      }
      if (request.method === "item/tool/call") {
        if (
          request.params == null ||
          typeof request.params !== "object" ||
          (request.params as { tool?: unknown }).tool !== "linear_graphql"
        ) {
          emitEvent({
            event: "unsupported_tool_call",
            message: "Rejecting unsupported dynamic tool call",
          });
          return {
            success: false,
            contentItems: [
              {
                type: "inputText",
                text: JSON.stringify({
                  success: false,
                  error: "unsupported_tool_call",
                }),
              },
            ],
          };
        }
        return await buildLinearToolResult(
          tracker,
          ((request.params as { arguments?: unknown }).arguments as
            | Record<string, unknown>
            | string
            | undefined) ?? {},
        );
      }
      throw new Error(`unsupported_server_request:${request.method}`);
    });

    transport.setNotificationHandler(async (notification) => {
      if (notification.method === "turn/completed") {
        const turnRecord =
          notification.params != null &&
          typeof notification.params === "object" &&
          "turn" in notification.params
            ? (notification.params as { turn?: Record<string, unknown> }).turn
            : null;
        const status =
          turnRecord != null && typeof turnRecord.status === "string"
            ? turnRecord.status
            : "failed";
        const message =
          turnRecord != null &&
          turnRecord.error != null &&
          typeof turnRecord.error === "object" &&
          "message" in turnRecord.error
            ? String(turnRecord.error.message)
            : null;
        turnFinished?.({ status, error: message });
        return;
      }

      if (notification.method === "turn/failed") {
        const message =
          notification.params != null &&
          typeof notification.params === "object" &&
          "error" in notification.params &&
          typeof (notification.params as { error?: unknown }).error ===
            "object" &&
          (notification.params as { error?: { message?: unknown } }).error !=
            null &&
          typeof (notification.params as { error?: { message?: unknown } })
            .error?.message === "string"
            ? String(
                (notification.params as { error?: { message?: unknown } }).error
                  ?.message,
              )
            : "turn_failed";
        turnFinished?.({ status: "failed", error: message });
        return;
      }

      if (notification.method === "turn/cancelled") {
        const message =
          notification.params != null &&
          typeof notification.params === "object" &&
          "reason" in notification.params &&
          typeof (notification.params as { reason?: unknown }).reason ===
            "string"
            ? String((notification.params as { reason?: unknown }).reason)
            : "turn_cancelled";
        turnFinished?.({ status: "cancelled", error: message });
        return;
      }

      if (notification.method === "turn/started") {
        const turnId = extractId(notification.params, "turn", "id");
        if (turnId != null) {
          currentTurnId = turnId;
        }
        return;
      }

      if (notification.method === "thread/tokenUsage/updated") {
        const usage = extractUsage(notification.params);
        if (usage != null) {
          emitEvent({
            event: "token_usage_updated",
            usage,
          });
        }
        return;
      }

      if (notification.method.toLowerCase().includes("ratelimit")) {
        emitEvent({
          event: "rate_limits_updated",
          rateLimits: notification.params ?? null,
        });
        return;
      }

      if (notification.method === "item/agentMessage/delta") {
        const message =
          notification.params != null &&
          typeof notification.params === "object" &&
          "delta" in notification.params
            ? truncateText(
                String(
                  (notification.params as { delta?: unknown }).delta ?? "",
                ),
              )
            : null;
        emitEvent({
          event: "notification",
          message,
        });
        return;
      }

      if (notification.method === "item/completed") {
        const item =
          notification.params != null &&
          typeof notification.params === "object" &&
          "item" in notification.params
            ? (notification.params as { item?: Record<string, unknown> }).item
            : null;
        if (item != null && item.type === "agentMessage") {
          emitEvent({
            event: "notification",
            message:
              typeof item.text === "string" ? truncateText(item.text) : null,
          });
        }
      }
    });

    await transport.request(
      "initialize",
      {
        clientInfo: {
          name: "praedixa-symphony",
          version: "0.1.0",
        },
        capabilities: {
          experimentalApi: true,
        },
      },
      config.codex.readTimeoutMs,
    );
    transport.notify("initialized", {});
    await transport
      .request("configRequirements/read", {}, config.codex.readTimeoutMs)
      .catch(() => null);

    const threadStart = (await transport.request(
      "thread/start",
      {
        model: config.codex.model,
        cwd: workspace.path,
        approvalPolicy: config.codex.approvalPolicy,
        approvalsReviewer: config.codex.approvalsReviewer,
        sandbox: config.codex.threadSandbox,
        personality: config.codex.personality,
        serviceName: "praedixa-symphony",
        dynamicTools: [
          {
            name: "linear_graphql",
            description:
              "Execute one Linear GraphQL operation with Symphony-managed auth.",
            inputSchema: {
              type: "object",
              required: ["query"],
              properties: {
                query: { type: "string" },
                variables: { type: "object" },
              },
            },
          },
        ],
      },
      config.codex.readTimeoutMs,
    )) as { thread?: { id?: string } };

    const threadId = threadStart.thread?.id;
    if (threadId == null) {
      throw new Error("response_error");
    }

    currentSession.threadId = threadId;
    emitEvent({
      event: "session_started",
      session: {
        threadId,
        codexAppServerPid: transport.getPid(),
      },
    });

    signal.addEventListener(
      "abort",
      () => {
        if (currentTurnId != null) {
          void transport
            .request(
              "turn/interrupt",
              {
                threadId,
                turnId: currentTurnId,
              },
              config.codex.readTimeoutMs,
            )
            .catch(() => null);
        }
        transport.terminate();
      },
      { once: true },
    );

    let currentIssue = options.issue;

    while (true) {
      currentSession.turnCount += 1;
      const prompt =
        currentSession.turnCount === 1
          ? await renderWorkflowPrompt(workflow, currentIssue, options.attempt)
          : buildContinuationPrompt(
              currentIssue,
              options.attempt,
              currentSession.turnCount,
              config.agent.maxTurns,
            );

      const turnStart = (await transport.request(
        "turn/start",
        {
          threadId,
          input: [{ type: "text", text: prompt }],
          cwd: workspace.path,
          title: `${currentIssue.identifier}: ${currentIssue.title}`,
          approvalPolicy: config.codex.approvalPolicy,
          approvalsReviewer: config.codex.approvalsReviewer,
          sandboxPolicy: normalizeTurnSandboxPolicy(
            config.codex.turnSandboxPolicy,
            workspace.path,
          ),
          model: config.codex.model,
          effort: config.codex.effort,
          summary: config.codex.summary,
          personality: config.codex.personality,
          serviceTier: config.codex.serviceTier,
        },
        config.codex.readTimeoutMs,
      )) as { turn?: { id?: string } };

      currentTurnId = turnStart.turn?.id ?? currentTurnId;
      if (currentTurnId == null) {
        throw new Error("response_error");
      }
      currentSession.turnId = currentTurnId;
      currentSession.sessionId = `${threadId}-${currentTurnId}`;
      emitEvent({
        event: "turn_started",
        message: `Started turn ${currentSession.turnCount}`,
        session: {
          turnId: currentTurnId,
          sessionId: currentSession.sessionId,
        },
      });

      const turnResult = await new Promise<{
        status: string;
        error: string | null;
      }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          transport.terminate();
          reject(new Error("turn_timeout"));
        }, config.codex.turnTimeoutMs);

        turnFinished = (result) => {
          clearTimeout(timeout);
          resolve(result);
        };
      });
      turnFinished = null;

      if (turnResult.status !== "completed") {
        emitEvent({
          event: "turn_failed",
          message: turnResult.error,
        });
        throw new Error(turnResult.error ?? "turn_failed");
      }
      emitEvent({
        event: "turn_completed",
        message: `Completed turn ${currentSession.turnCount}`,
      });

      const refreshedIssues = await tracker.fetchIssueStatesByIds([
        currentIssue.id,
      ]);
      currentIssue = refreshedIssues[0] ?? currentIssue;

      if (
        !config.tracker.normalizedActiveStates.has(
          currentIssue.state.toLowerCase(),
        )
      ) {
        break;
      }
      if (currentSession.turnCount >= config.agent.maxTurns) {
        break;
      }
      if (signal.aborted) {
        throw new Error("turn_cancelled");
      }
    }

    transport.terminate();
    return {
      status: "succeeded",
      workspace,
      issue: currentIssue,
      error: null,
    };
  } catch (error) {
    if (!terminatedByUserInput) {
      emitEvent({
        event:
          currentSession.threadId.length === 0
            ? "startup_failed"
            : "turn_ended_with_error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    logger.error({
      event: "codex_agent_attempt_failed",
      message: "Codex agent attempt failed",
      correlation: createLogCorrelation(options.issue.identifier),
      details: {
        issue_identifier: options.issue.identifier,
        workspace_path: workspace.path,
        error_message: error instanceof Error ? error.message : String(error),
      },
    });
    transport.terminate();
    return {
      status: terminatedByUserInput
        ? "turn_input_required"
        : signal.aborted
          ? "cancelled"
          : error instanceof Error && error.message === "turn_timeout"
            ? "timed_out"
            : "failed",
      workspace,
      issue: options.issue,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
