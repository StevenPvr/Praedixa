import crypto from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalFilePayloadStore } from "../payload-store.js";
import { ConnectorService } from "../service.js";
import { InMemoryConnectorStore } from "../store.js";

const mockFetch = vi.fn();
let payloadRoot: string;

describe("connector service control plane", () => {
  beforeEach(async () => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
    payloadRoot = await mkdtemp(
      path.join(tmpdir(), "praedixa-connectors-test-"),
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(payloadRoot, { recursive: true, force: true });
  });

  it("exposes a catalog covering planned priority connectors", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
    );
    const catalog = service.listCatalog();

    expect(catalog.length).toBeGreaterThanOrEqual(13);
    expect(catalog.some((entry) => entry.vendor === "salesforce")).toBe(true);
    expect(catalog.some((entry) => entry.vendor === "geotab")).toBe(true);
    expect(catalog.some((entry) => entry.vendor === "ncr_aloha")).toBe(true);
  });

  it("rejects secrets embedded inside config", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
    );

    expect(() =>
      service.createConnection(
        "org-1",
        {
          vendor: "salesforce",
          displayName: "Bad Config",
          authMode: "oauth2",
          config: {
            clientSecret: "should-not-be-here",
          },
        },
        {
          actorService: "admin-api",
          actorUserId: "user-1",
          requestId: "req-1",
        },
      ),
    ).toThrow("Secrets must be sent via credentials");
  });

  it("rejects private or non-allowlisted outbound hosts outside development", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.com",
      null,
      "production",
      ["salesforce.com"],
    );

    expect(() =>
      service.createConnection(
        "org-1",
        {
          vendor: "salesforce",
          displayName: "Unsafe Config",
          authMode: "oauth2",
          baseUrl: "https://169.254.169.254/latest",
          config: {
            tokenEndpoint: "https://evil.example/token",
          },
        },
        {
          actorService: "admin-api",
          actorUserId: "user-1",
          requestId: "req-unsafe-1",
        },
      ),
    ).toThrow(/host is not allowed|allowlist/i);
  });

  it("rejects OAuth endpoint overrides that are not on the outbound allowlist", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.com",
      null,
      "production",
      ["salesforce.com", "praedixa.com"],
    );

    const created = service.createConnection(
      "org-1",
      {
        vendor: "salesforce",
        displayName: "Salesforce Production",
        authMode: "oauth2",
        baseUrl: "https://acme.salesforce.com",
        credentials: {
          clientId: "salesforce-client-id",
          clientSecret: "salesforce-client-secret-123",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-1",
        requestId: "req-safe-1",
      },
    );

    expect(() =>
      service.startAuthorization(
        "org-1",
        created.id,
        {
          redirectUri: "https://app.praedixa.com/oauth/callback",
          tokenEndpoint: "https://evil.example/token",
          authorizationEndpoint: "https://evil.example/authorize",
        },
        {
          actorService: "admin-api",
          actorUserId: "user-1",
          requestId: "req-safe-2",
        },
      ),
    ).toThrow(/allowlist/i);
  });

  it("rejects sandbox-reserved hosts on production connections", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.com",
      null,
      "production",
      ["login.salesforce.com", "my.salesforce.com"],
      ["test.salesforce.com", "sandbox.my.salesforce.com"],
    );

    expect(() =>
      service.createConnection(
        "org-1",
        {
          vendor: "salesforce",
          displayName: "Salesforce Production",
          runtimeEnvironment: "production",
          authMode: "oauth2",
          baseUrl: "https://acme--uat.sandbox.my.salesforce.com",
        },
        {
          actorService: "admin-api",
          actorUserId: "user-1",
          requestId: "req-prod-sandbox-1",
        },
      ),
    ).toThrow(/reserved for sandbox/i);
  });

  it("supports explicit sandbox oauth defaults with a dedicated sandbox allowlist", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.com",
      null,
      "production",
      ["login.salesforce.com", "my.salesforce.com"],
      ["test.salesforce.com", "sandbox.my.salesforce.com"],
    );

    const created = service.createConnection(
      "org-sbx-1",
      {
        vendor: "salesforce",
        displayName: "Salesforce Sandbox",
        runtimeEnvironment: "sandbox",
        authMode: "oauth2",
        baseUrl: "https://acme--uat.sandbox.my.salesforce.com",
        credentials: {
          clientId: "salesforce-client-id",
          clientSecret: "salesforce-client-secret-123",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-sbx-1",
        requestId: "req-sbx-1",
      },
    );

    const authStart = service.startAuthorization(
      "org-sbx-1",
      created.id,
      {
        redirectUri: "https://app.praedixa.com/oauth/callback",
      },
      {
        actorService: "admin-api",
        actorUserId: "user-sbx-1",
        requestId: "req-sbx-2",
      },
    );

    expect(created.runtimeEnvironment).toBe("sandbox");
    expect(authStart.authorizationUrl).toContain(
      "test.salesforce.com/services/oauth2/authorize",
    );
  });

  it("supports interactive oauth onboarding, test and queued sync", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
    );

    const created = service.createConnection(
      "org-1",
      {
        vendor: "salesforce",
        displayName: "Salesforce Production",
        authMode: "oauth2",
        baseUrl: "https://example.my.salesforce.com",
        config: {
          authorizationEndpoint: "https://login.example.test/authorize",
          tokenEndpoint: "https://login.example.test/token",
          testEndpoint: "https://api.example.test/ping",
        },
        credentials: {
          clientId: "salesforce-client-id",
          clientSecret: "salesforce-client-secret-123",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-1",
        requestId: "req-1",
      },
    );

    expect(created.authorizationState).toBe("not_started");
    expect(created.secretRef).not.toBeNull();

    const authStart = service.startAuthorization(
      "org-1",
      created.id,
      {
        redirectUri: "https://praedixa.test/oauth/callback",
      },
      {
        actorService: "admin-api",
        actorUserId: "user-1",
        requestId: "req-2",
      },
    );

    expect(authStart.authorizationUrl).toContain("response_type=code");
    expect(authStart.authorizationUrl).toContain(
      "client_id=salesforce-client-id",
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "access-token-123",
        refresh_token: "refresh-token-456",
        expires_in: 3600,
        scope: "api refresh_token",
        token_type: "Bearer",
      }),
    });

    const completed = await service.completeAuthorization(
      "org-1",
      created.id,
      {
        state: authStart.state,
        code: "authorization-code-123",
      },
      {
        actorService: "admin-api",
        actorUserId: "user-1",
        requestId: "req-3",
      },
    );

    expect(completed.authorized).toBe(true);
    expect(completed.secretVersion).toBe(2);
    expect(completed.scopes).toEqual(["api", "refresh_token"]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const tested = await service.testConnection("org-1", created.id, {
      actorService: "admin-api",
      actorUserId: "user-1",
      requestId: "req-4",
    });

    expect(tested.ok).toBe(true);
    expect(tested.checkedScopes).toEqual(["api", "refresh_token"]);

    const firstDispatch = await service.triggerSync(
      "org-1",
      created.id,
      {
        triggerType: "manual",
        forceFullSync: false,
        sourceWindowStart: null,
        sourceWindowEnd: null,
      },
      "sync-request-0001",
      {
        actorService: "admin-api",
        actorUserId: "user-1",
        requestId: "req-5",
      },
    );

    expect(firstDispatch.created).toBe(true);
    expect(firstDispatch.run.status).toBe("queued");
    expect(firstDispatch.run.forceFullSync).toBe(false);

    const replayDispatch = await service.triggerSync(
      "org-1",
      created.id,
      {
        triggerType: "manual",
        forceFullSync: false,
        sourceWindowStart: null,
        sourceWindowEnd: null,
      },
      "sync-request-0001",
      {
        actorService: "admin-api",
        actorUserId: "user-1",
        requestId: "req-6",
      },
    );

    expect(replayDispatch.created).toBe(false);
    expect(replayDispatch.run.id).toBe(firstDispatch.run.id);

    const audits = service.listAuditEvents("org-1", created.id);
    expect(audits.map((event) => event.action)).toContain(
      "connectors.connection.created",
    );
    expect(audits.map((event) => event.action)).toContain(
      "connectors.authorization.started",
    );
    expect(audits.map((event) => event.action)).toContain(
      "connectors.authorization.completed",
    );
    expect(audits.map((event) => event.action)).toContain(
      "connectors.connection.tested",
    );
    expect(audits.map((event) => event.action)).toContain(
      "connectors.sync.queued",
    );
  });

  it("supports api key onboarding without manual secretRef handling", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
    );

    const created = service.createConnection(
      "org-2",
      {
        vendor: "olo",
        displayName: "Olo Partner",
        authMode: "api_key",
        baseUrl: "https://partner.olo.test",
        config: {
          testEndpoint: "https://partner.olo.test/health",
          authHeaderName: "x-api-key",
        },
        credentials: {
          apiKey: "olo-api-key-123456",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-2",
        requestId: "req-7",
      },
    );

    expect(created.secretRef).not.toBeNull();
    expect(created.authorizationState).toBe("authorized");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const tested = await service.testConnection("org-2", created.id, {
      actorService: "admin-api",
      actorUserId: "user-2",
      requestId: "req-8",
    });

    expect(tested.ok).toBe(true);
    expect(tested.checkedScopes).toEqual(["api_key"]);
  });

  it("issues an ingest credential and stores raw events with replay protection", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
      new LocalFilePayloadStore(payloadRoot),
    );

    const connection = service.createConnection(
      "org-3",
      {
        vendor: "salesforce",
        displayName: "Salesforce Push",
        authMode: "oauth2",
        sourceObjects: ["Account", "Opportunity"],
        config: {},
      },
      {
        actorService: "admin-api",
        actorUserId: "user-3",
        requestId: "req-9",
      },
    );

    const issued = service.issueIngestCredential(
      "org-3",
      connection.id,
      {
        label: "CRM outbound",
        allowedSourceObjects: ["Account"],
        requireSignature: true,
      },
      {
        actorService: "admin-api",
        actorUserId: "user-3",
        requestId: "req-10",
      },
    );

    expect(issued.ingestUrl).toContain(
      `/v1/ingest/org-3/${connection.id}/events`,
    );
    expect(issued.apiKey).toContain("prdx_live_");
    expect(issued.signature?.algorithm).toBe("hmac-sha256");

    const rawBody = JSON.stringify({
      schemaVersion: "crm.account.v1",
      events: [
        {
          eventId: "evt-1",
          sourceObject: "Account",
          sourceRecordId: "001",
          sourceUpdatedAt: "2026-03-06T20:00:00.000Z",
          payload: {
            accountName: "Acme",
            email: "ops@acme.test",
          },
        },
      ],
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto
      .createHmac("sha256", issued.signingSecret ?? "")
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const ingested = await service.ingestEvents(
      "org-3",
      connection.id,
      JSON.parse(rawBody),
      {
        authorizationHeader: `Bearer ${issued.apiKey}`,
        keyIdHeader: issued.credential.keyId,
        timestampHeader: timestamp,
        signatureHeader: signature,
        clientIp: "127.0.0.1",
        rawBody,
      },
      "ingest-key-0001",
    );

    expect(ingested.accepted).toBe(1);
    expect(ingested.duplicates).toBe(0);
    expect(ingested.events[0]?.payloadPreview).toMatchObject({
      accountName: "Acme",
      email: "ops@acme.test",
    });
    expect(ingested.events[0]?.objectStoreKey).toContain("org-3");

    const storedPayload = await service.getRawEventPayload(
      "org-3",
      connection.id,
      ingested.events[0]?.id ?? "",
    );
    expect(storedPayload).toMatchObject({
      accountName: "Acme",
      email: "ops@acme.test",
    });

    const replay = await service.ingestEvents(
      "org-3",
      connection.id,
      JSON.parse(rawBody),
      {
        authorizationHeader: `Bearer ${issued.apiKey}`,
        keyIdHeader: issued.credential.keyId,
        timestampHeader: timestamp,
        signatureHeader: signature,
        clientIp: "127.0.0.1",
        rawBody,
      },
      "ingest-key-0001",
    );

    expect(replay.accepted).toBe(1);
    expect(replay.duplicates).toBe(0);
    expect(replay.events).toEqual([]);

    const rawEvents = service.listRawEvents("org-3", connection.id);
    expect(rawEvents).toHaveLength(1);
    expect(rawEvents[0]?.eventId).toBe("evt-1");

    const audits = service.listAuditEvents("org-3", connection.id);
    expect(audits.map((event) => event.action)).toContain(
      "connectors.ingest_credential.issued",
    );
    expect(audits.map((event) => event.action)).toContain(
      "connectors.ingest.accepted",
    );
  });

  it("fails closed when public ingest credentials are requested without a public base URL", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
    );

    const connection = service.createConnection(
      "org-no-public-url",
      {
        vendor: "salesforce",
        displayName: "Missing public URL",
        authMode: "oauth2",
        sourceObjects: ["Account"],
        config: {},
      },
      {
        actorService: "admin-api",
        actorUserId: "user-no-public-url",
        requestId: "req-no-public-url-1",
      },
    );

    expect(() =>
      service.issueIngestCredential(
        "org-no-public-url",
        connection.id,
        {
          label: "Should fail",
        },
        {
          actorService: "admin-api",
          actorUserId: "user-no-public-url",
          requestId: "req-no-public-url-2",
        },
      ),
    ).toThrow(/CONNECTORS_PUBLIC_BASE_URL is required/i);
  });

  it("enables signed ingestion credentials by default", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const connection = service.createConnection(
      "org-default-signature",
      {
        vendor: "salesforce",
        displayName: "Signed by default",
        authMode: "oauth2",
        sourceObjects: ["Account"],
        config: {},
      },
      {
        actorService: "admin-api",
        actorUserId: "user-default-signature",
        requestId: "req-default-signature-1",
      },
    );

    const issued = service.issueIngestCredential(
      "org-default-signature",
      connection.id,
      {
        label: "Default signature",
      },
      {
        actorService: "admin-api",
        actorUserId: "user-default-signature",
        requestId: "req-default-signature-2",
      },
    );

    expect(issued.credential.authMode).toBe("bearer_hmac");
    expect(issued.signature?.algorithm).toBe("hmac-sha256");
    expect(issued.signingSecret).toContain("prdx_sig_");
  });

  it("rejects inbound ingestion when the credential is revoked or the signature is invalid", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const connection = service.createConnection(
      "org-4",
      {
        vendor: "salesforce",
        displayName: "Salesforce Secure Push",
        authMode: "oauth2",
        sourceObjects: ["Account"],
        config: {},
      },
      {
        actorService: "admin-api",
        actorUserId: "user-4",
        requestId: "req-11",
      },
    );

    const issued = service.issueIngestCredential(
      "org-4",
      connection.id,
      {
        label: "Secure outbound",
        requireSignature: true,
      },
      {
        actorService: "admin-api",
        actorUserId: "user-4",
        requestId: "req-12",
      },
    );

    const rawBody = JSON.stringify({
      schemaVersion: "crm.account.v1",
      events: [
        {
          eventId: "evt-invalid-signature",
          sourceObject: "Account",
          sourceRecordId: "002",
          payload: { name: "Bad Signature" },
        },
      ],
    });
    const timestamp = String(Math.floor(Date.now() / 1000));

    await expect(
      service.ingestEvents(
        "org-4",
        connection.id,
        JSON.parse(rawBody),
        {
          authorizationHeader: `Bearer ${issued.apiKey}`,
          keyIdHeader: issued.credential.keyId,
          timestampHeader: timestamp,
          signatureHeader: "deadbeef",
          clientIp: "127.0.0.1",
          rawBody,
        },
        "ingest-key-invalid-signature",
      ),
    ).rejects.toThrow("Invalid X-Praedixa-Signature");

    service.revokeIngestCredential(
      "org-4",
      connection.id,
      issued.credential.id,
      {
        actorService: "admin-api",
        actorUserId: "user-4",
        requestId: "req-13",
      },
    );

    const signature = crypto
      .createHmac("sha256", issued.signingSecret ?? "")
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    await expect(
      service.ingestEvents(
        "org-4",
        connection.id,
        JSON.parse(rawBody),
        {
          authorizationHeader: `Bearer ${issued.apiKey}`,
          keyIdHeader: issued.credential.keyId,
          timestampHeader: timestamp,
          signatureHeader: signature,
          clientIp: "127.0.0.1",
          rawBody,
        },
        "ingest-key-revoked",
      ),
    ).rejects.toThrow("invalid, revoked or expired");
  });

  it("claims pending raw events for a worker and marks them processed", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
      new LocalFilePayloadStore(payloadRoot),
    );

    const connection = service.createConnection(
      "org-5",
      {
        vendor: "salesforce",
        displayName: "Salesforce Bronze Worker",
        authMode: "oauth2",
        sourceObjects: ["Account"],
        config: {},
      },
      {
        actorService: "admin-api",
        actorUserId: "user-5",
        requestId: "req-14",
      },
    );

    const issued = service.issueIngestCredential(
      "org-5",
      connection.id,
      {
        label: "Worker source",
        requireSignature: false,
      },
      {
        actorService: "admin-api",
        actorUserId: "user-5",
        requestId: "req-15",
      },
    );

    const rawBody = JSON.stringify({
      schemaVersion: "crm.account.v1",
      events: [
        {
          eventId: "evt-worker-1",
          sourceObject: "Account",
          sourceRecordId: "003",
          payload: { name: "Worker claim" },
        },
      ],
    });

    const ingested = await service.ingestEvents(
      "org-5",
      connection.id,
      JSON.parse(rawBody),
      {
        authorizationHeader: `Bearer ${issued.apiKey}`,
        keyIdHeader: undefined,
        timestampHeader: undefined,
        signatureHeader: undefined,
        clientIp: "127.0.0.1",
        rawBody,
      },
      "ingest-key-worker",
    );

    const claimed = service.claimRawEvents(
      "org-5",
      connection.id,
      "bronze-worker-1",
      10,
      {
        actorService: "worker",
        actorUserId: null,
        requestId: "req-16",
      },
    );

    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.processingStatus).toBe("processing");
    expect(claimed[0]?.claimedBy).toBe("bronze-worker-1");

    const processed = service.markRawEventProcessed(
      "org-5",
      connection.id,
      claimed[0]!.id,
      "bronze-worker-1",
      {
        actorService: "worker",
        actorUserId: null,
        requestId: "req-17",
      },
    );

    expect(processed.processingStatus).toBe("processed");
    expect(processed.processedAt).toEqual(expect.any(String));
    expect(ingested.events[0]?.objectStoreKey).toContain("/evt-worker-1.json");
  });
});
