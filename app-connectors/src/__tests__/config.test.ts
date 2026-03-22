import { describe, expect, it } from "vitest";

import { loadConfig } from "../config.js";

describe("connectors configuration hardening", () => {
  const developmentServiceTokens = JSON.stringify([
    {
      name: "webapp-dev",
      token: "token-long-enough-1234567890aaaa",
      allowedOrgs: ["org-1"],
      capabilities: ["connections:read"],
    },
  ]);

  const productionServiceTokens = JSON.stringify([
    {
      name: "control-plane",
      token: "token-long-enough-1234567890bbbb",
      allowedOrgs: ["org-1"],
      capabilities: ["connections:read", "connections:write"],
    },
  ]);

  it("binds development to localhost and requires explicit service tokens", () => {
    const config = loadConfig({
      NODE_ENV: "development",
      CONNECTORS_SERVICE_TOKENS: developmentServiceTokens,
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
    expect(config.allowedSandboxOutboundHosts).toEqual([]);
  });

  it("accepts JSON CORS origins from the shared local env files", () => {
    const config = loadConfig({
      NODE_ENV: "development",
      CORS_ORIGINS:
        '["http://localhost:3001","http://127.0.0.1:3001","http://localhost:3001"]',
      CONNECTORS_SERVICE_TOKENS: developmentServiceTokens,
    });

    expect(config.corsOrigins).toEqual([
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ]);
  });

  it("rejects legacy service-token env aliases", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        CONNECTORS_INTERNAL_TOKEN: "token-long-enough-1234567890aaaa",
      }),
    ).toThrow(/CONNECTORS_INTERNAL_TOKEN is no longer supported/i);
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

  it("accepts the dedicated all-org control-plane scope", () => {
    const config = loadConfig({
      NODE_ENV: "development",
      CONNECTORS_SERVICE_TOKENS: JSON.stringify([
        {
          name: "admin-control-plane",
          token: "token-long-enough-1234567890cccc",
          allowedOrgs: ["global:all-orgs"],
          capabilities: ["connections:read", "connections:write"],
        },
      ]),
    });

    expect(config.serviceTokens[0]).toEqual({
      name: "admin-control-plane",
      token: "token-long-enough-1234567890cccc",
      allowedOrgs: ["global:all-orgs"],
      capabilities: ["connections:read", "connections:write"],
    });
  });

  it("validates DATABASE_URL when persistence is enabled", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        DATABASE_URL: "https://not-postgres.example",
        CONNECTORS_SERVICE_TOKENS: developmentServiceTokens,
      }),
    ).toThrow("DATABASE_URL must use postgres:// or postgresql://");
  });

  it("normalizes asyncpg database URLs for local shared env files", () => {
    const config = loadConfig({
      NODE_ENV: "development",
      DATABASE_URL:
        "postgresql+asyncpg://praedixa:praedixa_local_dev_pg_2026@localhost:5433/praedixa",
      CONNECTORS_SERVICE_TOKENS: developmentServiceTokens,
    });

    expect(config.databaseUrl).toBe(
      "postgresql://praedixa:praedixa_local_dev_pg_2026@localhost:5433/praedixa",
    );
  });

  it("requires a database outside development", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        CONNECTORS_PUBLIC_BASE_URL: "https://connectors.praedixa.com",
        CONNECTORS_ALLOWED_OUTBOUND_HOSTS: "salesforce.com,praedixa.com",
        CONNECTORS_OBJECT_STORE_ROOT: "/var/lib/praedixa/connectors",
        CONNECTORS_SECRET_SEALING_KEY: "s".repeat(32),
        CONNECTORS_SERVICE_TOKENS: productionServiceTokens,
      }),
    ).toThrow(/DATABASE_URL is required outside development/i);
  });

  it("parses TRUST_PROXY explicitly", () => {
    expect(
      loadConfig({
        NODE_ENV: "production",
        TRUST_PROXY: "true",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_PUBLIC_BASE_URL: "https://connectors.praedixa.com",
        CONNECTORS_OBJECT_STORE_ROOT: "/var/lib/praedixa/connectors",
        CONNECTORS_ALLOWED_OUTBOUND_HOSTS: "salesforce.com,praedixa.com",
        CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS:
          "sandbox.my.salesforce.com,test.salesforce.com",
        CONNECTORS_SECRET_SEALING_KEY: "s".repeat(32),
        CONNECTORS_SERVICE_TOKENS: productionServiceTokens,
      }),
    ).toMatchObject({
      trustProxy: true,
      allowedOutboundHosts: ["salesforce.com", "praedixa.com"],
      allowedSandboxOutboundHosts: [
        "sandbox.my.salesforce.com",
        "test.salesforce.com",
      ],
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
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_PUBLIC_BASE_URL: "https://connectors.praedixa.com",
        CONNECTORS_OBJECT_STORE_ROOT: "/var/lib/praedixa/connectors",
        CONNECTORS_SECRET_SEALING_KEY: "s".repeat(32),
        CONNECTORS_SERVICE_TOKENS: productionServiceTokens,
      }),
    ).toThrow(/CONNECTORS_ALLOWED_OUTBOUND_HOSTS/i);
  });

  it("requires an explicit object store root outside development", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_PUBLIC_BASE_URL: "https://connectors.praedixa.com",
        CONNECTORS_ALLOWED_OUTBOUND_HOSTS: "salesforce.com,praedixa.com",
        CONNECTORS_SECRET_SEALING_KEY: "s".repeat(32),
        CONNECTORS_SERVICE_TOKENS: productionServiceTokens,
      }),
    ).toThrow(/CONNECTORS_OBJECT_STORE_ROOT is required outside development/i);
  });

  it("requires a sealing key outside development", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_PUBLIC_BASE_URL: "https://connectors.praedixa.com",
        CONNECTORS_OBJECT_STORE_ROOT: "/var/lib/praedixa/connectors",
        CONNECTORS_ALLOWED_OUTBOUND_HOSTS: "salesforce.com,praedixa.com",
        CONNECTORS_SERVICE_TOKENS: productionServiceTokens,
      }),
    ).toThrow(/CONNECTORS_SECRET_SEALING_KEY is required outside development/i);
  });

  it("rejects CONNECTORS_PUBLIC_BASE_URL with embedded credentials or query fragments", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_PUBLIC_BASE_URL:
          "https://user:pass@connectors.praedixa.com/runtime?debug=1",
        CONNECTORS_OBJECT_STORE_ROOT: "/var/lib/praedixa/connectors",
        CONNECTORS_ALLOWED_OUTBOUND_HOSTS: "salesforce.com,praedixa.com",
        CONNECTORS_SECRET_SEALING_KEY: "s".repeat(32),
        CONNECTORS_SERVICE_TOKENS: productionServiceTokens,
      }),
    ).toThrow(/must not embed credentials|must not include query or fragment/i);
  });
});
