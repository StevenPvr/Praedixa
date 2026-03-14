/**
 * Landing CSP — tests local configuration only.
 *
 * Core CSP logic is tested in packages/ui/src/__tests__/csp.test.ts.
 * This file verifies that the landing wrapper passes NO apiUrl (no API/Supabase).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Landing CSP wrapper", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
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

  it("should have connect-src self only (no API/Supabase)", async () => {
    const { buildCspHeader } = await import("../csp");
    const csp = buildCspHeader("dGVzdA==");

    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("supabase");
    expect(csp).not.toContain("localhost:8000");
  });

  it("allows inline styles required by motion-heavy marketing sections while keeping scripts nonce-bound", async () => {
    const { buildCspHeader } = await import("../csp");
    const csp = buildCspHeader("dGVzdA==");

    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain(
      "script-src 'self' 'nonce-dGVzdA==' 'strict-dynamic'",
    );
  });
});
