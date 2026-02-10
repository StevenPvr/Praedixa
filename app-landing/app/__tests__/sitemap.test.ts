import { describe, it, expect } from "vitest";
import sitemap from "../sitemap";

describe("sitemap()", () => {
  const result = sitemap();

  it("should return an array of URLs", () => {
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should include the homepage", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com");
  });

  it("should include /devenir-pilote", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/devenir-pilote");
  });

  it("should include /mentions-legales", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/mentions-legales");
  });

  it("should include /confidentialite", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/confidentialite");
  });

  it("should include /cgu", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/cgu");
  });

  it("should have lastModified dates on every entry", () => {
    for (const entry of result) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });

  it("should set homepage priority to 1", () => {
    const homepage = result.find(
      (entry) => entry.url === "https://www.praedixa.com",
    );
    expect(homepage?.priority).toBe(1);
  });

  it("should set /devenir-pilote priority to 0.9", () => {
    const page = result.find(
      (entry) => entry.url === "https://www.praedixa.com/devenir-pilote",
    );
    expect(page?.priority).toBe(0.9);
  });

  it("should have changeFrequency on every entry", () => {
    for (const entry of result) {
      expect(entry.changeFrequency).toBeDefined();
    }
  });
});
