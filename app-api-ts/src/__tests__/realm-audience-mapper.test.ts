import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

interface RealmProtocolMapper {
  name?: string;
  protocolMapper?: string;
  config?: Record<string, string>;
}

interface RealmClient {
  clientId?: string;
  protocolMappers?: RealmProtocolMapper[];
}

interface RealmExport {
  clients?: RealmClient[];
}

interface UserProfileAttribute {
  name?: string;
  permissions?: {
    view?: string[];
    edit?: string[];
  };
  multivalued?: boolean;
}

interface UserProfileContract {
  attributes?: UserProfileAttribute[];
}

function readRealmExport(): RealmExport {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const realmPath = path.resolve(currentDir, "../../../infra/auth/realm-praedixa.json");
  const raw = readFileSync(realmPath, "utf8");
  return JSON.parse(raw) as RealmExport;
}

function readUserProfileContract(): UserProfileContract {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const contractPath = path.resolve(
    currentDir,
    "../../../infra/auth/user-profile-praedixa.json",
  );
  const raw = readFileSync(contractPath, "utf8");
  return JSON.parse(raw) as UserProfileContract;
}

function getClientById(realm: RealmExport, clientId: string): RealmClient {
  const client = realm.clients?.find((entry) => entry.clientId === clientId);
  if (!client) {
    throw new Error(`Client not found in realm export: ${clientId}`);
  }
  return client;
}

function getUserProfileAttribute(
  contract: UserProfileContract,
  attributeName: string,
): UserProfileAttribute {
  const attribute = contract.attributes?.find((entry) => entry.name === attributeName);
  if (!attribute) {
    throw new Error(`User profile attribute not found in contract: ${attributeName}`);
  }
  return attribute;
}

describe("infra/auth/realm-praedixa audience mapping", () => {
  it("adds access-token audience and tenant claim mappers for webapp and admin clients", () => {
    const realm = readRealmExport();

    for (const clientId of ["praedixa-webapp", "praedixa-admin"]) {
      const client = getClientById(realm, clientId);
      const audienceMapper = client.protocolMappers?.find(
        (entry) => entry.name === "audience-praedixa-api",
      );
      const organizationMapper = client.protocolMappers?.find(
        (entry) => entry.name === "claim-organization-id",
      );
      const siteMapper = client.protocolMappers?.find(
        (entry) => entry.name === "claim-site-id",
      );

      expect(audienceMapper, `Missing audience mapper for ${clientId}`).toBeDefined();
      expect(audienceMapper?.protocolMapper).toBe("oidc-audience-mapper");
      expect(audienceMapper?.config?.["included.client.audience"]).toBe("praedixa-api");
      expect(audienceMapper?.config?.["access.token.claim"]).toBe("true");
      expect(audienceMapper?.config?.["id.token.claim"]).toBe("false");

      expect(organizationMapper, `Missing organization mapper for ${clientId}`).toBeDefined();
      expect(organizationMapper?.protocolMapper).toBe("oidc-usermodel-attribute-mapper");
      expect(organizationMapper?.config?.["user.attribute"]).toBe("organization_id");
      expect(organizationMapper?.config?.["claim.name"]).toBe("organization_id");
      expect(organizationMapper?.config?.["access.token.claim"]).toBe("true");
      expect(organizationMapper?.config?.["id.token.claim"]).toBe("false");

      expect(siteMapper, `Missing site mapper for ${clientId}`).toBeDefined();
      expect(siteMapper?.protocolMapper).toBe("oidc-usermodel-attribute-mapper");
      expect(siteMapper?.config?.["user.attribute"]).toBe("site_id");
      expect(siteMapper?.config?.["claim.name"]).toBe("site_id");
      expect(siteMapper?.config?.["access.token.claim"]).toBe("true");
      expect(siteMapper?.config?.["id.token.claim"]).toBe("false");
    }
  });

  it("declares tenant attributes in the Keycloak user profile contract", () => {
    const contract = readUserProfileContract();
    const organizationAttribute = getUserProfileAttribute(contract, "organization_id");
    const siteAttribute = getUserProfileAttribute(contract, "site_id");

    expect(organizationAttribute.permissions?.view).toEqual(["admin"]);
    expect(organizationAttribute.permissions?.edit).toEqual(["admin"]);
    expect(organizationAttribute.multivalued).toBe(false);

    expect(siteAttribute.permissions?.view).toEqual(["admin"]);
    expect(siteAttribute.permissions?.edit).toEqual(["admin"]);
    expect(siteAttribute.multivalued).toBe(false);
  });
});
