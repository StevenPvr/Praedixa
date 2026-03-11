import { describe, expect, it } from "vitest";
import {
  getSectorAlternatePaths,
  getSectorDisplaySourceLinks,
  getSectorPageBySlug,
  getSectorPageHref,
  getSectorLegacyRedirects,
  getSectorPageById,
  listSectorDifferentiationCards,
  listSectorPages,
} from "../sector-pages";

describe("sector pages content", () => {
  it("exposes four sector pages per locale", () => {
    expect(listSectorPages("fr")).toHaveLength(4);
    expect(listSectorPages("en")).toHaveLength(4);
  });

  it("resolves localized hrefs consistently", () => {
    expect(getSectorPageHref("fr", "hcr")).toBe("/fr/secteurs/hcr");
    expect(getSectorPageHref("en", "hcr")).toBe(
      "/en/industries/hospitality-food-service",
    );
    expect(getSectorAlternatePaths("automotive")).toEqual({
      fr: "/fr/secteurs/automobile-concessions-ateliers",
      en: "/en/industries/automotive-dealerships-workshops",
    });
  });

  it("returns the expected localized entries by slug", () => {
    expect(getSectorPageBySlug("fr", "enseignement-superieur")?.id).toBe(
      "higher-education",
    );
    expect(getSectorPageBySlug("en", "logistics-transport-retail")?.id).toBe(
      "logistics-transport-retail",
    );
    expect(getSectorPageBySlug("fr", "unknown")).toBeNull();
  });

  it("maps legacy sector URLs to the exact replacement pages", () => {
    const redirects = getSectorLegacyRedirects();

    expect(redirects["/praedixa-restauration-rapide"]).toBe("/fr/secteurs/hcr");
    expect(redirects["/praedixa-logistics"]).toBe(
      "/en/industries/logistics-transport-retail",
    );
    expect(redirects["/praedixa-concessions-ateliers"]).toBe(
      "/fr/secteurs/automobile-concessions-ateliers",
    );
  });

  it("deduplicates repeated source URLs in rendered source lists", () => {
    const hospitalityFr = getSectorPageById("fr", "hcr");
    const renderedSources = getSectorDisplaySourceLinks(hospitalityFr);
    const franceTravailSources = renderedSources.filter((source) =>
      source.url.includes("statistiques.francetravail.org/bmo/bmo?fg=IZ"),
    );

    expect(franceTravailSources).toHaveLength(1);
    expect(renderedSources.length).toBeLessThan(
      hospitalityFr.proofs.length + hospitalityFr.sourceLinks.length,
    );
  });

  it("ships predicted KPIs and optimized decisions for every sector page", () => {
    for (const locale of ["fr", "en"] as const) {
      for (const entry of listSectorPages(locale)) {
        expect(entry.kpis.length).toBeGreaterThanOrEqual(6);
        expect(entry.decisions.length).toBeGreaterThanOrEqual(6);
        expect(entry.kpiTitle.length).toBeGreaterThan(20);
        expect(entry.decisionTitle.length).toBeGreaterThan(20);
      }
    }
  });

  it("keeps shared differentiation cards in localized content modules", () => {
    expect(listSectorDifferentiationCards("fr")).toEqual([
      {
        title: "Federation gouvernee sur l'existant",
        body: "Praedixa se branche au-dessus de l'ERP, du planning, de la BI et d'Excel pour relier les systemes qui comptent pour une decision, sans projet de remplacement.",
      },
      {
        title: "Decision Journal + premiere action",
        body: "Le signal ne reste pas dans un dashboard: le choix est compare, journalise, puis la premiere action utile est enclenchee dans les outils existants.",
      },
      {
        title: "Preuve mensuelle decision par decision",
        body: "La valeur est relue avec une logique baseline / recommande / reel, des hypotheses explicites et une lecture exploitable en revue Ops / Finance.",
      },
    ]);

    expect(listSectorDifferentiationCards("en")).toHaveLength(3);
  });
});
