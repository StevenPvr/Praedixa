import { afterEach, describe, expect, it, vi } from "vitest";

import { listIntegrationRawEvents } from "../admin-integrations.js";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("admin integrations runtime bridge", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns metadata-only raw event summaries to the admin surface", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_ISSUER_URL", "https://auth.praedixa.com/realms/praedixa");
    vi.stubEnv("AUTH_AUDIENCE", "praedixa-api");
    vi.stubEnv("CONNECTORS_RUNTIME_URL", "http://127.0.0.1:8100");
    vi.stubEnv("CONNECTORS_RUNTIME_TOKEN", "token-long-enough-1234567890abcd");

    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: [
          {
            id: "raw-1",
            organizationId: "org-1",
            connectionId: "conn-1",
            credentialId: "cred-1",
            eventId: "evt-1",
            sourceObject: "Account",
            sourceRecordId: "001",
            sourceUpdatedAt: "2026-03-20T07:00:00.000Z",
            schemaVersion: "crm.account.v1",
            contentType: "application/json",
            payloadSha256: "sha256-value",
            payloadPreview: {
              email: "ops...st",
              message: "Ple...ck",
            },
            objectStoreKey: "org-1/conn-1/raw-1.json",
            sizeBytes: 1234,
            idempotencyKey: "idem-1",
            processingStatus: "pending",
            claimedAt: null,
            claimedBy: null,
            processedAt: null,
            errorMessage: null,
            receivedAt: "2026-03-20T07:05:00.000Z",
          },
        ],
        timestamp: "2026-03-20T07:05:00.000Z",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await listIntegrationRawEvents("org-1", "conn-1");

    expect(result).toEqual([
      {
        id: "raw-1",
        credentialId: "cred-1",
        eventId: "evt-1",
        sourceObject: "Account",
        sourceRecordId: "001",
        schemaVersion: "crm.account.v1",
        objectStoreKey: "org-1/conn-1/raw-1.json",
        sizeBytes: 1234,
        processingStatus: "pending",
        receivedAt: "2026-03-20T07:05:00.000Z",
      },
    ]);
    expect(result[0]).not.toHaveProperty("payloadPreview");
    expect(result[0]).not.toHaveProperty("payloadSha256");
    expect(result[0]).not.toHaveProperty("idempotencyKey");
    expect(result[0]).not.toHaveProperty("claimedBy");
  });
});
