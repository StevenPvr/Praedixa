import { describe, expect, it } from "vitest";

import { decodeJwtPayload, parseBearerToken } from "../auth.js";

function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
    .toString("base64url")
    .replace(/=/g, "");
  const body = Buffer.from(JSON.stringify(payload))
    .toString("base64url")
    .replace(/=/g, "");
  return `${header}.${body}.sig`;
}

describe("parseBearerToken", () => {
  it("returns null for malformed header", () => {
    expect(parseBearerToken("Basic abc")).toBeNull();
  });

  it("extracts token for Bearer header", () => {
    expect(parseBearerToken("Bearer token-value")).toBe("token-value");
  });
});

describe("decodeJwtPayload", () => {
  it("maps claims to normalized payload", () => {
    const token = makeToken({
      sub: "user-1",
      email: "ops@praedixa.com",
      org_id: "org-1",
      role: "org_admin",
      site_ids: ["site-1"],
      permissions: ["read:alerts"],
    });

    expect(decodeJwtPayload(token)).toEqual({
      userId: "user-1",
      email: "ops@praedixa.com",
      organizationId: "org-1",
      role: "org_admin",
      siteIds: ["site-1"],
      permissions: ["read:alerts"],
    });
  });

  it("returns null when required claims are missing", () => {
    const token = makeToken({ sub: "user-1" });
    expect(decodeJwtPayload(token)).toBeNull();
  });
});
