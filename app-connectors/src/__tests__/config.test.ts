import { describe, expect, it } from "vitest";

import { loadConfig } from "../config.js";

describe("connectors configuration hardening", () => {
  it("binds development to localhost and requires explicit service tokens", () => {
    const config = loadConfig({
      NODE_ENV: "development",
      CONNECTORS_SERVICE_TOKENS: JSON.stringify([
        {
          name: "webapp-dev",
          token: "token-long-enough-1234567890aaaa",
          allowedOrgs: ["org-1"],
        },
      ]),
    });

    expect(config.host).toBe("127.0.0.1");
    expect(config.corsOrigins).toEqual([
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:8000",
    ]);
    expect(config.serviceTokens[0]).toEqual({
      name: "webapp-dev",
      token: "token-long-enough-1234567890aaaa",
      allowedOrgs: ["org-1"],
    });
  });

  it("rejects legacy token configuration without org scoping", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        CONNECTORS_INTERNAL_TOKEN: "token-long-enough-1234567890aaaa",
      }),
    ).toThrow("CONNECTORS_ALLOWED_ORGS is required");
  });

  it("rejects wildcard org scopes inside service token configuration", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        CONNECTORS_SERVICE_TOKENS: JSON.stringify([
          {
            name: "control-plane",
            token: "token-long-enough-1234567890bbbb",
            allowedOrgs: ["*"],
          },
        ]),
      }),
    ).toThrow('Invalid organization scope "*"');
  });

  it("validates DATABASE_URL when persistence is enabled", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        DATABASE_URL: "https://not-postgres.example",
        CONNECTORS_SERVICE_TOKENS: JSON.stringify([
          {
            name: "webapp-dev",
            token: "token-long-enough-1234567890aaaa",
            allowedOrgs: ["org-1"],
          },
        ]),
      }),
    ).toThrow("DATABASE_URL must use postgres:// or postgresql://");
  });
});
