import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("CSP module", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.praedixa.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe("generateNonce", () => {
    it("should return a base64-encoded string", async () => {
      const { generateNonce } = await import("../csp");
      const nonce = generateNonce();

      expect(typeof nonce).toBe("string");
      expect(nonce.length).toBeGreaterThan(0);
      // Base64 characters only
      expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it("should generate unique nonces on each call", async () => {
      const { generateNonce } = await import("../csp");
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe("buildCspHeader", () => {
    it("should include nonce in script-src and style-src in production", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("dGVzdA==");

      expect(csp).toContain("'nonce-dGVzdA=='");
      expect(csp).toContain(
        "script-src 'self' 'nonce-dGVzdA==' 'strict-dynamic'",
      );
      expect(csp).toContain("style-src 'self' 'nonce-dGVzdA=='");
      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it("should include upgrade-insecure-requests in production", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("dGVzdA==");

      expect(csp).toContain("upgrade-insecure-requests");
    });

    it("should include API URL and Supabase in connect-src", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("dGVzdA==");

      expect(csp).toContain(
        "connect-src 'self' https://api.praedixa.com https://*.supabase.co",
      );
    });

    it("should include strict security directives", async () => {
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("dGVzdA==");

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("object-src 'none'");
    });

    it("should include unsafe-eval and unsafe-inline in development", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.resetModules();
      const { buildCspHeader } = await import("../csp");
      const csp = buildCspHeader("dGVzdA==");

      expect(csp).toContain("'unsafe-eval'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).not.toContain("upgrade-insecure-requests");
    });
  });
});
