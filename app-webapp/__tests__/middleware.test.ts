import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

const mockHeaders = new Map<string, string>();
const mockResponse = {
  status: 200,
  headers: {
    set: vi.fn((key: string, value: string) => mockHeaders.set(key, value)),
    get: vi.fn((key: string) => mockHeaders.get(key)),
  },
};

const mockUpdateSession = vi.fn((_request?: NextRequest, _headers?: Headers) =>
  Promise.resolve(mockResponse),
);

vi.mock("@/lib/auth/middleware", () => ({
  updateSession: (request: NextRequest, headers?: Headers) =>
    mockUpdateSession(request, headers),
}));

vi.mock("@/lib/security/csp", () => ({
  generateNonce: () => "dGVzdC1ub25jZQ==",
  buildCspHeader: (nonce: string) =>
    `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
  buildReportToHeader: () => null,
}));

import { proxy, config } from "../proxy";

describe("proxy (root)", () => {
  const envBackup = process.env.NODE_ENV;

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", envBackup);
  });

  it("should process /coverage-harness like any protected route", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { proxy: mw } = await import("../proxy");

    const mockRequest = {
      nextUrl: { pathname: "/coverage-harness" },
      url: "http://localhost:3001/coverage-harness",
      headers: new Headers(),
    } as unknown as NextRequest;

    const result = await mw(mockRequest);

    expect(result.status).toBe(200);
    expect(mockUpdateSession).toHaveBeenCalledWith(
      mockRequest,
      expect.any(Headers),
    );
  });

  it("should call updateSession and set CSP header on response", async () => {
    mockHeaders.clear();
    const mockRequest = {
      url: "http://localhost:3001/dashboard",
      headers: new Headers(),
    } as unknown as NextRequest;

    const result = await proxy(mockRequest);

    expect(mockUpdateSession).toHaveBeenCalledWith(
      mockRequest,
      expect.any(Headers),
    );
    expect(result.status).toBe(200);
    expect(result.headers.set).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining("nonce-dGVzdC1ub25jZQ=="),
    );
    const forwardedHeaders = mockUpdateSession.mock.calls.at(-1)?.[1] as
      | Headers
      | undefined;
    expect(forwardedHeaders?.get("x-nonce")).toBe("dGVzdC1ub25jZQ==");
  });

  it("should export a matcher config that excludes static assets", () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(config.matcher).toHaveLength(1);

    // The matcher pattern should exclude common static asset extensions
    const pattern = config.matcher[0];
    expect(pattern).toContain("_next/static");
    expect(pattern).toContain("_next/image");
    expect(pattern).toContain("favicon.ico");
    expect(pattern).toContain("svg");
    expect(pattern).toContain("png");
  });
});
