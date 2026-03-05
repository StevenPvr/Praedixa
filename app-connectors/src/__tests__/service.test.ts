import { describe, expect, it } from "vitest";

import { createDefaultConnectorService } from "../service.js";

describe("connector service skeleton", () => {
  it("exposes a catalog covering planned priority connectors", () => {
    const service = createDefaultConnectorService();
    const catalog = service.listCatalog();

    expect(catalog.length).toBeGreaterThanOrEqual(13);
    expect(catalog.some((entry) => entry.vendor === "salesforce")).toBe(true);
    expect(catalog.some((entry) => entry.vendor === "geotab")).toBe(true);
    expect(catalog.some((entry) => entry.vendor === "ncr_aloha")).toBe(true);
  });

  it("creates, tests and syncs a connection", async () => {
    const service = createDefaultConnectorService();
    const organizationId = "org-1";

    const connection = service.createConnection(organizationId, {
      vendor: "salesforce",
      displayName: "Salesforce Production",
      authMode: "oauth2",
      secretRef: "scw://secrets/salesforce-org-1",
      config: { instanceUrl: "https://example.my.salesforce.com" },
    });

    expect(connection.organizationId).toBe(organizationId);

    const testResult = await service.testConnection(organizationId, connection.id);
    expect(testResult.ok).toBe(true);
    expect(testResult.checkedScopes.length).toBeGreaterThan(0);

    const run = await service.triggerSync(organizationId, connection.id, "manual");
    expect(run.status).toBe("success");
    expect(run.recordsFetched).toBeGreaterThan(0);
    expect(run.recordsWritten).toBeGreaterThan(0);

    const listedRuns = service.listSyncRuns(organizationId, connection.id);
    expect(listedRuns.length).toBe(1);
    expect(listedRuns[0]?.id).toBe(run.id);
  });
});
