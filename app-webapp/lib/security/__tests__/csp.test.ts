/**
 * Webapp CSP — tests local configuration only.
 *
 * Core CSP logic is tested in packages/ui/src/__tests__/csp.test.ts.
 * This file verifies that the webapp thin wrapper correctly passes apiUrl.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Webapp CSP wrapper", () => {
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

  it("should include NEXT_PUBLIC_API_URL in connect-src", async () => {
    const { buildCspHeader } = await import("../csp");
    const csp = buildCspHeader("dGVzdA==");

    expect(csp).toContain("connect-src 'self' https://api.praedixa.com");
  });

  it("should fallback to localhost API URL when env is not set", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();

    const { buildCspHeader } = await import("../csp");
    const csp = buildCspHeader("dGVzdA==");

    expect(csp).toContain("connect-src 'self' http://localhost:8000");
  });

  it("should include CSP reporting directives when configured", async () => {
    vi.stubEnv("CSP_REPORT_URI", "/api/security/csp-report");
    vi.stubEnv("CSP_REPORT_TO_URL", "https://reports.praedixa.com/csp");
    vi.resetModules();

    const { buildCspHeader, buildReportToHeader, CSP_REPORT_TO_GROUP } =
      await import("../csp");
    const csp = buildCspHeader("dGVzdA==");
    const reportTo = buildReportToHeader();

    expect(csp).toContain("report-uri /api/security/csp-report");
    expect(csp).toContain(`report-to ${CSP_REPORT_TO_GROUP}`);
    expect(reportTo).not.toBeNull();

    const parsed = JSON.parse(reportTo as string) as {
      group: string;
      endpoints: Array<{ url: string }>;
    };
    expect(parsed.group).toBe(CSP_REPORT_TO_GROUP);
    expect(parsed.endpoints[0]?.url).toBe("https://reports.praedixa.com/csp");
  });

  it("should ignore invalid CSP reporting values", async () => {
    vi.stubEnv("CSP_REPORT_URI", "javascript:alert(1)");
    vi.stubEnv("CSP_REPORT_TO_URL", "http://evil.example/csp");
    vi.resetModules();

    const { buildCspHeader, buildReportToHeader } = await import("../csp");
    const csp = buildCspHeader("dGVzdA==");

    expect(csp).not.toContain("report-uri");
    expect(csp).not.toContain("report-to");
    expect(buildReportToHeader()).toBeNull();
  });
});
