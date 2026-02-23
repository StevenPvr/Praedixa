import { describe, it, expect, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: class MockNextResponse {
    status: number;
    headers: Headers;

    constructor(_: unknown = null, init?: { status?: number }) {
      this.status = init?.status ?? 200;
      this.headers = new Headers();
    }

    static next() {
      return new MockNextResponse(null, { status: 200 });
    }

    static redirect(url: URL, status = 307) {
      const response = new MockNextResponse(null, { status });
      response.headers.set("location", url.toString());
      return response;
    }
  },
}));

vi.mock("../lib/security/csp", () => ({
  generateNonce: () => "dGVzdC1ub25jZQ==",
  buildCspHeader: (nonce: string) =>
    `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
}));

import { proxy, config } from "../proxy.node";
import type { NextRequest } from "next/server";

function makeRequest(
  pathname: string,
  headersInit?: ConstructorParameters<typeof Headers>[0],
): NextRequest {
  const nextUrl = new URL(`http://localhost:3001${pathname}`) as URL & {
    clone: () => URL;
  };
  nextUrl.clone = () => new URL(nextUrl.toString());

  return {
    headers: new Headers(headersInit),
    nextUrl,
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

describe("landing proxy", () => {
  it("redirects root to /fr with permanent status", async () => {
    const req = makeRequest("/", { "cf-ipcountry": "US" });
    const result = await proxy(req);

    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("http://localhost:3001/fr");
  });

  it("redirects FR legacy non-localized URLs to localized target", async () => {
    const req = makeRequest("/devenir-pilote");
    const result = await proxy(req);

    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe(
      "http://localhost:3001/fr/devenir-pilote",
    );
  });

  it("redirects EN legacy non-localized URLs to localized target", async () => {
    const req = makeRequest("/pilot-application");
    const result = await proxy(req);

    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe(
      "http://localhost:3001/en/pilot-application",
    );
  });

  it("sets CSP header on locale-prefixed pages", async () => {
    const req = makeRequest("/fr");
    const result = await proxy(req);

    expect(result.status).toBe(200);
    expect(result.headers.get("Content-Security-Policy")).toContain(
      "nonce-dGVzdC1ub25jZQ==",
    );
  });

  it("exports matcher config", () => {
    expect(config.matcher).toHaveLength(1);
    expect(config.matcher[0]).toContain("_next/static");
  });
});
