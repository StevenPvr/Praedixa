import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockEnd = vi.fn();

vi.mock("pg", () => ({
  Pool: vi.fn(() => ({
    query: mockQuery,
    end: mockEnd,
  })),
}));

import { PostgresBackedConnectorStore } from "../persistent-store.js";

describe("postgres-backed connector store", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEnd.mockReset();
  });

  it("hydrates persisted runtime state and detached secrets", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT payload FROM connector_runtime_snapshots")) {
        return {
          rows: [
            {
              payload: {
                auditEvents: [],
                authorizationSessions: [],
                connections: [
                  {
                    id: "conn-1",
                    organizationId: "org-1",
                    vendor: "salesforce",
                    displayName: "Salesforce Persisted",
                    status: "active",
                    authorizationState: "authorized",
                    authMode: "oauth2",
                    config: {},
                    secretRef: "memory://connectors/org-1/conn-1/oauth2_token/v1",
                    secretVersion: 1,
                    sourceObjects: ["Account"],
                    syncIntervalMinutes: 30,
                    webhookEnabled: false,
                    baseUrl: null,
                    externalAccountId: null,
                    oauthScopes: ["api"],
                    lastTestedAt: null,
                    lastSuccessfulSyncAt: null,
                    nextScheduledSyncAt: null,
                    disabledReason: null,
                    createdAt: "2026-03-06T10:00:00.000Z",
                    updatedAt: "2026-03-06T10:00:00.000Z",
                  },
                ],
                ingestCredentials: [],
                latestSecretRefs: [["conn-1", "memory://connectors/org-1/conn-1/oauth2_token/v1"]],
                rawEventIndex: [],
                rawEvents: [],
                runs: [],
                syncReplayIndex: [],
              },
            },
          ],
        };
      }
      if (sql.includes("SELECT payload FROM connector_secret_records")) {
        return {
          rows: [
            {
              payload: {
                secretRef: "memory://connectors/org-1/conn-1/oauth2_token/v1",
                organizationId: "org-1",
                connectionId: "conn-1",
                version: 1,
                kind: "oauth2_token",
                metadata: {},
                envelope: {
                  algorithm: "aes-256-gcm",
                  iv: "iv",
                  authTag: "tag",
                  ciphertext: "cipher",
                },
                createdAt: "2026-03-06T10:00:00.000Z",
                updatedAt: "2026-03-06T10:00:00.000Z",
              },
            },
          ],
        };
      }
      return { rows: [] };
    });

    const store = new PostgresBackedConnectorStore("postgres://user:pass@localhost:5432/db");
    await store.ready();

    expect(store.listConnections("org-1")).toHaveLength(1);
    expect(
      store.getSecretByRef("memory://connectors/org-1/conn-1/oauth2_token/v1"),
    ).not.toBeNull();

    await store.close();
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  it("persists runtime snapshot and secrets to separate postgres writes", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const store = new PostgresBackedConnectorStore("postgres://user:pass@localhost:5432/db");
    await store.ready();

    const connection = store.createConnection("org-9", {
      vendor: "olo",
      displayName: "Olo Persisted",
      authMode: "api_key",
      config: {},
    });
    store.putSecret({
      secretRef: "memory://connectors/org-9/conn-1/api_key/v1",
      organizationId: "org-9",
      connectionId: connection.id,
      version: 1,
      kind: "api_key",
      metadata: {},
      envelope: {
        algorithm: "aes-256-gcm",
        iv: "iv",
        authTag: "tag",
        ciphertext: "cipher",
      },
      createdAt: "2026-03-06T10:00:00.000Z",
      updatedAt: "2026-03-06T10:00:00.000Z",
    });

    await store.ready();

    const secretWrite = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes("INSERT INTO connector_secret_records"),
    );
    const snapshotWrite = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes("INSERT INTO connector_runtime_snapshots"),
    );

    expect(secretWrite).toBeDefined();
    expect(snapshotWrite).toBeDefined();
    const snapshotPayload = JSON.parse(String(snapshotWrite?.[1]?.[1] ?? "{}")) as Record<
      string,
      unknown
    >;
    expect(snapshotPayload.secrets).toBeUndefined();

    await store.close();
  });
});
