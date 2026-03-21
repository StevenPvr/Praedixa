import { describe, expect, it } from "vitest";

import { loadConfig } from "../config.js";

const productionCamundaDisabled = {
  CAMUNDA_ENABLED: "false",
} as const;

describe("loadConfig", () => {
  it("accepts a hardened production configuration", () => {
    expect(
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "production",
        PORT: "8000",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        AUTH_JWKS_URL:
          "https://auth.praedixa.com/realms/praedixa/protocol/openid-connect/certs",
        CORS_ORIGINS: "https://app.praedixa.com,https://admin.praedixa.com",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL: "https://connectors.praedixa.internal",
        CONNECTORS_RUNTIME_ALLOWED_HOSTS: "praedixa.internal",
        CONNECTORS_RUNTIME_TOKEN: "token-long-enough-1234567890abcd",
      }),
    ).toMatchObject({
      nodeEnv: "production",
      corsOrigins: ["https://app.praedixa.com", "https://admin.praedixa.com"],
      connectors: {
        runtimeAllowedHosts: ["praedixa.internal"],
        runtimeToken: "token-long-enough-1234567890abcd",
      },
    });
  });

  it("parses explicit demo mode", () => {
    expect(
      loadConfig({
        NODE_ENV: "development",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        DEMO_MODE: "true",
        TRUST_PROXY: "true",
      }),
    ).toMatchObject({
      nodeEnv: "development",
      trustProxy: true,
    });
  });

  it("accepts JSON CORS origins and normalizes asyncpg database URLs", () => {
    expect(
      loadConfig({
        NODE_ENV: "development",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS:
          '["http://localhost:3001","http://127.0.0.1:3001","http://localhost:3001"]',
        DATABASE_URL:
          "postgresql+asyncpg://praedixa:praedixa_local_dev_pg_2026@localhost:5433/praedixa",
      }),
    ).toMatchObject({
      corsOrigins: ["http://localhost:3001", "http://127.0.0.1:3001"],
      databaseUrl:
        "postgresql://praedixa:praedixa_local_dev_pg_2026@localhost:5433/praedixa",
    });
  });

  it("ignores stale dev JWKS overrides that do not match the issuer host", () => {
    expect(
      loadConfig({
        NODE_ENV: "development",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        AUTH_JWKS_URL:
          "https://authprodl1b8gj6t-auth-prod.functions.fnc.fr-par.scw.cloud/realms/praedixa/protocol/openid-connect/certs",
      }),
    ).toMatchObject({
      jwt: {
        issuerUrl: "https://auth.praedixa.com/realms/praedixa",
        jwksUrl:
          "https://auth.praedixa.com/realms/praedixa/protocol/openid-connect/certs",
      },
    });
  });

  it("rejects wildcard CORS origins", () => {
    expect(() =>
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "*",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL: "https://connectors.praedixa.internal",
        CONNECTORS_RUNTIME_ALLOWED_HOSTS: "praedixa.internal",
        CONNECTORS_RUNTIME_TOKEN: "token-long-enough-1234567890abcd",
      }),
    ).toThrow(/wildcard/i);
  });

  it("rejects insecure connectors runtime URLs outside development", () => {
    expect(() =>
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL: "http://127.0.0.1:8100",
      }),
    ).toThrow(/https outside development/i);
  });

  it("requires explicit connectors runtime URLs outside development", () => {
    expect(() =>
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_ALLOWED_HOSTS: "praedixa.internal",
        CONNECTORS_RUNTIME_TOKEN: "token-long-enough-1234567890abcd",
      }),
    ).toThrow(/CONNECTORS_RUNTIME_URL is required outside development/i);
  });

  it("rejects localhost CORS origins outside development", () => {
    expect(() =>
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com,https://localhost:3000",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL: "https://connectors.praedixa.internal",
        CONNECTORS_RUNTIME_ALLOWED_HOSTS: "praedixa.internal",
        CONNECTORS_RUNTIME_TOKEN: "token-long-enough-1234567890abcd",
      }),
    ).toThrow(/localhost/i);
  });

  it("requires a database outside development", () => {
    expect(() =>
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        CONNECTORS_RUNTIME_URL: "https://connectors.praedixa.internal",
        CONNECTORS_RUNTIME_ALLOWED_HOSTS: "praedixa.internal",
        CONNECTORS_RUNTIME_TOKEN: "token-long-enough-1234567890abcd",
      }),
    ).toThrow(/DATABASE_URL is required/i);
  });

  it("rejects demo mode outside development", () => {
    expect(() =>
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "staging",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        CONNECTORS_RUNTIME_URL: "https://connectors.praedixa.internal",
        CONNECTORS_RUNTIME_ALLOWED_HOSTS: "praedixa.internal",
        CONNECTORS_RUNTIME_TOKEN: "token-long-enough-1234567890abcd",
        DEMO_MODE: "true",
      }),
    ).toThrow(/DEMO_MODE is only supported in development/i);
  });

  it("rejects connectors runtime URLs with credentials", () => {
    expect(() =>
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL:
          "https://user:pass@connectors.praedixa.internal",
        CONNECTORS_RUNTIME_ALLOWED_HOSTS: "praedixa.internal",
        CONNECTORS_RUNTIME_TOKEN: "token-long-enough-1234567890abcd",
      }),
    ).toThrow(/must not embed credentials/i);
  });

  it("rejects connectors runtime URLs with queries or fragments", () => {
    expect(() =>
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL:
          "https://connectors.praedixa.internal/runtime?debug=1#fragment",
        CONNECTORS_RUNTIME_ALLOWED_HOSTS: "praedixa.internal",
        CONNECTORS_RUNTIME_TOKEN: "token-long-enough-1234567890abcd",
      }),
    ).toThrow(/must not include query or fragment/i);
  });

  it("requires connectors runtime host allowlists outside development", () => {
    expect(() =>
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL: "https://connectors.praedixa.internal",
        CONNECTORS_RUNTIME_TOKEN: "token-long-enough-1234567890abcd",
      }),
    ).toThrow(/CONNECTORS_RUNTIME_ALLOWED_HOSTS/i);
  });

  it("rejects connectors runtime hosts that are not on the allowlist", () => {
    expect(() =>
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL: "https://runtime.evil.example",
        CONNECTORS_RUNTIME_ALLOWED_HOSTS: "praedixa.internal",
        CONNECTORS_RUNTIME_TOKEN: "token-long-enough-1234567890abcd",
      }),
    ).toThrow(/allowlist/i);
  });

  it("accepts connectors runtime subdomains that match the allowlist", () => {
    expect(
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL: "https://connectors.eu-west.praedixa.internal",
        CONNECTORS_RUNTIME_ALLOWED_HOSTS: "praedixa.internal",
        CONNECTORS_RUNTIME_TOKEN: "token-long-enough-1234567890abcd",
      }),
    ).toMatchObject({
      connectors: {
        runtimeUrl: "https://connectors.eu-west.praedixa.internal",
        runtimeAllowedHosts: ["praedixa.internal"],
      },
    });
  });

  it("requires CONNECTORS_RUNTIME_TOKEN outside development", () => {
    expect(() =>
      loadConfig({
        ...productionCamundaDisabled,
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL: "https://connectors.praedixa.internal",
        CONNECTORS_RUNTIME_ALLOWED_HOSTS: "praedixa.internal",
      }),
    ).toThrow(/CONNECTORS_RUNTIME_TOKEN is required/i);
  });

  it("rejects legacy CONNECTORS_INTERNAL_TOKEN aliases", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CONNECTORS_INTERNAL_TOKEN: "token-long-enough-1234567890abcd",
      }),
    ).toThrow(/CONNECTORS_INTERNAL_TOKEN is no longer supported/i);
  });
});
