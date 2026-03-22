import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getTrustedOidcEndpoints } from "../oidc-discovery";

describe("shared OIDC discovery", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("surfaces discovery status and payload details when the issuer rejects discovery", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Realm does not exist" }), {
          status: 404,
          statusText: "Not Found",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ),
    );

    await expect(
      getTrustedOidcEndpoints("https://auth.praedixa.com/realms/praedixa"),
    ).rejects.toThrow(
      /OIDC discovery request failed \(404 Not Found: Realm does not exist\)/,
    );
  });

  it("accepts localhost http discovery origins outside production", async () => {
    process.env.NODE_ENV = "test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            issuer: "http://localhost:8081/realms/praedixa",
            authorization_endpoint:
              "http://localhost:8081/realms/praedixa/protocol/openid-connect/auth",
            token_endpoint:
              "http://localhost:8081/realms/praedixa/protocol/openid-connect/token",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      ),
    );

    await expect(
      getTrustedOidcEndpoints("http://localhost:8081/realms/praedixa"),
    ).resolves.toMatchObject({
      authorizationEndpoint:
        "http://localhost:8081/realms/praedixa/protocol/openid-connect/auth",
      tokenEndpoint:
        "http://localhost:8081/realms/praedixa/protocol/openid-connect/token",
    });
  });

  it("rejects revocation endpoints that drift to another origin", async () => {
    process.env.NODE_ENV = "test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            issuer: "https://auth.praedixa.com/realms/praedixa",
            authorization_endpoint:
              "https://auth.praedixa.com/realms/praedixa/protocol/openid-connect/auth",
            token_endpoint:
              "https://auth.praedixa.com/realms/praedixa/protocol/openid-connect/token",
            revocation_endpoint:
              "https://evil.example/protocol/openid-connect/revoke",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      ),
    );

    await expect(
      getTrustedOidcEndpoints("https://auth.praedixa.com/realms/praedixa"),
    ).rejects.toThrow(/OIDC endpoints must share issuer origin/);
  });
});
