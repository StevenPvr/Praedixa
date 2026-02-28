import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveAuthAppOrigin, userFromAccessToken } from "../oidc";

function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
    .toString("base64url")
    .replace(/=/g, "");
  const body = Buffer.from(JSON.stringify(payload))
    .toString("base64url")
    .replace(/=/g, "");
  return `${header}.${body}.sig`;
}

describe("admin OIDC role parsing", () => {
  it("accepts super-admin alias from role claim", () => {
    const token = makeToken({
      sub: "u-1",
      email: "admin@praedixa.com",
      role: "super-admin",
    });

    expect(userFromAccessToken(token, "admin-client")).toMatchObject({
      id: "u-1",
      email: "admin@praedixa.com",
      role: "super_admin",
    });
  });

  it("accepts ROLE_SUPER_ADMIN in top-level roles claim", () => {
    const token = makeToken({
      sub: "u-2",
      email: "admin@praedixa.com",
      roles: ["ROLE_SUPER_ADMIN"],
    });

    expect(userFromAccessToken(token, "admin-client")).toMatchObject({
      id: "u-2",
      email: "admin@praedixa.com",
      role: "super_admin",
    });
  });

  it("accepts /super_admin role from groups claim", () => {
    const token = makeToken({
      sub: "u-3",
      email: "admin@praedixa.com",
      groups: ["/super_admin", "/ops"],
    });

    expect(userFromAccessToken(token, "admin-client")).toMatchObject({
      id: "u-3",
      email: "admin@praedixa.com",
      role: "super_admin",
    });
  });
});

describe("admin OIDC app origin resolution", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAuthAppOrigin = process.env.AUTH_APP_ORIGIN;
  const originalNextPublicAppOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;

  beforeEach(() => {
    delete process.env.AUTH_APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_APP_ORIGIN;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAuthAppOrigin === undefined) {
      delete process.env.AUTH_APP_ORIGIN;
    } else {
      process.env.AUTH_APP_ORIGIN = originalAuthAppOrigin;
    }
    if (originalNextPublicAppOrigin === undefined) {
      delete process.env.NEXT_PUBLIC_APP_ORIGIN;
    } else {
      process.env.NEXT_PUBLIC_APP_ORIGIN = originalNextPublicAppOrigin;
    }
  });

  function makeRequest(
    origin: string,
    headers: Record<string, string | undefined> = {},
  ): Parameters<typeof resolveAuthAppOrigin>[0] {
    return {
      nextUrl: { origin },
      headers: {
        get: (name: string) => headers[name.toLowerCase()] ?? null,
      },
    } as Parameters<typeof resolveAuthAppOrigin>[0];
  }

  it("uses AUTH_APP_ORIGIN when configured", () => {
    process.env.NODE_ENV = "development";
    process.env.AUTH_APP_ORIGIN = "https://admin.praedixa.com";

    expect(
      resolveAuthAppOrigin(makeRequest("http://10.188.106.147:3002")),
    ).toBe("https://admin.praedixa.com");
  });

  it("uses forwarded host/proto when present", () => {
    process.env.NODE_ENV = "production";

    expect(
      resolveAuthAppOrigin(
        makeRequest("http://internal-admin:3002", {
          "x-forwarded-host": "admin.praedixa.com",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://admin.praedixa.com");
  });

  it("defaults to localhost origin in development", () => {
    process.env.NODE_ENV = "development";

    expect(
      resolveAuthAppOrigin(makeRequest("http://10.188.106.147:3002")),
    ).toBe("http://localhost:3002");
  });

  it("ignores forwarded host/proto in development", () => {
    process.env.NODE_ENV = "development";

    expect(
      resolveAuthAppOrigin(
        makeRequest("http://internal-admin:3002", {
          "x-forwarded-host": "10.188.106.147:3002",
          "x-forwarded-proto": "http",
        }),
      ),
    ).toBe("http://localhost:3002");
  });
});
