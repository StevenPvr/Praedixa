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
  const realmPath = path.resolve(
    currentDir,
    "../../../infra/auth/realm-praedixa.json",
  );
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
  const attribute = contract.attributes?.find(
    (entry) => entry.name === attributeName,
  );
  if (!attribute) {
    throw new Error(
      `User profile attribute not found in contract: ${attributeName}`,
    );
  }
  return attribute;
}

function getMapper(
  client: RealmClient,
  mapperName: string,
  clientId: string,
): RealmProtocolMapper {
  const mapper = client.protocolMappers?.find(
    (entry) => entry.name === mapperName,
  );
  if (!mapper) {
    throw new Error(`Missing mapper ${mapperName} for ${clientId}`);
  }
  return mapper;
}

describe("infra/auth/realm-praedixa canonical access-token mapping", () => {
  it("adds canonical audience, role, organization_id, and site_id claims for webapp and admin clients", () => {
    const realm = readRealmExport();

    for (const clientId of ["praedixa-webapp", "praedixa-admin"]) {
      const client = getClientById(realm, clientId);
      const audienceMapper = getMapper(
        client,
        "audience-praedixa-api",
        clientId,
      );
      const roleMapper = getMapper(client, "claim-role", clientId);
      const organizationMapper = getMapper(
        client,
        "claim-organization-id",
        clientId,
      );
      const siteMapper = getMapper(client, "claim-site-id", clientId);

      expect(audienceMapper.protocolMapper).toBe("oidc-audience-mapper");
      expect(audienceMapper.config?.["included.client.audience"]).toBe(
        "praedixa-api",
      );
      expect(audienceMapper.config?.["access.token.claim"]).toBe("true");
      expect(audienceMapper.config?.["id.token.claim"]).toBe("false");

      expect(roleMapper.protocolMapper).toBe("oidc-usermodel-attribute-mapper");
      expect(roleMapper.config?.["user.attribute"]).toBe("role");
      expect(roleMapper.config?.["claim.name"]).toBe("role");
      expect(roleMapper.config?.["access.token.claim"]).toBe("true");
      expect(roleMapper.config?.["id.token.claim"]).toBe("false");

      expect(organizationMapper.protocolMapper).toBe(
        "oidc-usermodel-attribute-mapper",
      );
      expect(organizationMapper.config?.["user.attribute"]).toBe(
        "organization_id",
      );
      expect(organizationMapper.config?.["claim.name"]).toBe("organization_id");
      expect(organizationMapper.config?.["access.token.claim"]).toBe("true");
      expect(organizationMapper.config?.["id.token.claim"]).toBe("false");

      expect(siteMapper.protocolMapper).toBe("oidc-usermodel-attribute-mapper");
      expect(siteMapper.config?.["user.attribute"]).toBe("site_id");
      expect(siteMapper.config?.["claim.name"]).toBe("site_id");
      expect(siteMapper.config?.["access.token.claim"]).toBe("true");
      expect(siteMapper.config?.["id.token.claim"]).toBe("false");
    }
  });

  it("adds explicit admin permissions only on the admin client", () => {
    const realm = readRealmExport();
    const adminClient = getClientById(realm, "praedixa-admin");
    const webappClient = getClientById(realm, "praedixa-webapp");
    const permissionsMapper = getMapper(
      adminClient,
      "claim-permissions",
      "praedixa-admin",
    );

    expect(permissionsMapper.protocolMapper).toBe(
      "oidc-usermodel-attribute-mapper",
    );
    expect(permissionsMapper.config?.["user.attribute"]).toBe("permissions");
    expect(permissionsMapper.config?.["claim.name"]).toBe("permissions");
    expect(permissionsMapper.config?.multivalued).toBe("true");
    expect(permissionsMapper.config?.["access.token.claim"]).toBe("true");
    expect(permissionsMapper.config?.["id.token.claim"]).toBe("false");

    expect(
      webappClient.protocolMappers?.find(
        (entry) => entry.name === "claim-permissions",
      ),
    ).toBeUndefined();
  });

  it("declares canonical token attributes in the Keycloak user profile contract", () => {
    const contract = readUserProfileContract();
    const roleAttribute = getUserProfileAttribute(contract, "role");
    const organizationAttribute = getUserProfileAttribute(
      contract,
      "organization_id",
    );
    const siteAttribute = getUserProfileAttribute(contract, "site_id");
    const permissionsAttribute = getUserProfileAttribute(
      contract,
      "permissions",
    );

    expect(roleAttribute.permissions?.view).toEqual(["admin"]);
    expect(roleAttribute.permissions?.edit).toEqual(["admin"]);
    expect(roleAttribute.multivalued).toBe(false);

    expect(organizationAttribute.permissions?.view).toEqual(["admin"]);
    expect(organizationAttribute.permissions?.edit).toEqual(["admin"]);
    expect(organizationAttribute.multivalued).toBe(false);

    expect(siteAttribute.permissions?.view).toEqual(["admin"]);
    expect(siteAttribute.permissions?.edit).toEqual(["admin"]);
    expect(siteAttribute.multivalued).toBe(false);

    expect(permissionsAttribute.permissions?.view).toEqual(["admin"]);
    expect(permissionsAttribute.permissions?.edit).toEqual(["admin"]);
    expect(permissionsAttribute.multivalued).toBe(true);
  });
});
