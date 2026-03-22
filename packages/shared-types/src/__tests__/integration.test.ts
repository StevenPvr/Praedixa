import { assertType, describe, expectTypeOf, it } from "vitest";

import type {
  IntegrationAuditEvent,
  IntegrationAuthMode,
  IntegrationCatalogItem,
  IntegrationConnection,
  IntegrationConnectionStatus,
  IntegrationDomain,
  IntegrationSyncRun,
  IntegrationSyncStatus,
  IntegrationSyncTriggerType,
  IntegrationVendor,
} from "../domain/integration";
import type { TenantEntity } from "../utils/common";

describe("IntegrationVendor", () => {
  it("accepts expected vendor values", () => {
    assertType<IntegrationVendor>("custom_data");
    assertType<IntegrationVendor>("salesforce");
    assertType<IntegrationVendor>("ukg");
    assertType<IntegrationVendor>("geotab");
    assertType<IntegrationVendor>("ncr_aloha");
  });

  it("is a string subtype", () => {
    expectTypeOf<IntegrationVendor>().toBeString();
  });
});

describe("Integration unions", () => {
  it("keeps expected auth modes", () => {
    assertType<IntegrationAuthMode>("oauth2");
    assertType<IntegrationAuthMode>("api_key");
    assertType<IntegrationAuthMode>("service_account");
    assertType<IntegrationAuthMode>("sftp");
  });

  it("keeps expected domains and statuses", () => {
    assertType<IntegrationDomain>("custom");
    assertType<IntegrationDomain>("crm");
    assertType<IntegrationConnectionStatus>("active");
    assertType<IntegrationSyncStatus>("success");
    assertType<IntegrationSyncTriggerType>("manual");
  });
});

describe("Integration entities", () => {
  it("connection extends TenantEntity", () => {
    expectTypeOf<IntegrationConnection>().toMatchTypeOf<TenantEntity>();
  });

  it("sync run extends TenantEntity", () => {
    expectTypeOf<IntegrationSyncRun>().toMatchTypeOf<TenantEntity>();
  });

  it("catalog item has required fields", () => {
    expectTypeOf<IntegrationCatalogItem>().toHaveProperty("vendor");
    expectTypeOf<IntegrationCatalogItem>().toHaveProperty("authModes");
    expectTypeOf<IntegrationCatalogItem>().toHaveProperty("sourceObjects");
    expectTypeOf<IntegrationCatalogItem>().toHaveProperty("medallionTargets");
  });

  it("audit event keeps metadata object", () => {
    expectTypeOf<IntegrationAuditEvent["metadata"]>().toEqualTypeOf<
      Record<string, unknown>
    >();
  });
});
