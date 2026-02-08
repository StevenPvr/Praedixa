import { describe, it, expect, vi } from "vitest";

const mockHeaders = new Map<string, string>();
const mockResponse = {
  status: 200,
  headers: {
    set: vi.fn((key: string, value: string) => mockHeaders.set(key, value)),
    get: vi.fn((key: string) => mockHeaders.get(key)),
  },
};

const mockUpdateSession = vi.fn(() => Promise.resolve(mockResponse));

vi.mock("@/lib/auth/middleware", () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

vi.mock("@/lib/security/csp", () => ({
  generateNonce: () => "dGVzdC1ub25jZQ==",
  buildCspHeader: (nonce: string) =>
    `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
}));

import { middleware, config } from "../middleware";
import type { NextRequest } from "next/server";

describe("middleware (root)", () => {
  it("should call updateSession and set CSP header on response", async () => {
    mockHeaders.clear();
    const mockRequest = {
      url: "http://localhost:3001/dashboard",
      headers: new Headers(),
    } as unknown as NextRequest;

    const result = await middleware(mockRequest);

    expect(mockUpdateSession).toHaveBeenCalledWith(mockRequest);
    expect(result.status).toBe(200);
    expect(result.headers.set).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining("nonce-dGVzdC1ub25jZQ=="),
    );
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
