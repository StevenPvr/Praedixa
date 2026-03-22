import { describe, expect, it, vi } from "vitest";

import { insertEvent } from "../services/admin-onboarding-store.js";

const CASE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = "189a7665-84c5-4190-9f3b-91870e284b03";
const MAPPED_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("admin onboarding store actor persistence", () => {
  it("stores a null actor_user_id when the auth subject UUID has no local user row", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM users")) {
        return { rows: [] };
      }

      if (sql.includes("INSERT INTO onboarding_case_events")) {
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await insertEvent({ query } as never, {
      caseId: CASE_ID,
      actorUserId: USER_ID,
      eventType: "case_created",
      message: "Onboarding BPM case created",
      payloadJson: {
        actorAuthUserId: USER_ID,
      },
    });

    const insertCall = query.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO onboarding_case_events"),
    ) as [string, unknown[]] | undefined;
    expect(insertCall?.[1]?.[2]).toBeNull();
  });

  it("maps auth_user_id back to a persisted users.id before inserting the event", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM users")) {
        return { rows: [{ id: MAPPED_USER_ID }] };
      }

      if (sql.includes("INSERT INTO onboarding_case_events")) {
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await insertEvent({ query } as never, {
      caseId: CASE_ID,
      actorUserId: USER_ID,
      eventType: "workflow_started",
      message: "Process Camunda onboarding demarre",
      payloadJson: {
        actorAuthUserId: USER_ID,
      },
    });

    const insertCall = query.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO onboarding_case_events"),
    ) as [string, unknown[]] | undefined;
    expect(insertCall?.[1]?.[2]).toBe(MAPPED_USER_ID);
  });
});
