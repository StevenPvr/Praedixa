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

import { middleware, config } from "../middleware";
import type { NextRequest } from "next/server";

function makeRequest(pathname: string): NextRequest {
  const nextUrl = new URL(`http://localhost:3001${pathname}`) as URL & {
    clone: () => URL;
  };
  nextUrl.clone = () => new URL(nextUrl.toString());

  return {
    headers: new Headers(),
    nextUrl,
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

describe("landing middleware", () => {
  it("redirects root to /fr with 301", async () => {
    const req = makeRequest("/");
    const result = await middleware(req);

    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("http://localhost:3001/fr");
  });

  it("returns 410 for legacy non-localized URLs", async () => {
    const req = makeRequest("/devenir-pilote");
    const result = await middleware(req);

    expect(result.status).toBe(410);
  });

  it("sets CSP header on locale-prefixed pages", async () => {
    const req = makeRequest("/fr");
    const result = await middleware(req);

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
