import { describe, expect, it } from "vitest";

import { CONNECTOR_CATALOG } from "../catalog.js";
import { ConnectorService } from "../service.js";
import { InMemoryConnectorStore } from "../store.js";
import type {
  ConnectorAuthMode,
  ConnectorConnection,
  CredentialInput,
} from "../types.js";
import { CONNECTOR_CERTIFICATION_FIXTURES } from "./fixtures/certification-fixtures.js";

const TEST_PRIVATE_KEY_PEM = [
  "-----BEGIN",
  " PRIVATE KEY-----",
  "\nunit-test-key\n",
  "-----END",
  " PRIVATE KEY-----",
].join("");

function buildCredentials(authMode: ConnectorAuthMode): CredentialInput {
  switch (authMode) {
    case "oauth2":
      return {
        clientId: "client-id-123",
        clientSecret: "client-secret-1234567890",
      };
    case "api_key":
      return {
        apiKey: "api-key-1234567890",
      };
    case "session":
      return {
        database: "geotab-db",
        username: "dispatcher@example.com",
        password: "geotab-password-123",
      };
    case "service_account":
      return {
        clientId: "service-client-id",
        clientSecret: "service-client-secret-1234567890",
      };
    case "sftp":
      return {
        host: "sftp.vendor.example.test",
        username: "praedixa",
        privateKey: TEST_PRIVATE_KEY_PEM,
      };
  }
}

function buildConnectionConfig(
  authMode: ConnectorAuthMode,
  requiredConfigFields: readonly string[],
  includeFields: boolean,
) {
  if (!includeFields) {
    return {};
  }

  const config: Record<string, unknown> = {};
  for (const field of requiredConfigFields) {
    if (field === "tokenEndpoint") {
      config.tokenEndpoint = "https://oauth.vendor.example.test/token";
      continue;
    }
    if (field === "authorizationEndpoint") {
      config.authorizationEndpoint =
        "https://oauth.vendor.example.test/authorize";
      continue;
    }
    if (field === "testEndpoint") {
      config.testEndpoint = "https://api.vendor.example.test/ping";
      continue;
    }
    if (field === "globalTenantId") {
      config.globalTenantId = "tenant-123";
      continue;
    }
    if (field === "ukgEndpoints") {
      config.ukgEndpoints = {
        Employees: {
          path: "/api/v1/employees",
        },
      };
      continue;
    }
    if (field === "toastRestaurantExternalId") {
      config.toastRestaurantExternalId = "restaurant-ext-123";
      continue;
    }
    if (field === "toastEndpoints") {
      config.toastEndpoints = {
        Orders: {
          path: "/api/orders/v1/orders",
        },
      };
      continue;
    }
    if (field === "oloEndpoints") {
      config.oloEndpoints = {
        Orders: {
          path: "/api/orders",
        },
      };
      continue;
    }
    if (field === "cdkEndpoints") {
      config.cdkEndpoints = {
        ServiceOrders: {
          path: "/api/service-orders",
        },
      };
      continue;
    }
    if (field === "reynoldsEndpoints") {
      config.reynoldsEndpoints = {
        RepairOrder: {
          path: "/api/repair-orders",
        },
      };
      continue;
    }
    if (field === "geotabFeeds") {
      config.geotabFeeds = {
        Trip: {
          typeName: "Trip",
          search: {
            fromDate: "2026-03-18T00:00:00Z",
          },
        },
      };
      continue;
    }
    if (field === "fourthEndpoints") {
      config.fourthEndpoints = {
        Employees: {
          path: "/api/employees",
        },
      };
      continue;
    }
    if (field === "oracleTmEndpoints") {
      config.oracleTmEndpoints = {
        Shipment: {
          path: "/rest/v1/shipments",
        },
      };
      continue;
    }
    if (field === "sapTmEndpoints") {
      config.sapTmEndpoints = {
        FreightOrder: {
          path: "/sap/opu/odata/freight-orders",
        },
      };
      continue;
    }
    if (field === "blueYonderEndpoints") {
      config.blueYonderEndpoints = {
        DemandPlan: {
          path: "/api/demand-plans",
        },
      };
      continue;
    }
    if (field === "manhattanEndpoints") {
      config.manhattanEndpoints = {
        Wave: {
          path: "/api/waves",
        },
      };
      continue;
    }
    if (field === "alohaEndpoints") {
      config.alohaEndpoints = {
        Check: {
          path: "/api/checks",
        },
      };
      continue;
    }
  }
  if (authMode === "oauth2" && config.authorizationEndpoint == null) {
    config.authorizationEndpoint =
      "https://oauth.vendor.example.test/authorize";
  }
  if (authMode === "oauth2" && config.tokenEndpoint == null) {
    config.tokenEndpoint = "https://oauth.vendor.example.test/token";
  }
  return config;
}

function buildBaseUrl(requiredConfigFields: readonly string[]): string | null {
  return requiredConfigFields.includes("baseUrl")
    ? "https://api.vendor.example.test"
    : "https://probe.vendor.example.test";
}

function createConnection(
  service: ConnectorService,
  input: {
    vendor: ConnectorConnection["vendor"];
    displayName: string;
    authMode: ConnectorAuthMode;
    requiredConfigFields: readonly string[];
    withConfig: boolean;
    withCredentials: boolean;
  },
) {
  return service.createConnection(
    `org-${input.vendor}-${input.displayName.toLowerCase().replace(/\s+/g, "-")}`,
    {
      vendor: input.vendor,
      displayName: input.displayName,
      authMode: input.authMode,
      config: buildConnectionConfig(
        input.authMode,
        input.requiredConfigFields,
        input.withConfig,
      ),
      baseUrl: input.withConfig
        ? buildBaseUrl(input.requiredConfigFields)
        : null,
      credentials: input.withCredentials
        ? buildCredentials(input.authMode)
        : null,
    },
    {
      actorService: "admin-api",
      actorUserId: "user-1",
      requestId: `req-${input.vendor}-${input.displayName}`,
    },
  );
}

describe("connector activation readiness", () => {
  it("reports missing standard prerequisites for every certified connector", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    for (const [vendor, fixture] of Object.entries(
      CONNECTOR_CERTIFICATION_FIXTURES,
    )) {
      const connection = createConnection(service, {
        vendor: vendor as ConnectorConnection["vendor"],
        displayName: `${vendor} bare`,
        authMode: fixture.activationReadinessExpectation.primaryAuthMode,
        requiredConfigFields:
          fixture.activationReadinessExpectation.requiredConfigFields,
        withConfig: false,
        withCredentials: false,
      });

      const readiness = service.getConnectionActivationReadiness(
        connection.organizationId,
        connection.id,
      );

      expect(readiness.isReadyForConnectionTest).toBe(false);
      expect(readiness.isReadyForSync).toBe(false);
      expect(readiness.missingRequiredConfigFields).toEqual(
        fixture.activationReadinessExpectation.requiredConfigFields,
      );
      expect(readiness.missingCredentialFields).toEqual(
        CONNECTOR_CATALOG.find((item) => item.vendor === vendor)!
          .credentialFieldHints[
          fixture.activationReadinessExpectation.primaryAuthMode
        ] ?? [],
      );
    }
  });

  it("marks api_key and session connectors ready for connection tests once minimal prerequisites are stored", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    for (const [vendor, fixture] of Object.entries(
      CONNECTOR_CERTIFICATION_FIXTURES,
    )) {
      const primaryAuthMode =
        fixture.activationReadinessExpectation.primaryAuthMode;
      if (primaryAuthMode !== "api_key" && primaryAuthMode !== "session") {
        continue;
      }

      const connection = createConnection(service, {
        vendor: vendor as ConnectorConnection["vendor"],
        displayName: `${vendor} ready`,
        authMode: fixture.activationReadinessExpectation.primaryAuthMode,
        requiredConfigFields:
          fixture.activationReadinessExpectation.requiredConfigFields,
        withConfig: true,
        withCredentials: true,
      });

      const readiness = service.getConnectionActivationReadiness(
        connection.organizationId,
        connection.id,
      );

      expect(readiness.missingRequiredConfigFields).toEqual([]);
      expect(readiness.missingCredentialFields).toEqual([]);
      expect(readiness.isReadyForAuthorizationStart).toBe(false);
      expect(readiness.isReadyForConnectionTest).toBe(true);
      expect(readiness.isReadyForSync).toBe(false);
      expect(readiness.recommendedNextStep).toContain("connection test");
    }
  });

  it("keeps service_account and sftp connectors fail-closed until a live probe strategy exists", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    for (const [vendor, fixture] of Object.entries(
      CONNECTOR_CERTIFICATION_FIXTURES,
    )) {
      const authMode = fixture.activationReadinessExpectation.primaryAuthMode;
      if (authMode !== "service_account" && authMode !== "sftp") {
        continue;
      }

      const connection = createConnection(service, {
        vendor: vendor as ConnectorConnection["vendor"],
        displayName: `${vendor} blocked`,
        authMode,
        requiredConfigFields:
          fixture.activationReadinessExpectation.requiredConfigFields,
        withConfig: true,
        withCredentials: true,
      });

      const readiness = service.getConnectionActivationReadiness(
        connection.organizationId,
        connection.id,
      );

      expect(readiness.isReadyForAuthorizationStart).toBe(false);
      expect(readiness.isReadyForConnectionTest).toBe(false);
      expect(readiness.isReadyForSync).toBe(false);
      expect(readiness.blockingIssues.map((issue) => issue.code)).toContain(
        "missing_live_probe_strategy",
      );
      expect(readiness.recommendedNextStep).toContain("live probe strategy");
    }
  });

  it("keeps oauth connectors in authorization-required state until the auth flow completes", () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    for (const [vendor, fixture] of Object.entries(
      CONNECTOR_CERTIFICATION_FIXTURES,
    )) {
      if (fixture.activationReadinessExpectation.primaryAuthMode !== "oauth2") {
        continue;
      }

      const connection = createConnection(service, {
        vendor: vendor as ConnectorConnection["vendor"],
        displayName: `${vendor} oauth`,
        authMode: "oauth2",
        requiredConfigFields:
          fixture.activationReadinessExpectation.requiredConfigFields,
        withConfig: true,
        withCredentials: true,
      });

      const readiness = service.getConnectionActivationReadiness(
        connection.organizationId,
        connection.id,
      );

      expect(readiness.missingRequiredConfigFields).toEqual([]);
      expect(readiness.missingCredentialFields).toEqual([]);
      expect(readiness.isReadyForAuthorizationStart).toBe(true);
      expect(readiness.isReadyForConnectionTest).toBe(false);
      expect(readiness.blockingIssues.map((issue) => issue.code)).toContain(
        "authorization_required",
      );
      expect(readiness.recommendedNextStep).toContain("OAuth authorization");
    }
  });

  it("fails with actionable readiness errors before running a connection test", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const connection = createConnection(service, {
      vendor: "salesforce",
      displayName: "salesforce blocked",
      authMode: "oauth2",
      requiredConfigFields: ["baseUrl"],
      withConfig: false,
      withCredentials: true,
    });

    await expect(
      service.testConnection(connection.organizationId, connection.id, {
        actorService: "admin-api",
        actorUserId: "user-1",
        requestId: "req-salesforce-blocked",
      }),
    ).rejects.toThrow(/Missing required connector config field "baseUrl"/);
  });

  it("fails with an actionable readiness error before dispatching syncs", async () => {
    const service = new ConnectorService(
      new InMemoryConnectorStore(),
      "s".repeat(32),
      "https://connectors.praedixa.test",
    );

    const connection = createConnection(service, {
      vendor: "olo",
      displayName: "olo not tested",
      authMode: "api_key",
      requiredConfigFields: ["baseUrl"],
      withConfig: true,
      withCredentials: true,
    });

    await expect(
      service.triggerSync(
        connection.organizationId,
        connection.id,
        {
          triggerType: "manual",
          forceFullSync: false,
          sourceWindowStart: null,
          sourceWindowEnd: null,
        },
        "sync-olo-not-tested",
        {
          actorService: "admin-api",
          actorUserId: "user-1",
          requestId: "req-olo-not-tested",
        },
      ),
    ).rejects.toThrow(/Connection has not been tested yet/);
  });
});
