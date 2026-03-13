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
    expect(urls).toContain("https://www.praedixa.com/fr/deploiement");
    expect(urls).toContain("https://www.praedixa.com/en/deployment");
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

  it("should include services page in both locales", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/fr/services");
    expect(urls).toContain("https://www.praedixa.com/en/services");
  });

  it("should include sector pages in both locales", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/fr/secteurs/hcr");
    expect(urls).toContain(
      "https://www.praedixa.com/fr/secteurs/enseignement-superieur",
    );
    expect(urls).toContain(
      "https://www.praedixa.com/fr/secteurs/logistique-transport-retail",
    );
    expect(urls).toContain(
      "https://www.praedixa.com/fr/secteurs/automobile-concessions-ateliers",
    );
    expect(urls).toContain(
      "https://www.praedixa.com/en/industries/hospitality-food-service",
    );
    expect(urls).toContain(
      "https://www.praedixa.com/en/industries/higher-education",
    );
  });

  it("should include blog index in both locales", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/fr/blog");
    expect(urls).toContain("https://www.praedixa.com/en/blog");
  });

  it("should not include blog article pages when blog is empty", () => {
    const urls = result.map((entry) => entry.url);
    const blogArticleUrls = urls.filter((url) =>
      /^https:\/\/www\.praedixa\.com\/(?:fr|en)\/blog\/[^/?#]+$/.test(url),
    );

    expect(blogArticleUrls).toEqual([]);
  });

  it("should keep the sitemap focused on the reduced core IA", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/fr/ressources");
    expect(urls).toContain("https://www.praedixa.com/en/resources");
    expect(urls).not.toContain(
      "https://www.praedixa.com/fr/praedixa-restauration-rapide",
    );
    expect(urls).not.toContain(
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
      (entry) => entry.url === "https://www.praedixa.com/fr/deploiement",
    );
    expect(page?.priority).toBe(0.9);
  });

  it("should have changeFrequency on every entry", () => {
    for (const entry of result) {
      expect(entry.changeFrequency).toBeDefined();
    }
  });
});
