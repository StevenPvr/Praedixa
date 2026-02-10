/**
 * Security gap analysis — CSP header hardening tests.
 *
 * Tests that the Content-Security-Policy header produced by buildCspHeader:
 * 1. NEVER includes 'unsafe-inline' in script-src in production.
 * 2. Includes 'strict-dynamic' to propagate trust from nonced scripts.
 * 3. Blocks object-src, frame-ancestors (clickjacking), base-uri hijacking.
 * 4. Nonce is cryptographically random and unique per call.
 * 5. Development mode relaxations do NOT leak into production.
 * 6. connect-src does not allow wildcard origins.
 *
 * OWASP: A03:2021 — Injection (XSS via CSP bypass)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("CSP Security Hardening", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── 1. Production CSP strictness ─────────────────────────────

  describe("production mode CSP strictness", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.praedixa.com");
    });

    it("should NOT include unsafe-inline in script-src in production", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("test-nonce-abc");

      // Extract script-src directive
      const scriptSrc = csp
        .split(";")
        .find((d) => d.trim().startsWith("script-src"));
      expect(scriptSrc).toBeDefined();
      expect(scriptSrc).not.toContain("'unsafe-inline'");
    });

    it("should NOT include unsafe-eval in production", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("test-nonce");

      expect(csp).not.toContain("'unsafe-eval'");
    });

    it("should include strict-dynamic in script-src", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("test-nonce");

      expect(csp).toContain("'strict-dynamic'");
    });

    it("should block clickjacking with frame-ancestors 'none'", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("test-nonce");

      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("should prevent base-uri hijacking", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("test-nonce");

      expect(csp).toContain("base-uri 'self'");
    });

    it("should restrict form-action to self", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("test-nonce");

      expect(csp).toContain("form-action 'self'");
    });

    it("should block object-src entirely", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("test-nonce");

      expect(csp).toContain("object-src 'none'");
    });

    it("should include upgrade-insecure-requests in production", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("test-nonce");

      expect(csp).toContain("upgrade-insecure-requests");
    });

    it("should NOT include wildcard * in connect-src", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("test-nonce");

      const connectSrc = csp
        .split(";")
        .find((d) => d.trim().startsWith("connect-src"));
      expect(connectSrc).toBeDefined();
      // No bare wildcard (but *.supabase.co is acceptable — it's a specific subdomain wildcard)
      expect(connectSrc).not.toMatch(/\s\*(\s|$)/);
    });

    it("should scope connect-src to known API origins only", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("test-nonce");

      const connectSrc = csp
        .split(";")
        .find((d) => d.trim().startsWith("connect-src"));
      expect(connectSrc).toContain("'self'");
      expect(connectSrc).toContain("https://api.praedixa.com");
      expect(connectSrc).toContain("https://*.supabase.co");
    });
  });

  // ── 2. Nonce cryptographic properties ────────────────────────

  describe("nonce cryptographic properties", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.praedixa.com");
    });

    it("should produce base64-encoded nonces", async () => {
      const { generateNonce } = await import("../csp");
      const nonce = generateNonce();

      expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it("should generate unique nonces (no reuse across requests)", async () => {
      const { generateNonce } = await import("../csp");
      const nonces = new Set(
        Array.from({ length: 100 }, () => generateNonce()),
      );

      // All 100 nonces should be unique
      expect(nonces.size).toBe(100);
    });

    it("nonce should be embedded in CSP script-src correctly", async () => {
      const { buildCspHeader } = await import("../csp");
      const nonce = "dGVzdC1ub25jZQ==";
      const csp = buildCspHeader(nonce);

      expect(csp).toContain(`'nonce-${nonce}'`);
    });

    it("nonce with special characters should be embedded safely", async () => {
      const { buildCspHeader } = await import("../csp");
      // Base64 output can contain +, /, and = characters
      const nonce = "a+b/c=d==";
      const csp = buildCspHeader(nonce);

      expect(csp).toContain(`'nonce-a+b/c=d=='`);
    });
  });

  // ── 3. Development mode relaxations ──────────────────────────

  describe("development mode relaxations are scoped", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    });

    it("should include unsafe-eval in development (for HMR)", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("dev-nonce");

      expect(csp).toContain("'unsafe-eval'");
    });

    it("should include unsafe-inline in style-src in development", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("dev-nonce");

      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    it("should NOT include upgrade-insecure-requests in development", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("dev-nonce");

      expect(csp).not.toContain("upgrade-insecure-requests");
    });

    it("should still include security directives even in development", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("dev-nonce");

      // These should ALWAYS be present regardless of env
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    });
  });

  // ── 4. CSP directive completeness ────────────────────────────

  describe("CSP directive completeness", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.praedixa.com");
    });

    it("should include all critical security directives", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("test-nonce");

      const directives = csp.split(";").map((d) => d.trim().split(/\s+/)[0]);

      expect(directives).toContain("default-src");
      expect(directives).toContain("script-src");
      expect(directives).toContain("style-src");
      expect(directives).toContain("img-src");
      expect(directives).toContain("font-src");
      expect(directives).toContain("connect-src");
      expect(directives).toContain("frame-ancestors");
      expect(directives).toContain("base-uri");
      expect(directives).toContain("form-action");
      expect(directives).toContain("object-src");
    });

    it("default-src should be self (deny by default)", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("test-nonce");

      expect(csp).toContain("default-src 'self'");
    });
  });
});
