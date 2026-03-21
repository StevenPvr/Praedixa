import { describe, expect, it, vi } from "vitest";

import { AdminBackofficeService } from "../services/admin-backoffice.js";

type QueryResult = {
  rows: Array<Record<string, unknown>>;
};

describe("admin backoffice conversations", () => {
  it("fails closed for unread counts without database configuration", async () => {
    const service = new AdminBackofficeService(null);

    await expect(service.getConversationUnreadCount()).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
      statusCode: 503,
    });
  });

  it("returns unread message counts grouped by organization", async () => {
    const query = vi.fn(async (sql: string): Promise<QueryResult> => {
      if (sql.includes("SELECT COUNT(m.id)::text AS total")) {
        return { rows: [{ total: "8" }] };
      }

      if (sql.includes("GROUP BY c.organization_id, o.name")) {
        return {
          rows: [
            {
              org_id: "33333333-3333-4333-8333-333333333333",
              org_name: "Acme Logistics",
              unread_count: "6",
            },
            {
              org_id: "44444444-4444-4444-8444-444444444444",
              org_name: "TransFroid",
              unread_count: "2",
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in unread count test: ${sql}`);
    });

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    await expect(service.getConversationUnreadCount()).resolves.toEqual({
      total: 8,
      byOrg: [
        {
          orgId: "33333333-3333-4333-8333-333333333333",
          orgName: "Acme Logistics",
          count: 6,
        },
        {
          orgId: "44444444-4444-4444-8444-444444444444",
          orgName: "TransFroid",
          count: 2,
        },
      ],
    });
    expect(query).toHaveBeenCalledTimes(2);
  });
});
