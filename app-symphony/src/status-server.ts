import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import type { SymphonyOrchestrator } from "./orchestrator.js";

function writeJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function writeHtml(response: ServerResponse, html: string): void {
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(html);
}

function writeJsonError(
  response: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
): void {
  writeJson(response, statusCode, {
    error: {
      code,
      message,
    },
  });
}

export function createStatusServer(
  orchestrator: SymphonyOrchestrator,
  options: { host: string; port: number },
) {
  const server = createServer(
    (request: IncomingMessage, response: ServerResponse) => {
      const method = request.method ?? "GET";
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const isApiRoute =
        url.pathname === "/api/v1/state" ||
        url.pathname === "/api/v1/refresh" ||
        url.pathname.startsWith("/api/v1/");

      if (method === "GET" && url.pathname === "/") {
        const snapshot = orchestrator.getSnapshot();
        writeHtml(
          response,
          `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Praedixa Symphony</title></head>
<body>
  <h1>Praedixa Symphony</h1>
  <p>Running: ${snapshot.counts.running}</p>
  <p>Retrying: ${snapshot.counts.retrying}</p>
  <pre>${JSON.stringify(snapshot, null, 2)}</pre>
</body>
</html>`,
        );
        return;
      }

      if (method === "GET" && url.pathname === "/api/v1/state") {
        writeJson(response, 200, orchestrator.getSnapshot());
        return;
      }

      if (method !== "GET" && url.pathname === "/api/v1/state") {
        writeJsonError(
          response,
          405,
          "method_not_allowed",
          "Method not allowed",
        );
        return;
      }

      if (method === "POST" && url.pathname === "/api/v1/refresh") {
        const refresh = orchestrator.requestImmediateTick();
        writeJson(response, 202, {
          queued: refresh.queued,
          coalesced: refresh.coalesced,
          requested_at: new Date().toISOString(),
          operations: ["poll", "reconcile"],
        });
        return;
      }

      if (method !== "POST" && url.pathname === "/api/v1/refresh") {
        writeJsonError(
          response,
          405,
          "method_not_allowed",
          "Method not allowed",
        );
        return;
      }

      if (method === "GET" && url.pathname.startsWith("/api/v1/")) {
        const issueIdentifier = decodeURIComponent(
          url.pathname.slice("/api/v1/".length),
        );
        if (issueIdentifier.length === 0 || issueIdentifier === "state") {
          writeJsonError(response, 404, "issue_not_found", "Issue not found");
          return;
        }
        const snapshot = orchestrator.getIssueSnapshot(issueIdentifier);
        if (snapshot == null) {
          writeJsonError(
            response,
            404,
            "issue_not_found",
            `Unknown issue ${issueIdentifier}`,
          );
          return;
        }
        writeJson(response, 200, {
          issue_identifier: snapshot.issueIdentifier,
          issue_id: snapshot.issueId,
          status: snapshot.status,
          workspace: {
            path: snapshot.workspacePath,
          },
          attempts: {
            restart_count:
              snapshot.retryAttempt != null
                ? Math.max(snapshot.retryAttempt - 1, 0)
                : 0,
            current_retry_attempt: snapshot.retryAttempt,
          },
          running:
            snapshot.running != null
              ? {
                  session_id: snapshot.running.session?.sessionId ?? null,
                  turn_count: snapshot.running.session?.turnCount ?? 0,
                  state: snapshot.running.issue.state,
                  started_at: new Date(
                    snapshot.running.startedAtMs,
                  ).toISOString(),
                  last_event: snapshot.running.session?.lastCodexEvent ?? null,
                  last_message:
                    snapshot.running.session?.lastCodexMessage ?? null,
                  last_event_at:
                    snapshot.running.session?.lastCodexTimestamp ?? null,
                  tokens: {
                    input_tokens:
                      snapshot.running.session?.codexInputTokens ?? 0,
                    output_tokens:
                      snapshot.running.session?.codexOutputTokens ?? 0,
                    total_tokens:
                      snapshot.running.session?.codexTotalTokens ?? 0,
                  },
                }
              : null,
          retry:
            snapshot.retry != null
              ? {
                  attempt: snapshot.retry.attempt,
                  due_at: new Date(snapshot.retry.dueAtMs).toISOString(),
                  error: snapshot.retry.error,
                }
              : null,
          logs: {
            codex_session_logs: [],
          },
          recent_events: snapshot.running?.recentEvents ?? [],
          last_error: snapshot.retry?.error ?? null,
          tracked: {},
        });
        return;
      }

      if (isApiRoute) {
        writeJsonError(
          response,
          405,
          "method_not_allowed",
          "Method not allowed",
        );
        return;
      }

      writeJsonError(response, 404, "not_found", "Route not found");
    },
  );

  return {
    listen(): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(options.port, options.host, () => {
          server.off("error", reject);
          resolve();
        });
      });
    },
    close(): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error != null) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
