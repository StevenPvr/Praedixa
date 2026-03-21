import { createStatusServer } from "./status-server.js";
import { reserveFreePort } from "./utils.js";

describe("status server", () => {
  it("serves the spec-shaped state snapshot", async () => {
    const port = await reserveFreePort();
    const orchestrator = {
      getSnapshot: () => ({
        generated_at: "2026-03-19T08:00:00.000Z",
        counts: { running: 1, retrying: 1 },
        running: [
          {
            issue_id: "issue-1",
            issue_identifier: "PRA-5",
            state: "Todo",
            session_id: "thread-1-turn-1",
            turn_count: 2,
            last_event: "turn_completed",
            last_message: "done",
            started_at: "2026-03-19T08:00:00.000Z",
            last_event_at: "2026-03-19T08:01:00.000Z",
            tokens: {
              input_tokens: 10,
              output_tokens: 5,
              total_tokens: 15,
            },
          },
        ],
        retrying: [
          {
            issue_id: "issue-2",
            issue_identifier: "PRA-6",
            attempt: 2,
            due_at: "2026-03-19T08:02:00.000Z",
            error: "failed",
          },
        ],
        codex_totals: {
          input_tokens: 10,
          output_tokens: 5,
          total_tokens: 15,
          seconds_running: 12.5,
        },
        rate_limits: null,
      }),
      getIssueSnapshot: () => null,
      requestImmediateTick: () => ({ queued: true, coalesced: false }),
    };

    const server = createStatusServer(orchestrator as never, {
      host: "127.0.0.1",
      port,
    });
    await server.listen();

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/state`);
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        generated_at: string;
        running: Array<{ issue_id: string }>;
        codex_totals: { seconds_running: number };
        rate_limits: unknown;
      };
      expect(body.generated_at).toBe("2026-03-19T08:00:00.000Z");
      expect(body.running[0]?.issue_id).toBe("issue-1");
      expect(body.codex_totals.seconds_running).toBe(12.5);
      expect(body.rate_limits).toBeNull();
    } finally {
      await server.close();
    }
  });

  it("returns 405 only for unsupported methods on defined routes and 404 otherwise", async () => {
    const port = await reserveFreePort();
    const orchestrator = {
      getSnapshot: () => ({
        generated_at: "2026-03-19T08:00:00.000Z",
        counts: { running: 0, retrying: 0 },
        running: [],
        retrying: [],
        codex_totals: {
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          seconds_running: 0,
        },
        rate_limits: null,
      }),
      getIssueSnapshot: () => null,
      requestImmediateTick: () => ({ queued: true, coalesced: false }),
    };

    const server = createStatusServer(orchestrator as never, {
      host: "127.0.0.1",
      port,
    });
    await server.listen();

    try {
      const methodNotAllowed = await fetch(
        `http://127.0.0.1:${port}/api/v1/state`,
        {
          method: "POST",
        },
      );
      expect(methodNotAllowed.status).toBe(405);

      const notFound = await fetch(
        `http://127.0.0.1:${port}/api/v1/unknown-issue`,
      );
      expect(notFound.status).toBe(404);

      const routeNotFound = await fetch(`http://127.0.0.1:${port}/nope`);
      expect(routeNotFound.status).toBe(404);
    } finally {
      await server.close();
    }
  });
});
