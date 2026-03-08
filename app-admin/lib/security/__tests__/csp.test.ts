/**
 * Admin CSP — tests local configuration only.
 *
 * Core CSP logic is tested in packages/ui/src/__tests__/csp.test.ts.
 * This file verifies that the admin thin wrapper correctly switches between
 * same-origin proxy mode and legacy direct mode.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Admin CSP wrapper", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.praedixa.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("should re-export generateNonce from shared module", async () => {
    const { generateNonce } = await import("../csp");
    const nonce = generateNonce();
    expect(typeof nonce).toBe("string");
    expect(nonce.length).toBeGreaterThan(0);
  });

  it("should default to same-origin connect-src in proxy mode", async () => {
    const { buildCspHeader } = await import("../csp");
    const csp = buildCspHeader("dGVzdA==");

    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("https://api.praedixa.com");
  });

  it("should include NEXT_PUBLIC_API_URL in direct mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_API_MODE", "direct");
    vi.resetModules();

    const { buildCspHeader } = await import("../csp");
    const csp = buildCspHeader("dGVzdA==");

    expect(csp).toContain("connect-src 'self' https://api.praedixa.com");
  });
});
