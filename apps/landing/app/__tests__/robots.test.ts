import { describe, it, expect } from "vitest";
import robots from "../robots";

describe("robots()", () => {
  const result = robots();

  it("should return a rules array", () => {
    expect(Array.isArray(result.rules)).toBe(true);
  });

  it("should include a wildcard rule allowing /", () => {
    const wildcardRule = (
      result.rules as Array<{ userAgent: string; allow: string }>
    ).find((r) => r.userAgent === "*");
    expect(wildcardRule).toBeDefined();
    expect(wildcardRule!.allow).toBe("/");
  });

  it("should disallow /api/ and /_next/ for the wildcard agent", () => {
    const wildcardRule = (
      result.rules as Array<{ userAgent: string; disallow: string[] }>
    ).find((r) => r.userAgent === "*");
    expect(wildcardRule!.disallow).toContain("/api/");
    expect(wildcardRule!.disallow).toContain("/_next/");
  });

  it("should include a rule for AdsBot-Google", () => {
    const rule = (result.rules as Array<{ userAgent: string }>).find(
      (r) => r.userAgent === "AdsBot-Google",
    );
    expect(rule).toBeDefined();
  });

  it("should include a rule for Googlebot-Image", () => {
    const rule = (result.rules as Array<{ userAgent: string }>).find(
      (r) => r.userAgent === "Googlebot-Image",
    );
    expect(rule).toBeDefined();
  });

  it("should specify the sitemap URL", () => {
    expect(result.sitemap).toBe("https://www.praedixa.com/sitemap.xml");
  });
});
