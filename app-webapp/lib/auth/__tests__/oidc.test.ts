import { describe, expect, it } from "vitest";

import { userFromAccessToken } from "../oidc";

function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
    .toString("base64url")
    .replace(/=/g, "");
  const body = Buffer.from(JSON.stringify(payload))
    .toString("base64url")
    .replace(/=/g, "");
  return `${header}.${body}.sig`;
}

describe("webapp OIDC role parsing", () => {
  it("prefers client-specific resource role over global super_admin realm role", () => {
    const token = makeToken({
      sub: "u-1",
      email: "client@praedixa.com",
      realm_access: {
        roles: ["super_admin"],
      },
      resource_access: {
        "web-client": {
          roles: ["org_admin"],
        },
      },
    });

    expect(userFromAccessToken(token, "web-client")).toMatchObject({
      id: "u-1",
      email: "client@praedixa.com",
      role: "org_admin",
    });
  });

  it("falls back to realm role when no client-specific resource role exists", () => {
    const token = makeToken({
      sub: "u-2",
      email: "admin@praedixa.com",
      realm_access: {
        roles: ["super_admin"],
      },
    });

    expect(userFromAccessToken(token, "web-client")).toMatchObject({
      id: "u-2",
      email: "admin@praedixa.com",
      role: "super_admin",
    });
  });
});
