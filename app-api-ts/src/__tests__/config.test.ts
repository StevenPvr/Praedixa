import { describe, expect, it } from "vitest";

import { loadConfig } from "../config.js";

describe("loadConfig", () => {
  it("accepts a hardened production configuration", () => {
    expect(
      loadConfig({
        NODE_ENV: "production",
        PORT: "8000",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        AUTH_JWKS_URL:
          "https://auth.praedixa.com/realms/praedixa/protocol/openid-connect/certs",
        CORS_ORIGINS: "https://app.praedixa.com,https://admin.praedixa.com",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL: "https://connectors.praedixa.internal",
      }),
    ).toMatchObject({
      nodeEnv: "production",
      corsOrigins: [
        "https://app.praedixa.com",
        "https://admin.praedixa.com",
      ],
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
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "*",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL: "https://connectors.praedixa.internal",
      }),
    ).toThrow(/wildcard/i);
  });

  it("rejects insecure connectors runtime URLs outside development", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL: "http://127.0.0.1:8100",
      }),
    ).toThrow(/https outside development/i);
  });

  it("rejects localhost CORS origins outside development", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com,https://localhost:3000",
        DATABASE_URL: "postgresql://praedixa:secret@db.internal:5432/praedixa",
        CONNECTORS_RUNTIME_URL: "https://connectors.praedixa.internal",
      }),
    ).toThrow(/localhost/i);
  });

  it("requires a database outside development when demo mode is disabled", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        CONNECTORS_RUNTIME_URL: "https://connectors.praedixa.internal",
      }),
    ).toThrow(/DATABASE_URL is required/i);
  });

  it("still allows explicit demo mode outside development without a database", () => {
    expect(
      loadConfig({
        NODE_ENV: "staging",
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
        AUTH_AUDIENCE: "praedixa-api",
        CORS_ORIGINS: "https://app.praedixa.com",
        CONNECTORS_RUNTIME_URL: "https://connectors.praedixa.internal",
        DEMO_MODE: "true",
      }),
    ).toMatchObject({
      nodeEnv: "staging",
      databaseUrl: null,
    });
  });
});
