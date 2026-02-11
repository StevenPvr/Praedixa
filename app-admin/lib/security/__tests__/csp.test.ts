/**
 * Admin CSP — tests local configuration only.
 *
 * Core CSP logic is tested in packages/ui/src/__tests__/csp.test.ts.
 * This file verifies that the admin thin wrapper correctly passes apiUrl.
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

  it("should pass NEXT_PUBLIC_API_URL to buildCspHeaderBase", async () => {
    const { buildCspHeader } = await import("../csp");
    const csp = buildCspHeader("dGVzdA==");

    expect(csp).toContain(
      "connect-src 'self' https://api.praedixa.com https://*.supabase.co",
    );
  });

  it("should fallback to localhost API URL when env is not set", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();

    const { buildCspHeader } = await import("../csp");
    const csp = buildCspHeader("dGVzdA==");

    expect(csp).toContain(
      "connect-src 'self' http://localhost:8000 https://*.supabase.co",
    );
  });
});
