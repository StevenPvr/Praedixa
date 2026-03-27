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

  it("should exclude retired deployment entry pages", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).not.toContain("https://www.praedixa.com/fr/deploiement");
    expect(urls).not.toContain("https://www.praedixa.com/en/deployment");
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
    const sectorUrls = urls.filter((url) =>
      /https:\/\/www\.praedixa\.com\/(?:fr\/secteurs|en\/industries)\//.test(
        url,
      ),
    );

    expect(sectorUrls).toEqual([
      "https://www.praedixa.com/fr/secteurs/hcr",
      "https://www.praedixa.com/fr/secteurs/logistique-transport-retail",
      "https://www.praedixa.com/en/industries/hospitality-food-service",
      "https://www.praedixa.com/en/industries/logistics-transport-retail",
    ]);
  });

  it("should include blog index in both locales", () => {
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://www.praedixa.com/fr/blog");
    expect(urls).toContain("https://www.praedixa.com/en/blog");
  });

  it("should include published blog article pages in the sitemap", () => {
    const urls = result.map((entry) => entry.url);
    const blogArticleUrls = urls.filter((url) =>
      /^https:\/\/www\.praedixa\.com\/(?:fr|en)\/blog\/[^/?#]+$/.test(url),
    );

    expect(blogArticleUrls).toEqual([
      "https://www.praedixa.com/fr/blog/comite-ops-finance-prouver-roi-decision",
      "https://www.praedixa.com/fr/blog/decision-log-ops-daf-template",
      "https://www.praedixa.com/fr/blog/ops-finance-heures-sup-ou-renfort-comment-trancher",
      "https://www.praedixa.com/fr/blog/cout-sous-couverture-multi-sites-modele-simple",
    ]);
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

  it("should keep services page prioritized above contact", () => {
    const contactPage = result.find(
      (entry) => entry.url === "https://www.praedixa.com/fr/contact",
    );
    const page = result.find(
      (entry) => entry.url === "https://www.praedixa.com/fr/services",
    );
    expect(page?.priority).toBe(0.8);
    expect(contactPage?.priority).toBe(0.7);
  });

  it("should have changeFrequency on every entry", () => {
    for (const entry of result) {
      expect(entry.changeFrequency).toBeDefined();
    }
  });
});
