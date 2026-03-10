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
          capabilities: ["connections:read"],
        },
      ]),
    });

    expect(config.host).toBe("127.0.0.1");
    expect(config.trustProxy).toBe(false);
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
      capabilities: ["connections:read"],
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
            capabilities: ["connections:read"],
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
            capabilities: ["connections:read"],
          },
        ]),
      }),
    ).toThrow("DATABASE_URL must use postgres:// or postgresql://");
  });

  it("parses TRUST_PROXY explicitly", () => {
    expect(
      loadConfig({
        NODE_ENV: "production",
        TRUST_PROXY: "true",
        CONNECTORS_PUBLIC_BASE_URL: "https://connectors.praedixa.com",
        CONNECTORS_ALLOWED_OUTBOUND_HOSTS: "salesforce.com,praedixa.com",
        CONNECTORS_SERVICE_TOKENS: JSON.stringify([
          {
            name: "control-plane",
            token: "token-long-enough-1234567890bbbb",
            allowedOrgs: ["org-1"],
            capabilities: ["connections:read", "connections:write"],
          },
        ]),
      }),
    ).toMatchObject({
      trustProxy: true,
      allowedOutboundHosts: ["salesforce.com", "praedixa.com"],
    });
  });

  it("requires service token capabilities", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        CONNECTORS_SERVICE_TOKENS: JSON.stringify([
          {
            name: "webapp-dev",
            token: "token-long-enough-1234567890aaaa",
            allowedOrgs: ["org-1"],
          },
        ]),
      }),
    ).toThrow(/capabilities/i);
  });

  it("requires outbound host allowlists outside development", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        CONNECTORS_PUBLIC_BASE_URL: "https://connectors.praedixa.com",
        CONNECTORS_SERVICE_TOKENS: JSON.stringify([
          {
            name: "control-plane",
            token: "token-long-enough-1234567890bbbb",
            allowedOrgs: ["org-1"],
            capabilities: ["connections:read"],
          },
        ]),
      }),
    ).toThrow(/CONNECTORS_ALLOWED_OUTBOUND_HOSTS/i);
  });
});
