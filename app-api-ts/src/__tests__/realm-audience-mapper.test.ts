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

function readRealmExport(): RealmExport {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const realmPath = path.resolve(currentDir, "../../../infra/auth/realm-praedixa.json");
  const raw = readFileSync(realmPath, "utf8");
  return JSON.parse(raw) as RealmExport;
}

function getClientById(realm: RealmExport, clientId: string): RealmClient {
  const client = realm.clients?.find((entry) => entry.clientId === clientId);
  if (!client) {
    throw new Error(`Client not found in realm export: ${clientId}`);
  }
  return client;
}

describe("infra/auth/realm-praedixa audience mapping", () => {
  it("adds praedixa-api audience mapper for webapp and admin clients", () => {
    const realm = readRealmExport();

    for (const clientId of ["praedixa-webapp", "praedixa-admin"]) {
      const client = getClientById(realm, clientId);
      const mapper = client.protocolMappers?.find(
        (entry) => entry.name === "audience-praedixa-api",
      );

      expect(mapper, `Missing mapper for ${clientId}`).toBeDefined();
      expect(mapper?.protocolMapper).toBe("oidc-audience-mapper");
      expect(mapper?.config?.["included.client.audience"]).toBe("praedixa-api");
      expect(mapper?.config?.["access.token.claim"]).toBe("true");
      expect(mapper?.config?.["id.token.claim"]).toBe("false");
    }
  });
});
