import { describe, it, expect } from "vitest";
import sitemap from "../sitemap";

describe("sitemap()", () => {
  const result = sitemap();

  it("should return an array of URLs", () => {
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should include localized homepage URLs and exclude root redirect URL", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/fr");
    expect(urls).toContain("https://www.praedixa.com/en");
    expect(urls).not.toContain("https://www.praedixa.com/");
  });

  it("should include pilot page (locale-prefixed)", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/fr/devenir-pilote");
    expect(urls).toContain("https://www.praedixa.com/en/pilot-application");
  });

  it("should include legal pages (locale-prefixed)", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/fr/mentions-legales");
    expect(urls).toContain("https://www.praedixa.com/fr/confidentialite");
    expect(urls).toContain("https://www.praedixa.com/fr/cgu");
  });

  it("should include security pages in both locales", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/fr/securite");
    expect(urls).toContain("https://www.praedixa.com/en/security");
  });

  it("should include quick-service restaurant sector pages in both locales", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain(
      "https://www.praedixa.com/fr/praedixa-restauration-rapide",
    );
    expect(urls).toContain(
      "https://www.praedixa.com/en/praedixa-quick-service-restaurants",
    );
  });

  it("should include SERP campaign pages under /fr/ressources", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain(
      "https://www.praedixa.com/fr/ressources/cout-sous-couverture",
    );
    expect(urls).toContain(
      "https://www.praedixa.com/fr/ressources/wfm-logistique",
    );
    expect(urls).toContain(
      "https://www.praedixa.com/fr/ressources/taux-de-service-logistique",
    );
  });

  it("should have lastModified dates on every entry", () => {
    for (const entry of result) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });

  it("should declare x-default on the French canonical URL", () => {
    const frenchHome = result.find(
      (entry) => entry.url === "https://www.praedixa.com/fr",
    );
    expect(frenchHome?.alternates?.languages?.["x-default"]).toBe(
      "https://www.praedixa.com/fr",
    );
  });

  it("should not contain duplicate URLs", () => {
    const urls = result.map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("should set homepage priority to 1", () => {
    const homepage = result.find(
      (entry) => entry.url === "https://www.praedixa.com/fr",
    );
    expect(homepage?.priority).toBe(1);
  });

  it("should set pilot page priority to 0.9", () => {
    const page = result.find(
      (entry) => entry.url === "https://www.praedixa.com/fr/devenir-pilote",
    );
    expect(page?.priority).toBe(0.9);
  });

  it("should have changeFrequency on every entry", () => {
    for (const entry of result) {
      expect(entry.changeFrequency).toBeDefined();
    }
  });
});
