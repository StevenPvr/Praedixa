import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { runAgentAttempt, type CodexEventPayload } from "./codex-app-server.js";
import { createLogCorrelation } from "./logging.js";
import { LinearClient } from "./linear-client.js";
import { WorkflowRuntime } from "./workflow.js";
import type {
  IssueRecord,
  OrchestratorSnapshot,
  RetryEntry,
  RunningEntry,
  ServiceConfig,
} from "./types.js";
import { validateDispatchConfig } from "./config.js";
import { WorkspaceManager } from "./workspace-manager.js";
import {
  monotonicNowMs,
  normalizeStateName,
  nowIso,
  sanitizeWorkspaceKey,
} from "./utils.js";

function computeRetryDelayMs(
  attempt: number,
  maxRetryBackoffMs: number,
): number {
  return Math.min(10_000 * 2 ** Math.max(0, attempt - 1), maxRetryBackoffMs);
}

function isTerminalState(config: ServiceConfig, state: string): boolean {
  return config.tracker.normalizedTerminalStates.has(normalizeStateName(state));
}

function isActiveState(config: ServiceConfig, state: string): boolean {
  return config.tracker.normalizedActiveStates.has(normalizeStateName(state));
}

export class SymphonyOrchestrator {
  private running = new Map<string, RunningEntry>();

  private claimed = new Set<string>();

  private retries = new Map<string, RetryEntry>();

  private completed = new Set<string>();

  private aggregateInputTokens = 0;

  private aggregateOutputTokens = 0;

  private aggregateTotalTokens = 0;

  private aggregateEndedRuntimeMs = 0;

  private latestRateLimits: unknown = null;

  private tickTimer: NodeJS.Timeout | null = null;

  private runningTick = false;

  private queuedImmediateTick = false;

  constructor(
    private readonly workflowRuntime: WorkflowRuntime,
    private readonly tracker: LinearClient,
    private readonly workspaceManager: WorkspaceManager,
    private readonly logger: ReturnType<
      typeof import("./logging.js").createSymphonyLogger
    >,
  ) {}

  async start(): Promise<void> {
    const snapshot = await this.workflowRuntime.initialize();
    this.tracker.updateTrackerConfig(snapshot.config.tracker);
    this.workspaceManager.updateConfig(snapshot.config);
    validateDispatchConfig(snapshot.config);
    await this.startupTerminalWorkspaceCleanup(snapshot.config);
    this.scheduleTick(0);
  }

  stop(): void {
    if (this.tickTimer != null) {
      clearTimeout(this.tickTimer);
    }
    this.tickTimer = null;
    for (const retry of this.retries.values()) {
      clearTimeout(retry.timer);
    }
    this.retries.clear();
    for (const entry of this.running.values()) {
      entry.abortController.abort();
    }
    this.running.clear();
    this.claimed.clear();
  }

  requestImmediateTick(): { queued: boolean; coalesced: boolean } {
    if (this.runningTick) {
      const coalesced = this.queuedImmediateTick;
      this.queuedImmediateTick = true;
      return { queued: true, coalesced };
    }
    this.scheduleTick(0);
    return { queued: true, coalesced: false };
  }

  getSnapshot(): OrchestratorSnapshot {
    const now = monotonicNowMs();
    return {
      generated_at: nowIso(),
      counts: {
        running: this.running.size,
        retrying: this.retries.size,
      },
      running: [...this.running.values()].map((entry) => ({
        issue_id: entry.issue.id,
        issue_identifier: entry.identifier,
        state: entry.issue.state,
        session_id: entry.session?.sessionId ?? null,
        turn_count: entry.session?.turnCount ?? 0,
        last_event: entry.session?.lastCodexEvent ?? null,
        last_message: entry.session?.lastCodexMessage ?? null,
        started_at: new Date(entry.startedAtMs).toISOString(),
        last_event_at: entry.session?.lastCodexTimestamp ?? null,
        tokens: {
          input_tokens: entry.session?.codexInputTokens ?? 0,
          output_tokens: entry.session?.codexOutputTokens ?? 0,
          total_tokens: entry.session?.codexTotalTokens ?? 0,
        },
      })),
      retrying: [...this.retries.values()].map((entry) => ({
        issue_id: entry.issueId,
        issue_identifier: entry.identifier,
        attempt: entry.attempt,
        due_at: new Date(entry.dueAtMs).toISOString(),
        error: entry.error,
      })),
      codex_totals: {
        input_tokens: this.aggregateInputTokens,
        output_tokens: this.aggregateOutputTokens,
        total_tokens: this.aggregateTotalTokens,
        seconds_running:
          (this.aggregateEndedRuntimeMs +
            [...this.running.values()].reduce(
              (total, entry) => total + (now - entry.startedAtMs),
              0,
            )) /
          1000,
      },
      rate_limits: this.latestRateLimits,
    };
  }

  getIssueSnapshot(issueIdentifier: string): {
    issueId: string;
    issueIdentifier: string;
    status: string;
    workspacePath: string;
    retryAttempt: number | null;
    running: RunningEntry | null;
    retry: RetryEntry | null;
  } | null {
    const running = [...this.running.values()].find(
      (entry) => entry.identifier === issueIdentifier,
    );
    if (running != null) {
      return {
        issueId: running.issue.id,
        issueIdentifier,
        status: "running",
        workspacePath: running.workspacePath,
        retryAttempt: running.retryAttempt,
        running,
        retry: null,
      };
    }

    const retry = [...this.retries.values()].find(
      (entry) => entry.identifier === issueIdentifier,
    );
    if (retry != null) {
      return {
        issueId: retry.issueId,
        issueIdentifier,
        status: "retrying",
        workspacePath: path.join(
          this.workflowRuntime.getCurrent().config.workspace.absoluteRoot,
          sanitizeWorkspaceKey(issueIdentifier),
        ),
        retryAttempt: retry.attempt,
        running: null,
        retry,
      };
    }

    return null;
  }

  private scheduleTick(delayMs: number): void {
    if (this.tickTimer != null) {
      clearTimeout(this.tickTimer);
    }
    this.tickTimer = setTimeout(() => {
      void this.tick();
    }, delayMs);
  }

  private async tick(): Promise<void> {
    if (this.runningTick) {
      this.queuedImmediateTick = true;
      return;
    }
    this.runningTick = true;
    const snapshot = await this.workflowRuntime.reloadIfChanged();
    const config = snapshot.config;
    this.tracker.updateTrackerConfig(config.tracker);
    this.workspaceManager.updateConfig(config);

    try {
      await this.reconcileRunningIssues(config);
      validateDispatchConfig(config);
      const issues = await this.tracker.fetchCandidateIssues();
      const sortedIssues = issues.sort((left, right) => {
        const leftPriority = left.priority ?? Number.MAX_SAFE_INTEGER;
        const rightPriority = right.priority ?? Number.MAX_SAFE_INTEGER;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        const leftCreatedAt = left.createdAt ?? "";
        const rightCreatedAt = right.createdAt ?? "";
        if (leftCreatedAt !== rightCreatedAt) {
          return leftCreatedAt.localeCompare(rightCreatedAt);
        }
        return left.identifier.localeCompare(right.identifier);
      });

      for (const issue of sortedIssues) {
        if (!this.canDispatch(config, issue)) {
          continue;
        }
        await this.dispatchIssue(issue, null, snapshot.workflow, config);
      }
    } catch (error) {
      this.logger.error({
        event: "symphony_tick_failed",
        message: "Symphony poll tick failed",
        correlation: createLogCorrelation("tick"),
        details: {
          error_message: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      this.runningTick = false;
      if (this.queuedImmediateTick) {
        this.queuedImmediateTick = false;
        this.scheduleTick(0);
      } else {
        this.scheduleTick(config.polling.intervalMs);
      }
    }
  }

  private canDispatch(
    config: ServiceConfig,
    issue: IssueRecord,
    options?: {
      allowClaimedIssueId?: string;
    },
  ): boolean {
    if (
      this.running.has(issue.id) ||
      !isActiveState(config, issue.state) ||
      isTerminalState(config, issue.state)
    ) {
      return false;
    }

    if (
      this.claimed.has(issue.id) &&
      options?.allowClaimedIssueId !== issue.id
    ) {
      return false;
    }

    if (
      normalizeStateName(issue.state) === "todo" &&
      issue.blockedBy.some(
        (blocker) =>
          blocker.state != null && !isTerminalState(config, blocker.state),
      )
    ) {
      return false;
    }

    if (this.running.size >= config.agent.maxConcurrentAgents) {
      return false;
    }

    const perStateLimit =
      config.agent.maxConcurrentAgentsByState.get(
        normalizeStateName(issue.state),
      ) ?? config.agent.maxConcurrentAgents;
    const runningInState = [...this.running.values()].filter(
      (entry) =>
        normalizeStateName(entry.issue.state) ===
        normalizeStateName(issue.state),
    ).length;
    return runningInState < perStateLimit;
  }

  private async dispatchIssue(
    issue: IssueRecord,
    attempt: number | null,
    workflow: Awaited<ReturnType<WorkflowRuntime["getCurrent"]>>["workflow"],
    config: ServiceConfig,
  ): Promise<void> {
    this.claimed.add(issue.id);
    const existingRetry = this.retries.get(issue.id);
    if (existingRetry != null) {
      clearTimeout(existingRetry.timer);
      this.retries.delete(issue.id);
    }

    let workspace: Awaited<
      ReturnType<WorkspaceManager["ensureWorkspace"]>
    > | null = null;
    try {
      workspace = await this.workspaceManager.ensureWorkspace(issue);
      if (workspace.createdNow) {
        await this.workspaceManager.runHook("afterCreate", {
          issue,
          workspacePath: workspace.path,
          workspaceKey: workspace.workspaceKey,
          reservedPorts: workspace.reservedPorts,
          attempt,
        });
      }

      await this.workspaceManager.runHook("beforeRun", {
        issue,
        workspacePath: workspace.path,
        workspaceKey: workspace.workspaceKey,
        reservedPorts: workspace.reservedPorts,
        attempt,
      });
    } catch (error) {
      if (workspace != null) {
        await this.workspaceManager
          .runHook("afterRun", {
            issue,
            workspacePath: workspace.path,
            workspaceKey: workspace.workspaceKey,
            reservedPorts: workspace.reservedPorts,
            attempt,
          })
          .catch(() => null);
      }
      this.scheduleRetry(
        issue.id,
        issue.identifier,
        (attempt ?? 0) + 1,
        error instanceof Error ? error.message : String(error),
        computeRetryDelayMs((attempt ?? 0) + 1, config.agent.maxRetryBackoffMs),
        config,
      );
      return;
    }

    const runningEntry: RunningEntry = {
      issue,
      identifier: issue.identifier,
      workspacePath: workspace.path,
      workspaceKey: workspace.workspaceKey,
      reservedPorts: workspace.reservedPorts,
      startedAtMs: monotonicNowMs(),
      retryAttempt: attempt,
      abortController: new AbortController(),
      recentEvents: [],
      session: null,
      stopReason: null,
    };

    this.running.set(issue.id, runningEntry);

    void (async () => {
      const result = await runAgentAttempt({
        issue,
        attempt,
        workflow,
        config,
        workspace,
        tracker: this.tracker,
        logger: this.logger,
        signal: runningEntry.abortController.signal,
        onEvent: (payload) => {
          this.applyCodexEvent(issue.id, payload);
        },
      });

      await this.workspaceManager
        .runHook("afterRun", {
          issue,
          workspacePath: workspace.path,
          workspaceKey: workspace.workspaceKey,
          reservedPorts: workspace.reservedPorts,
          attempt,
        })
        .catch(() => null);

      await this.handleWorkerFinished(
        issue.id,
        result.status,
        result.error,
        config,
      );
    })();
  }

  private applyCodexEvent(issueId: string, payload: CodexEventPayload): void {
    const entry = this.running.get(issueId);
    if (entry == null) {
      return;
    }
    entry.recentEvents.push({
      at: nowIso(),
      event: payload.event,
      message: payload.message ?? null,
    });
    if (entry.recentEvents.length > 20) {
      entry.recentEvents.shift();
    }

    if (payload.session != null) {
      entry.session = {
        sessionId: payload.session.sessionId ?? entry.session?.sessionId ?? "",
        threadId: payload.session.threadId ?? entry.session?.threadId ?? "",
        turnId: payload.session.turnId ?? entry.session?.turnId ?? "",
        codexAppServerPid:
          payload.session.codexAppServerPid ??
          entry.session?.codexAppServerPid ??
          null,
        lastCodexEvent: payload.event,
        lastCodexTimestamp: nowIso(),
        lastCodexMessage:
          payload.message ?? entry.session?.lastCodexMessage ?? null,
        codexInputTokens:
          payload.usage?.inputTokens ?? entry.session?.codexInputTokens ?? 0,
        codexOutputTokens:
          payload.usage?.outputTokens ?? entry.session?.codexOutputTokens ?? 0,
        codexTotalTokens:
          payload.usage?.totalTokens ?? entry.session?.codexTotalTokens ?? 0,
        lastReportedInputTokens: entry.session?.lastReportedInputTokens ?? 0,
        lastReportedOutputTokens: entry.session?.lastReportedOutputTokens ?? 0,
        lastReportedTotalTokens: entry.session?.lastReportedTotalTokens ?? 0,
        turnCount: payload.session.turnCount ?? entry.session?.turnCount ?? 0,
      };
    }

    if (payload.usage != null && entry.session != null) {
      const deltaInput = Math.max(
        0,
        payload.usage.inputTokens - entry.session.lastReportedInputTokens,
      );
      const deltaOutput = Math.max(
        0,
        payload.usage.outputTokens - entry.session.lastReportedOutputTokens,
      );
      const deltaTotal = Math.max(
        0,
        payload.usage.totalTokens - entry.session.lastReportedTotalTokens,
      );
      this.aggregateInputTokens += deltaInput;
      this.aggregateOutputTokens += deltaOutput;
      this.aggregateTotalTokens += deltaTotal;
      entry.session.lastReportedInputTokens = payload.usage.inputTokens;
      entry.session.lastReportedOutputTokens = payload.usage.outputTokens;
      entry.session.lastReportedTotalTokens = payload.usage.totalTokens;
    }

    if (payload.rateLimits != null) {
      this.latestRateLimits = payload.rateLimits;
    }
  }

  private async handleWorkerFinished(
    issueId: string,
    status: string,
    error: string | null,
    config: ServiceConfig,
  ): Promise<void> {
    const entry = this.running.get(issueId);
    if (entry == null) {
      return;
    }
    this.running.delete(issueId);
    this.aggregateEndedRuntimeMs += monotonicNowMs() - entry.startedAtMs;

    if (entry.stopReason === "terminal") {
      await this.workspaceManager
        .runHook("beforeRemove", {
          issue: entry.issue,
          workspacePath: entry.workspacePath,
          workspaceKey: entry.workspaceKey,
          reservedPorts: entry.reservedPorts,
          attempt: entry.retryAttempt,
        })
        .catch(() => null);
      await this.workspaceManager.removeWorkspace(entry.identifier);
      this.claimed.delete(issueId);
      return;
    }

    if (entry.stopReason === "inactive") {
      this.claimed.delete(issueId);
      return;
    }

    if (status === "succeeded") {
      this.completed.add(issueId);
      this.scheduleRetry(issueId, entry.identifier, 1, null, 1_000, config);
      return;
    }

    if (entry.stopReason === "stalled") {
      this.scheduleRetry(
        issueId,
        entry.identifier,
        (entry.retryAttempt ?? 0) + 1,
        "stalled session",
        computeRetryDelayMs(
          (entry.retryAttempt ?? 0) + 1,
          config.agent.maxRetryBackoffMs,
        ),
        config,
      );
      return;
    }

    this.scheduleRetry(
      issueId,
      entry.identifier,
      (entry.retryAttempt ?? 0) + 1,
      error,
      computeRetryDelayMs(
        (entry.retryAttempt ?? 0) + 1,
        config.agent.maxRetryBackoffMs,
      ),
      config,
    );
  }

  private scheduleRetry(
    issueId: string,
    identifier: string,
    attempt: number,
    error: string | null,
    delayMs: number,
    config: ServiceConfig,
  ): void {
    const existing = this.retries.get(issueId);
    if (existing != null) {
      clearTimeout(existing.timer);
    }
    const dueAtMs = monotonicNowMs() + delayMs;
    const timer = setTimeout(() => {
      void this.handleRetry(issueId, config);
    }, delayMs);
    this.retries.set(issueId, {
      issueId,
      identifier,
      attempt,
      dueAtMs,
      error,
      timer,
    });
  }

  private async handleRetry(
    issueId: string,
    config: ServiceConfig,
  ): Promise<void> {
    const retry = this.retries.get(issueId);
    if (retry == null) {
      return;
    }
    this.retries.delete(issueId);
    const candidates = await this.tracker.fetchCandidateIssues();
    const issue = candidates.find((candidate) => candidate.id === issueId);
    if (issue == null) {
      this.claimed.delete(issueId);
      return;
    }
    if (!this.canDispatch(config, issue, { allowClaimedIssueId: issueId })) {
      this.scheduleRetry(
        issue.id,
        issue.identifier,
        retry.attempt + 1,
        "no available orchestrator slots",
        computeRetryDelayMs(retry.attempt + 1, config.agent.maxRetryBackoffMs),
        config,
      );
      return;
    }
    const workflow = this.workflowRuntime.getCurrent().workflow;
    await this.dispatchIssue(issue, retry.attempt, workflow, config);
  }

  private async reconcileRunningIssues(config: ServiceConfig): Promise<void> {
    for (const entry of this.running.values()) {
      if (config.codex.stallTimeoutMs <= 0) {
        continue;
      }
      const lastActivityMs =
        entry.session?.lastCodexTimestamp != null
          ? new Date(entry.session.lastCodexTimestamp).getTime()
          : entry.startedAtMs;
      if (monotonicNowMs() - lastActivityMs > config.codex.stallTimeoutMs) {
        entry.stopReason = "stalled";
        entry.abortController.abort();
      }
    }

    if (this.running.size === 0) {
      return;
    }

    const refreshedIssues = await this.tracker.fetchIssueStatesByIds([
      ...this.running.keys(),
    ]);
    const refreshedById = new Map(
      refreshedIssues.map((issue) => [issue.id, issue] as const),
    );

    for (const [issueId, entry] of this.running.entries()) {
      const refreshed = refreshedById.get(issueId);
      if (refreshed == null) {
        continue;
      }
      if (isTerminalState(config, refreshed.state)) {
        entry.issue = refreshed;
        entry.stopReason = "terminal";
        entry.abortController.abort();
        continue;
      }
      if (!isActiveState(config, refreshed.state)) {
        entry.issue = refreshed;
        entry.stopReason = "inactive";
        entry.abortController.abort();
        continue;
      }
      entry.issue = refreshed;
    }
  }

  private async startupTerminalWorkspaceCleanup(
    config: ServiceConfig,
  ): Promise<void> {
    try {
      const terminalIssues = await this.tracker.fetchIssuesByStates(
        config.tracker.terminalStates,
      );
      for (const issue of terminalIssues) {
        await this.workspaceManager
          .removeWorkspace(issue.identifier)
          .catch(() => null);
      }
    } catch (error) {
      this.logger.warn({
        event: "startup_terminal_cleanup_failed",
        message: "Startup terminal workspace cleanup failed; continuing",
        correlation: createLogCorrelation("startup-terminal-cleanup"),
        details: {
          error_message: error instanceof Error ? error.message : String(error),
        },
      });
      return;
    }
    await delay(0);
  }
}
