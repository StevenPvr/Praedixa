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
const TEST_PRIVATE_KEY_PEM = [
  "-----BEGIN",
  " PRIVATE KEY-----",
  "\nunit-test-key\n",
  "-----END",
  " PRIVATE KEY-----",
].join("");

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

  async function createClaimedSyncRunFixture(options: {
    organizationId: string;
    displayName: string;
    apiKey: string;
    workerId: string;
    requestPrefix: string;
  }) {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const connection = service.createConnection(
      options.organizationId,
      {
        vendor: "olo",
        displayName: options.displayName,
        authMode: "api_key",
        sourceObjects: ["Orders"],
        baseUrl: "https://partner.olo.test",
        config: {
          testEndpoint: "https://partner.olo.test/health",
          authHeaderName: "x-api-key",
          oloEndpoints: {
            Orders: {
              path: "/api/orders",
            },
          },
        },
        credentials: {
          apiKey: options.apiKey,
        },
      },
      {
        actorService: "admin-api",
        actorUserId: `${options.requestPrefix}-user`,
        requestId: `${options.requestPrefix}-create`,
      },
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    await service.testConnection(options.organizationId, connection.id, {
      actorService: "admin-api",
      actorUserId: `${options.requestPrefix}-user`,
      requestId: `${options.requestPrefix}-test`,
    });

    const dispatch = await service.triggerSync(
      options.organizationId,
      connection.id,
      {
        triggerType: "manual",
        forceFullSync: false,
        sourceWindowStart: null,
        sourceWindowEnd: null,
      },
      `${options.requestPrefix}-sync-key`,
      {
        actorService: "admin-api",
        actorUserId: `${options.requestPrefix}-user`,
        requestId: `${options.requestPrefix}-trigger`,
      },
    );

    service.claimSyncRuns(
      [options.organizationId],
      {
        workerId: options.workerId,
        limit: 5,
        leaseSeconds: 120,
      },
      {
        actorService: "worker",
        actorUserId: null,
        requestId: `${options.requestPrefix}-claim`,
      },
    );

    return {
      service,
      connection,
      dispatch,
    };
  }

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
          oloEndpoints: {
            Orders: {
              path: "/api/orders",
            },
          },
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

  it("returns provider runtime access context for an authorized oauth2 connection", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-provider-access-1",
      {
        vendor: "salesforce",
        displayName: "Salesforce Provider Access",
        authMode: "oauth2",
        sourceObjects: ["Account"],
        baseUrl: "https://example.my.salesforce.com",
        config: {
          authorizationEndpoint: "https://login.example.test/authorize",
          tokenEndpoint: "https://login.example.test/token",
        },
        credentials: {
          clientId: "salesforce-client-id",
          clientSecret: "salesforce-client-secret-123",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-provider-access-1",
        requestId: "req-provider-access-1",
      },
    );

    const authStart = service.startAuthorization(
      "org-provider-access-1",
      created.id,
      {
        redirectUri: "https://praedixa.test/oauth/callback",
      },
      {
        actorService: "admin-api",
        actorUserId: "user-provider-access-1",
        requestId: "req-provider-access-2",
      },
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "access-token-provider-123",
        refresh_token: "refresh-token-provider-456",
        expires_in: 3600,
        scope: "api refresh_token",
        token_type: "Bearer",
      }),
    });

    await service.completeAuthorization(
      "org-provider-access-1",
      created.id,
      {
        state: authStart.state,
        code: "authorization-code-provider-123",
      },
      {
        actorService: "admin-api",
        actorUserId: "user-provider-access-1",
        requestId: "req-provider-access-3",
      },
    );

    const accessContext = await service.getProviderRuntimeAccessContext(
      "org-provider-access-1",
      created.id,
    );

    expect(accessContext).toMatchObject({
      organizationId: "org-provider-access-1",
      connectionId: created.id,
      vendor: "salesforce",
      authMode: "oauth2",
      runtimeEnvironment: "production",
      baseUrl: "https://example.my.salesforce.com",
      sourceObjects: ["Account"],
      authorization: {
        headerName: "authorization",
        headerValue: "Bearer access-token-provider-123",
        scopes: ["api", "refresh_token"],
      },
    });
  });

  it("passes oauth audience and UKG tenant headers into provider runtime access context", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-ukg-provider-1",
      {
        vendor: "ukg",
        displayName: "UKG Provider Access",
        authMode: "oauth2",
        sourceObjects: ["Employees"],
        baseUrl: "https://tenant.ukg.example.test",
        config: {
          tokenEndpoint: "https://tenant.ukg.example.test/oauth/token",
          globalTenantId: "ukg-tenant-123",
          oauthAudience: "https://api.ukg.example.test",
          ukgEndpoints: {
            Employees: {
              path: "/api/v1/employees",
            },
          },
        },
        credentials: {
          clientId: "ukg-client-id",
          clientSecret: "ukg-client-secret-123",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-ukg-provider-1",
        requestId: "req-ukg-provider-1",
      },
    );

    mockFetch.mockImplementationOnce(async (_input, init) => {
      expect(init?.method).toBe("POST");
      const body = init?.body;
      expect(body).toBeInstanceOf(URLSearchParams);
      const params = new URLSearchParams(String(body));
      expect(params.get("grant_type")).toBe("client_credentials");
      expect(params.get("audience")).toBe("https://api.ukg.example.test");
      expect(params.get("client_id")).toBe("ukg-client-id");
      return {
        ok: true,
        json: async () => ({
          access_token: "ukg-access-token-123",
          expires_in: 3600,
          scope: "employees.read",
          token_type: "Bearer",
        }),
      };
    });

    const accessContext = await service.getProviderRuntimeAccessContext(
      "org-ukg-provider-1",
      created.id,
    );

    expect(accessContext).toMatchObject({
      organizationId: "org-ukg-provider-1",
      connectionId: created.id,
      vendor: "ukg",
      authMode: "oauth2",
      baseUrl: "https://tenant.ukg.example.test",
      sourceObjects: ["Employees"],
      authorization: {
        headerName: "authorization",
        headerValue: "Bearer ukg-access-token-123",
        scopes: ["employees.read"],
        additionalHeaders: {
          "global-tenant-id": "ukg-tenant-123",
        },
      },
    });
  });

  it("passes Oracle TM oauth access into provider runtime access context", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-oracle-tm-provider-1",
      {
        vendor: "oracle_tm",
        displayName: "Oracle TM Provider Access",
        authMode: "oauth2",
        sourceObjects: ["Shipment"],
        baseUrl: "https://otm.example.test",
        config: {
          tokenEndpoint: "https://otm.example.test/oauth/token",
          oracleTmEndpoints: {
            Shipment: {
              path: "/rest/v1/shipments",
            },
          },
        },
        credentials: {
          clientId: "oracle-client-id",
          clientSecret: "oracle-client-secret-123",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-oracle-tm-provider-1",
        requestId: "req-oracle-tm-provider-1",
      },
    );

    mockFetch.mockImplementationOnce(async (_input, init) => {
      expect(init?.method).toBe("POST");
      const body = init?.body;
      expect(body).toBeInstanceOf(URLSearchParams);
      const params = new URLSearchParams(String(body));
      expect(params.get("grant_type")).toBe("client_credentials");
      expect(params.get("client_id")).toBe("oracle-client-id");
      return {
        ok: true,
        json: async () => ({
          access_token: "oracle-access-token-123",
          expires_in: 3600,
          scope: "shipment.read order.read",
          token_type: "Bearer",
        }),
      };
    });

    const accessContext = await service.getProviderRuntimeAccessContext(
      "org-oracle-tm-provider-1",
      created.id,
    );

    expect(accessContext).toMatchObject({
      organizationId: "org-oracle-tm-provider-1",
      connectionId: created.id,
      vendor: "oracle_tm",
      authMode: "oauth2",
      baseUrl: "https://otm.example.test",
      sourceObjects: ["Shipment"],
      authorization: {
        headerName: "authorization",
        headerValue: "Bearer oracle-access-token-123",
        scopes: ["shipment.read", "order.read"],
      },
    });
  });

  it("passes SAP TM oauth access into provider runtime access context", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-sap-tm-provider-1",
      {
        vendor: "sap_tm",
        displayName: "SAP TM Provider Access",
        authMode: "oauth2",
        sourceObjects: ["FreightOrder"],
        baseUrl: "https://sap-tm.example.test",
        config: {
          tokenEndpoint: "https://sap-tm.example.test/oauth/token",
          sapTmEndpoints: {
            FreightOrder: {
              path: "/sap/opu/odata/freight-orders",
            },
          },
        },
        credentials: {
          clientId: "sap-client-id",
          clientSecret: "sap-client-secret-123",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-sap-tm-provider-1",
        requestId: "req-sap-tm-provider-1",
      },
    );

    mockFetch.mockImplementationOnce(async (_input, init) => {
      expect(init?.method).toBe("POST");
      const body = init?.body;
      expect(body).toBeInstanceOf(URLSearchParams);
      const params = new URLSearchParams(String(body));
      expect(params.get("grant_type")).toBe("client_credentials");
      expect(params.get("client_id")).toBe("sap-client-id");
      return {
        ok: true,
        json: async () => ({
          access_token: "sap-access-token-123",
          expires_in: 3600,
          scope: "freightorder.read freightunit.read",
          token_type: "Bearer",
        }),
      };
    });

    const accessContext = await service.getProviderRuntimeAccessContext(
      "org-sap-tm-provider-1",
      created.id,
    );

    expect(accessContext).toMatchObject({
      organizationId: "org-sap-tm-provider-1",
      connectionId: created.id,
      vendor: "sap_tm",
      authMode: "oauth2",
      baseUrl: "https://sap-tm.example.test",
      sourceObjects: ["FreightOrder"],
      authorization: {
        headerName: "authorization",
        headerValue: "Bearer sap-access-token-123",
        scopes: ["freightorder.read", "freightunit.read"],
      },
    });
  });

  it("passes the Toast restaurant header into provider runtime access context", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-toast-provider-1",
      {
        vendor: "toast",
        displayName: "Toast Provider Access",
        authMode: "api_key",
        sourceObjects: ["Orders"],
        baseUrl: "https://ws-api.toasttab.com",
        config: {
          testEndpoint: "https://ws-api.toasttab.com/config/v2/menus",
          toastRestaurantExternalId: "restaurant-ext-123",
          toastEndpoints: {
            Orders: {
              path: "/orders/v1/orders",
            },
          },
        },
        credentials: {
          apiKey: "toast-api-key-1234567890",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-toast-provider-1",
        requestId: "req-toast-provider-1",
      },
    );

    const accessContext = await service.getProviderRuntimeAccessContext(
      "org-toast-provider-1",
      created.id,
    );

    expect(accessContext).toMatchObject({
      organizationId: "org-toast-provider-1",
      connectionId: created.id,
      vendor: "toast",
      authMode: "api_key",
      baseUrl: "https://ws-api.toasttab.com",
      sourceObjects: ["Orders"],
      authorization: {
        headerName: "x-api-key",
        headerValue: "toast-api-key-1234567890",
        scopes: null,
        additionalHeaders: {
          "Toast-Restaurant-External-ID": "restaurant-ext-123",
        },
      },
    });
  });

  it("passes Manhattan api key access into provider runtime access context", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-manhattan-provider-1",
      {
        vendor: "manhattan",
        displayName: "Manhattan Provider Access",
        authMode: "api_key",
        sourceObjects: ["Wave"],
        baseUrl: "https://manhattan.example.test",
        config: {
          manhattanEndpoints: {
            Wave: {
              path: "/api/waves",
            },
          },
        },
        credentials: {
          apiKey: "manhattan-api-key-1234567890",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-manhattan-provider-1",
        requestId: "req-manhattan-provider-1",
      },
    );

    const accessContext = await service.getProviderRuntimeAccessContext(
      "org-manhattan-provider-1",
      created.id,
    );

    expect(accessContext).toMatchObject({
      organizationId: "org-manhattan-provider-1",
      connectionId: created.id,
      vendor: "manhattan",
      authMode: "api_key",
      baseUrl: "https://manhattan.example.test",
      sourceObjects: ["Wave"],
      authorization: {
        headerName: "x-api-key",
        headerValue: "manhattan-api-key-1234567890",
        scopes: null,
      },
    });
  });

  it("passes Blue Yonder api key access into provider runtime access context", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-blue-yonder-provider-1",
      {
        vendor: "blue_yonder",
        displayName: "Blue Yonder Provider Access",
        authMode: "api_key",
        sourceObjects: ["DemandPlan"],
        baseUrl: "https://blue-yonder.example.test",
        config: {
          blueYonderEndpoints: {
            DemandPlan: {
              path: "/api/demand-plans",
            },
          },
        },
        credentials: {
          apiKey: "blue-yonder-api-key-1234567890",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-blue-yonder-provider-1",
        requestId: "req-blue-yonder-provider-1",
      },
    );

    const accessContext = await service.getProviderRuntimeAccessContext(
      "org-blue-yonder-provider-1",
      created.id,
    );

    expect(accessContext).toMatchObject({
      organizationId: "org-blue-yonder-provider-1",
      connectionId: created.id,
      vendor: "blue_yonder",
      authMode: "api_key",
      baseUrl: "https://blue-yonder.example.test",
      sourceObjects: ["DemandPlan"],
      authorization: {
        headerName: "x-api-key",
        headerValue: "blue-yonder-api-key-1234567890",
        scopes: null,
      },
    });
  });

  it("passes NCR Aloha api key access into provider runtime access context", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-aloha-provider-1",
      {
        vendor: "ncr_aloha",
        displayName: "NCR Aloha Provider Access",
        authMode: "api_key",
        sourceObjects: ["Check"],
        baseUrl: "https://aloha.example.test",
        config: {
          alohaEndpoints: {
            Check: {
              path: "/api/checks",
            },
          },
        },
        credentials: {
          apiKey: "aloha-api-key-1234567890",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-aloha-provider-1",
        requestId: "req-aloha-provider-1",
      },
    );

    const accessContext = await service.getProviderRuntimeAccessContext(
      "org-aloha-provider-1",
      created.id,
    );

    expect(accessContext).toMatchObject({
      organizationId: "org-aloha-provider-1",
      connectionId: created.id,
      vendor: "ncr_aloha",
      authMode: "api_key",
      baseUrl: "https://aloha.example.test",
      sourceObjects: ["Check"],
      authorization: {
        headerName: "x-api-key",
        headerValue: "aloha-api-key-1234567890",
        scopes: null,
      },
    });
  });

  it("passes Geotab session credentials into provider runtime access context", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-geotab-provider-1",
      {
        vendor: "geotab",
        displayName: "Geotab Provider Access",
        authMode: "session",
        sourceObjects: ["Trip"],
        baseUrl: "https://my.geotab.com/apiv1",
        config: {
          geotabFeeds: {
            Trip: {
              typeName: "Trip",
              search: {
                fromDate: "2026-03-18T00:00:00Z",
              },
            },
          },
        },
        credentials: {
          database: "acme-fleet",
          username: "dispatcher@example.com",
          password: "geotab-password-123",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-geotab-provider-1",
        requestId: "req-geotab-provider-1",
      },
    );

    const accessContext = await service.getProviderRuntimeAccessContext(
      "org-geotab-provider-1",
      created.id,
    );

    expect(accessContext).toMatchObject({
      organizationId: "org-geotab-provider-1",
      connectionId: created.id,
      vendor: "geotab",
      authMode: "session",
      baseUrl: "https://my.geotab.com/apiv1",
      sourceObjects: ["Trip"],
      authorization: {
        headerName: "",
        headerValue: "",
        scopes: null,
        credentialFields: {
          database: "acme-fleet",
          userName: "dispatcher@example.com",
          password: "geotab-password-123",
        },
      },
    });
  });

  it("passes CDK service-account credentials into provider runtime access context", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-cdk-provider-1",
      {
        vendor: "cdk",
        displayName: "CDK Provider Access",
        authMode: "service_account",
        sourceObjects: ["ServiceOrders"],
        baseUrl: "https://fortellis.example.test",
        config: {
          cdkEndpoints: {
            ServiceOrders: {
              path: "/api/service-orders",
            },
          },
        },
        credentials: {
          clientId: "cdk-client-id-123",
          clientSecret: "cdk-client-secret-1234567890",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-cdk-provider-1",
        requestId: "req-cdk-provider-1",
      },
    );

    const accessContext = await service.getProviderRuntimeAccessContext(
      "org-cdk-provider-1",
      created.id,
    );

    expect(accessContext).toMatchObject({
      organizationId: "org-cdk-provider-1",
      connectionId: created.id,
      vendor: "cdk",
      authMode: "service_account",
      baseUrl: "https://fortellis.example.test",
      sourceObjects: ["ServiceOrders"],
      authorization: {
        headerName: "",
        headerValue: "",
        scopes: null,
        credentialFields: {
          clientId: "cdk-client-id-123",
          clientSecret: "cdk-client-secret-1234567890",
        },
      },
    });
  });

  it("passes Reynolds service-account credentials into provider runtime access context", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-reynolds-provider-1",
      {
        vendor: "reynolds",
        displayName: "Reynolds Provider Access",
        authMode: "service_account",
        sourceObjects: ["RepairOrder"],
        baseUrl: "https://reyrey.example.test",
        config: {
          reynoldsEndpoints: {
            RepairOrder: {
              path: "/api/repair-orders",
            },
          },
        },
        credentials: {
          clientId: "reynolds-client-id-123",
          clientSecret: "reynolds-client-secret-1234567890",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-reynolds-provider-1",
        requestId: "req-reynolds-provider-1",
      },
    );

    const accessContext = await service.getProviderRuntimeAccessContext(
      "org-reynolds-provider-1",
      created.id,
    );

    expect(accessContext).toMatchObject({
      organizationId: "org-reynolds-provider-1",
      connectionId: created.id,
      vendor: "reynolds",
      authMode: "service_account",
      baseUrl: "https://reyrey.example.test",
      sourceObjects: ["RepairOrder"],
      authorization: {
        headerName: "",
        headerValue: "",
        scopes: null,
        credentialFields: {
          clientId: "reynolds-client-id-123",
          clientSecret: "reynolds-client-secret-1234567890",
        },
      },
    });
  });

  it("uses Geotab authenticate as the live probe for session connections", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-geotab-probe-1",
      {
        vendor: "geotab",
        displayName: "Geotab Probe",
        authMode: "session",
        sourceObjects: ["Trip"],
        baseUrl: "https://my.geotab.com/apiv1",
        config: {
          geotabFeeds: {
            Trip: {
              typeName: "Trip",
              search: {
                fromDate: "2026-03-18T00:00:00Z",
              },
            },
          },
        },
        credentials: {
          database: "acme-fleet",
          username: "dispatcher@example.com",
          password: "geotab-password-123",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-geotab-probe-1",
        requestId: "req-geotab-probe-1",
      },
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          credentials: {
            database: "acme-fleet",
            userName: "dispatcher@example.com",
            sessionId: "session-123",
          },
        },
      }),
    });

    const result = await service.testConnection(
      "org-geotab-probe-1",
      created.id,
      {
        actorService: "admin-api",
        actorUserId: "user-geotab-probe-1",
        requestId: "req-geotab-probe-2",
      },
    );

    expect(result).toMatchObject({
      checkedScopes: ["session"],
      ok: true,
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [requestUrl, init] = mockFetch.mock.calls[0] ?? [];
    expect(requestUrl).toBe("https://my.geotab.com/apiv1");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      accept: "application/json",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      method: "Authenticate",
      params: {
        database: "acme-fleet",
        userName: "dispatcher@example.com",
        password: "geotab-password-123",
      },
    });
  });

  it("claims queued sync runs for an allowed organization and marks them completed", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const connection = service.createConnection(
      "org-sync-1",
      {
        vendor: "olo",
        displayName: "Olo Queue",
        authMode: "api_key",
        baseUrl: "https://partner.olo.test",
        config: {
          testEndpoint: "https://partner.olo.test/health",
          authHeaderName: "x-api-key",
          oloEndpoints: {
            Orders: {
              path: "/api/orders",
            },
          },
        },
        credentials: {
          apiKey: "olo-api-key-sync-123456",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-sync-1",
        requestId: "req-sync-1",
      },
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    await service.testConnection("org-sync-1", connection.id, {
      actorService: "admin-api",
      actorUserId: "user-sync-1",
      requestId: "req-sync-2",
    });

    const dispatch = await service.triggerSync(
      "org-sync-1",
      connection.id,
      {
        triggerType: "manual",
        forceFullSync: false,
        sourceWindowStart: null,
        sourceWindowEnd: null,
      },
      "sync-queue-0001",
      {
        actorService: "admin-api",
        actorUserId: "user-sync-1",
        requestId: "req-sync-3",
      },
    );

    const claimed = service.claimSyncRuns(
      ["org-sync-1"],
      {
        workerId: "queue-worker-1",
        limit: 5,
        leaseSeconds: 120,
      },
      {
        actorService: "worker",
        actorUserId: null,
        requestId: "req-sync-4",
      },
    );

    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.id).toBe(dispatch.run.id);
    expect(claimed[0]?.status).toBe("running");
    expect(claimed[0]?.lockedBy).toBe("queue-worker-1");
    expect(claimed[0]?.attempts).toBe(1);

    const completed = service.markSyncRunCompleted(
      "org-sync-1",
      dispatch.run.id,
      {
        workerId: "queue-worker-1",
        recordsFetched: 3,
        recordsWritten: 2,
      },
      {
        actorService: "worker",
        actorUserId: null,
        requestId: "req-sync-5",
      },
    );

    expect(completed.status).toBe("success");
    expect(completed.recordsFetched).toBe(3);
    expect(completed.recordsWritten).toBe(2);
    expect(completed.lockedBy).toBeNull();
    expect(completed.leaseExpiresAt).toBeNull();
  });

  it("requeues retryable sync run failures with a bounded retry delay", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const connection = service.createConnection(
      "org-sync-2",
      {
        vendor: "olo",
        displayName: "Olo Retry",
        authMode: "api_key",
        baseUrl: "https://partner.olo.test",
        config: {
          testEndpoint: "https://partner.olo.test/health",
          authHeaderName: "x-api-key",
          oloEndpoints: {
            Orders: {
              path: "/api/orders",
            },
          },
        },
        credentials: {
          apiKey: "olo-api-key-retry-123456",
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-sync-2",
        requestId: "req-sync-6",
      },
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    await service.testConnection("org-sync-2", connection.id, {
      actorService: "admin-api",
      actorUserId: "user-sync-2",
      requestId: "req-sync-7",
    });

    const dispatch = await service.triggerSync(
      "org-sync-2",
      connection.id,
      {
        triggerType: "manual",
        forceFullSync: false,
        sourceWindowStart: null,
        sourceWindowEnd: null,
      },
      "sync-queue-0002",
      {
        actorService: "admin-api",
        actorUserId: "user-sync-2",
        requestId: "req-sync-8",
      },
    );

    service.claimSyncRuns(
      ["org-sync-2"],
      {
        workerId: "queue-worker-2",
        limit: 5,
        leaseSeconds: 120,
      },
      {
        actorService: "worker",
        actorUserId: null,
        requestId: "req-sync-9",
      },
    );

    const failed = service.markSyncRunFailed(
      "org-sync-2",
      dispatch.run.id,
      {
        workerId: "queue-worker-2",
        errorMessage: "Temporary connector outage",
        errorClass: "transient",
        retryable: true,
        retryDelaySeconds: 45,
      },
      {
        actorService: "worker",
        actorUserId: null,
        requestId: "req-sync-10",
      },
    );

    expect(failed.status).toBe("queued");
    expect(failed.errorClass).toBe("transient");
    expect(failed.errorMessage).toBe("Temporary connector outage");
    expect(failed.lockedBy).toBeNull();
    expect(failed.leaseExpiresAt).toBeNull();
    expect(Date.parse(failed.availableAt)).toBeGreaterThan(Date.now());
  });

  it("returns a claimed sync execution plan and persists sync state for the owning worker", async () => {
    const workerId = "queue-worker-plan-1";
    const { service, connection, dispatch } = await createClaimedSyncRunFixture(
      {
        organizationId: "org-sync-plan-1",
        displayName: "Olo Execution Plan",
        apiKey: "olo-api-key-plan-123456",
        workerId,
        requestPrefix: "req-sync-plan-1",
      },
    );

    const executionPlan = service.getSyncRunExecutionPlan(
      "org-sync-plan-1",
      dispatch.run.id,
      {
        workerId,
      },
      {
        actorService: "worker",
        actorUserId: null,
        requestId: "req-sync-plan-5",
      },
    );

    expect(executionPlan.connection.id).toBe(connection.id);
    expect(executionPlan.credentials).toMatchObject({
      apiKey: "olo-api-key-plan-123456",
    });
    expect(executionPlan.syncStates).toEqual([]);

    const state = service.upsertSyncStateForRun(
      "org-sync-plan-1",
      dispatch.run.id,
      {
        workerId,
        sourceObject: "Orders",
        watermarkText: "2026-03-19T12:00:00Z",
        watermarkAt: "2026-03-19T12:00:00Z",
        cursorJson: {
          processedFiles: {
            "/exports/employees_2026-03-19.csv": {
              fingerprint: "employees-1",
            },
          },
        },
      },
      {
        actorService: "worker",
        actorUserId: null,
        requestId: "req-sync-plan-6",
      },
    );

    expect(state.sourceObject).toBe("Orders");
    expect(state.updatedByWorker).toBe(workerId);
    expect(state.cursorJson).toMatchObject({
      processedFiles: {
        "/exports/employees_2026-03-19.csv": {
          fingerprint: "employees-1",
        },
      },
    });

    const refreshedPlan = service.getSyncRunExecutionPlan(
      "org-sync-plan-1",
      dispatch.run.id,
      {
        workerId,
      },
      {
        actorService: "worker",
        actorUserId: null,
        requestId: "req-sync-plan-7",
      },
    );

    expect(refreshedPlan.syncStates).toHaveLength(1);
    expect(refreshedPlan.syncStates[0]?.sourceObject).toBe("Orders");
  });

  it("rejects reserved keys in runtime sync cursor payloads", async () => {
    const workerId = "queue-worker-plan-2";
    const { service, dispatch } = await createClaimedSyncRunFixture({
      organizationId: "org-sync-plan-2",
      displayName: "Olo Reserved Cursor Keys",
      apiKey: "olo-api-key-plan-654321",
      workerId,
      requestPrefix: "req-sync-plan-2",
    });

    expect(() =>
      service.upsertSyncStateForRun(
        "org-sync-plan-2",
        dispatch.run.id,
        {
          workerId,
          sourceObject: "Orders",
          cursorJson: {
            ["__proto__"]: {
              polluted: true,
            },
          },
        },
        {
          actorService: "worker",
          actorUserId: null,
          requestId: "req-sync-plan-12",
        },
      ),
    ).toThrow(/reserved key/i);
  });

  it("accepts provider events for the owning sync run worker", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
      new LocalFilePayloadStore(payloadRoot),
    );

    const connection = service.createConnection(
      "org-provider-events-1",
      {
        vendor: "salesforce",
        displayName: "Salesforce Provider Events",
        authMode: "oauth2",
        sourceObjects: ["Account"],
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
        actorUserId: "user-provider-events-1",
        requestId: "req-provider-events-1",
      },
    );

    const authStart = service.startAuthorization(
      "org-provider-events-1",
      connection.id,
      {
        redirectUri: "https://praedixa.test/oauth/callback",
      },
      {
        actorService: "admin-api",
        actorUserId: "user-provider-events-1",
        requestId: "req-provider-events-2",
      },
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "access-token-events-123",
        refresh_token: "refresh-token-events-456",
        expires_in: 3600,
        scope: "api refresh_token",
        token_type: "Bearer",
      }),
    });

    await service.completeAuthorization(
      "org-provider-events-1",
      connection.id,
      {
        state: authStart.state,
        code: "authorization-code-events-123",
      },
      {
        actorService: "admin-api",
        actorUserId: "user-provider-events-1",
        requestId: "req-provider-events-3",
      },
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    await service.testConnection("org-provider-events-1", connection.id, {
      actorService: "admin-api",
      actorUserId: "user-provider-events-1",
      requestId: "req-provider-events-4",
    });

    const dispatch = await service.triggerSync(
      "org-provider-events-1",
      connection.id,
      {
        triggerType: "manual",
        forceFullSync: false,
        sourceWindowStart: null,
        sourceWindowEnd: null,
      },
      "sync-provider-events-0001",
      {
        actorService: "admin-api",
        actorUserId: "user-provider-events-1",
        requestId: "req-provider-events-5",
      },
    );

    service.claimSyncRuns(
      ["org-provider-events-1"],
      {
        workerId: "queue-worker-provider-events-1",
        limit: 5,
        leaseSeconds: 120,
      },
      {
        actorService: "worker",
        actorUserId: null,
        requestId: "req-provider-events-6",
      },
    );

    const ingested = await service.ingestProviderEvents(
      "org-provider-events-1",
      connection.id,
      {
        syncRunId: dispatch.run.id,
        workerId: "queue-worker-provider-events-1",
        schemaVersion: "salesforce.rest.v1",
        events: [
          {
            eventId: "sf-account-001",
            sourceObject: "Account",
            sourceRecordId: "001",
            sourceUpdatedAt: "2026-03-19T12:00:00.000Z",
            payload: {
              provider: "salesforce",
              account: {
                id: "001",
                name: "Acme",
              },
            },
          },
        ],
      },
      {
        actorService: "worker",
        actorUserId: null,
        requestId: "req-provider-events-7",
      },
    );

    expect(ingested.accepted).toBe(1);
    expect(ingested.duplicates).toBe(0);
    expect(ingested.events[0]?.credentialId).toBe(
      `runtime-sync:${dispatch.run.id}`,
    );

    const rawEvents = service.listRawEvents(
      "org-provider-events-1",
      connection.id,
    );
    expect(rawEvents).toHaveLength(1);
    expect(rawEvents[0]?.credentialId).toBe(`runtime-sync:${dispatch.run.id}`);

    const storedPayload = await service.getRawEventPayload(
      "org-provider-events-1",
      connection.id,
      rawEvents[0]?.id ?? "",
    );
    expect(storedPayload).toMatchObject({
      provider: "salesforce",
      account: {
        id: "001",
        name: "Acme",
      },
    });

    const audits = service.listAuditEvents(
      "org-provider-events-1",
      connection.id,
    );
    expect(audits.map((event) => event.action)).toContain(
      "connectors.provider_events.accepted",
    );
  });

  it("keeps SFTP connections blocked for sync dispatch until a live probe strategy exists", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const connection = service.createConnection(
      "org-sync-sftp-guard-1",
      {
        vendor: "fourth",
        displayName: "Fourth SFTP Guard",
        authMode: "sftp",
        sourceObjects: ["Employees"],
        baseUrl: "https://api.vendor.example.test",
        config: {
          sftpPull: {
            remoteDirectory: "/exports",
            filePattern: "*.csv",
            archiveDirectory: "/processed",
            datasetId: "11111111-1111-1111-1111-111111111111",
            sourceObject: "Employees",
          },
        },
        credentials: {
          host: "sftp.fourth.example.test",
          username: "praedixa",
          privateKey: TEST_PRIVATE_KEY_PEM,
          port: 22,
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-sync-sftp-guard-1",
        requestId: "req-sync-sftp-guard-1",
      },
    );

    await expect(
      service.triggerSync(
        "org-sync-sftp-guard-1",
        connection.id,
        {
          triggerType: "manual",
          forceFullSync: false,
          sourceWindowStart: null,
          sourceWindowEnd: null,
        },
        "sync-queue-sftp-guard-0001",
        {
          actorService: "admin-api",
          actorUserId: "user-sync-sftp-guard-1",
          requestId: "req-sync-sftp-guard-2",
        },
      ),
    ).rejects.toThrow(/not ready for sync|probe strategy/i);
  });

  it("fails closed when a connection auth mode has no live probe strategy yet", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const created = service.createConnection(
      "org-unsupported",
      {
        vendor: "reynolds",
        displayName: "Reynolds SFTP",
        authMode: "sftp",
        baseUrl: "https://api.vendor.example.test",
        credentials: {
          host: "sftp.vendor.example.test",
          username: "praedixa",
          privateKey: TEST_PRIVATE_KEY_PEM,
        },
      },
      {
        actorService: "admin-api",
        actorUserId: "user-unsupported",
        requestId: "req-unsupported-1",
      },
    );

    await expect(
      service.testConnection("org-unsupported", created.id, {
        actorService: "admin-api",
        actorUserId: "user-unsupported",
        requestId: "req-unsupported-2",
      }),
    ).rejects.toThrow(/probe strategy/i);
  });

  it("rejects SFTP password authentication and requires a private key", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    expect(() =>
      service.createConnection(
        "org-sftp-1",
        {
          vendor: "reynolds",
          displayName: "Legacy SFTP Password",
          authMode: "sftp",
          baseUrl: "https://api.vendor.example.test",
          credentials: {
            host: "sftp.vendor.example.test",
            username: "praedixa",
            password: "password-1234567890",
          },
        },
        {
          actorService: "admin-api",
          actorUserId: "user-sftp-1",
          requestId: "req-sftp-1",
        },
      ),
    ).toThrow(/forbidden|privateKey/i);
  });

  it("rejects service account username/password fallbacks", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    expect(() =>
      service.createConnection(
        "org-service-account-1",
        {
          vendor: "salesforce",
          displayName: "Legacy Service Account Password",
          authMode: "service_account",
          baseUrl: "https://api.vendor.example.test",
          credentials: {
            username: "svc-praedixa",
            password: "password-1234567890",
          },
        },
        {
          actorService: "admin-api",
          actorUserId: "user-service-account-1",
          requestId: "req-service-account-1",
        },
      ),
    ).toThrow(/forbidden|clientId\/clientSecret|clientEmail\/privateKey/i);
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
            phone: "+33123456789",
            message: "Please call me back",
            prenom: "Alice",
            nom: "Martin",
            telephone: "+33987654321",
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
      email: "ops...st",
      phone: "+33...89",
      message: "Ple...ck",
      prenom: "***REDACTED***",
      nom: "***REDACTED***",
      telephone: "+33...21",
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
    expect(service.listRawEventSummaries("org-3", connection.id)).toEqual([
      {
        id: rawEvents[0]?.id ?? "",
        credentialId: rawEvents[0]?.credentialId ?? "",
        eventId: "evt-1",
        sourceObject: "Account",
        sourceRecordId: "001",
        schemaVersion: "crm.account.v1",
        objectStoreKey: rawEvents[0]?.objectStoreKey ?? "",
        sizeBytes: rawEvents[0]?.sizeBytes ?? 0,
        processingStatus: "pending",
        receivedAt: rawEvents[0]?.receivedAt ?? "",
      },
    ]);
    expect(
      "payloadPreview" in
        (service.listRawEventSummaries("org-3", connection.id)[0] ?? {}),
    ).toBe(false);

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
