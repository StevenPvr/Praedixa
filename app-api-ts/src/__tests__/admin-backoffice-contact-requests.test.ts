import { describe, expect, it, vi } from "vitest";

import { AdminBackofficeService } from "../services/admin-backoffice.js";

const REQUEST_ID = "55555555-5555-4555-8555-555555555555";

type QueryResult = {
  rows: Array<Record<string, unknown>>;
};

describe("admin backoffice contact requests", () => {
  it("fails closed for contact request listing without database configuration", async () => {
    const service = new AdminBackofficeService(null);

    await expect(
      service.listContactRequests({
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
      statusCode: 503,
    });
  });

  it("lists contact requests with pagination and filters", async () => {
    const query = vi.fn(
      async (sql: string, params?: unknown[]): Promise<QueryResult> => {
        if (sql.includes("SELECT COUNT(*)::text AS total")) {
          expect(params).toEqual(["%Acme%", "new", "product_demo"]);
          return { rows: [{ total: "1" }] };
        }

        if (
          sql.includes("FROM contact_requests cr") &&
          sql.includes("metadata_json")
        ) {
          expect(params).toEqual(["%Acme%", "new", "product_demo", 20, 0]);
          return {
            rows: [
              {
                id: REQUEST_ID,
                created_at: new Date("2026-03-18T08:00:00.000Z"),
                updated_at: new Date("2026-03-18T09:00:00.000Z"),
                locale: "fr",
                request_type: "product_demo",
                company_name: "Acme Logistics",
                first_name: "Alice",
                last_name: "Martin",
                role: "Operations Director",
                email: "alice@acme.fr",
                phone: "+33102030405",
                subject: "Demo produit",
                message: "Nous souhaitons une demo.",
                status: "new",
                consent: true,
                metadata_json: { source: "landing" },
              },
            ],
          };
        }

        throw new Error(`Unexpected SQL in contact requests test: ${sql}`);
      },
    );

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    const result = await service.listContactRequests({
      page: 1,
      pageSize: 20,
      search: "Acme",
      status: "new",
      requestType: "product_demo",
    });

    expect(result).toEqual({
      total: 1,
      items: [
        {
          id: REQUEST_ID,
          createdAt: "2026-03-18T08:00:00.000Z",
          updatedAt: "2026-03-18T09:00:00.000Z",
          locale: "fr",
          requestType: "product_demo",
          companyName: "Acme Logistics",
          firstName: "Alice",
          lastName: "Martin",
          role: "Operations Director",
          email: "alice@acme.fr",
          phone: "+33102030405",
          subject: "Demo produit",
          message: "Nous souhaitons une demo.",
          status: "new",
          consent: true,
          metadataJson: { source: "landing" },
        },
      ],
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid contact request filters before querying", async () => {
    const query = vi.fn();
    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    await expect(
      service.listContactRequests({
        page: 1,
        pageSize: 20,
        status: "bad-status",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("updates contact request status persistently", async () => {
    const query = vi.fn(
      async (sql: string, params?: unknown[]): Promise<QueryResult> => {
        if (sql.includes("UPDATE contact_requests")) {
          expect(params).toEqual([REQUEST_ID, "closed"]);
          return {
            rows: [
              {
                id: REQUEST_ID,
                created_at: new Date("2026-03-18T08:00:00.000Z"),
                updated_at: new Date("2026-03-18T10:00:00.000Z"),
                locale: "fr",
                request_type: "product_demo",
                company_name: "Acme Logistics",
                first_name: "Alice",
                last_name: "Martin",
                role: "Operations Director",
                email: "alice@acme.fr",
                phone: "+33102030405",
                subject: "Demo produit",
                message: "Nous souhaitons une demo.",
                status: "closed",
                consent: true,
                metadata_json: { source: "landing" },
              },
            ],
          };
        }

        throw new Error(
          `Unexpected SQL in contact request update test: ${sql}`,
        );
      },
    );

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    const result = await service.updateContactRequestStatus(
      REQUEST_ID,
      "closed",
    );

    expect(result).toEqual({
      id: REQUEST_ID,
      createdAt: "2026-03-18T08:00:00.000Z",
      updatedAt: "2026-03-18T10:00:00.000Z",
      locale: "fr",
      requestType: "product_demo",
      companyName: "Acme Logistics",
      firstName: "Alice",
      lastName: "Martin",
      role: "Operations Director",
      email: "alice@acme.fr",
      phone: "+33102030405",
      subject: "Demo produit",
      message: "Nous souhaitons une demo.",
      status: "closed",
      consent: true,
      metadataJson: { source: "landing" },
    });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
