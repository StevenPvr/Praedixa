import { describe, it, expect, vi } from "vitest";

const mockHeaders = new Map<string, string>();
const mockResponse = {
  status: 200,
  headers: {
    set: vi.fn((key: string, value: string) => mockHeaders.set(key, value)),
    get: vi.fn((key: string) => mockHeaders.get(key)),
  },
};

vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(() => mockResponse),
  },
}));

vi.mock("../lib/security/csp", () => ({
  generateNonce: () => "dGVzdC1ub25jZQ==",
  buildCspHeader: (nonce: string) =>
    `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
}));

import { middleware, config } from "../middleware";
import type { NextRequest } from "next/server";

describe("landing middleware", () => {
  it("sets CSP header on response", async () => {
    mockHeaders.clear();
    const req = {
      url: "http://localhost:3001",
      headers: new Headers(),
    } as unknown as NextRequest;

    const result = await middleware(req);

    expect(result.status).toBe(200);
    expect(result.headers.set).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining("nonce-dGVzdC1ub25jZQ=="),
    );
  });

  it("exports matcher config", () => {
    expect(config.matcher).toHaveLength(1);
    expect(config.matcher[0]).toContain("_next/static");
  });
});
