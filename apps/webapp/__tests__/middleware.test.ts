import { describe, it, expect, vi } from "vitest";

const mockUpdateSession = vi.fn(() => Promise.resolve({ status: 200 }));

vi.mock("@/lib/auth/middleware", () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

import { middleware, config } from "../middleware";
import type { NextRequest } from "next/server";

describe("middleware (root)", () => {
  it("should call updateSession with the request", async () => {
    const mockRequest = {
      url: "http://localhost:3001/dashboard",
    } as NextRequest;

    const result = await middleware(mockRequest);

    expect(mockUpdateSession).toHaveBeenCalledWith(mockRequest);
    expect(result).toEqual({ status: 200 });
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
