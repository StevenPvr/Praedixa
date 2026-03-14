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
        title: "Fédération gouvernée sur l'existant",
        body: "Praedixa se branche au-dessus de l'ERP, du planning, de la BI et d'Excel pour relier les systèmes qui comptent pour une décision, sans projet de remplacement.",
      },
      {
        title: "Journal de décision + première action",
        body: "Le signal ne reste pas dans un dashboard: le choix est comparé, journalisé, puis la première action utile est enclenchée dans les outils existants.",
      },
      {
        title: "Preuve mensuelle décision par décision",
        body: "La valeur est relue avec une logique baseline / recommandé / réel, des hypothèses explicites et une lecture exploitable en revue Ops / Finance.",
      },
    ]);

    expect(listSectorDifferentiationCards("en")).toHaveLength(3);
  });

  it("keeps sector value propositions differentiated by business risk, not only staffing", () => {
    const hospitalityFr = getSectorPageById("fr", "hcr");
    const higherEducationFr = getSectorPageById("fr", "higher-education");
    const logisticsFr = getSectorPageById("fr", "logistics-transport-retail");
    const automotiveFr = getSectorPageById("fr", "automotive");

    expect(hospitalityFr.valuePropBody).toContain("promesse de service");
    expect(higherEducationFr.valuePropBody).toContain("service étudiant");
    expect(logisticsFr.valuePropBody).toContain("couverture stock");
    expect(automotiveFr.valuePropBody).toContain("pièces");

    const hospitalityEn = getSectorPageById("en", "hcr");
    const higherEducationEn = getSectorPageById("en", "higher-education");
    const logisticsEn = getSectorPageById("en", "logistics-transport-retail");
    const automotiveEn = getSectorPageById("en", "automotive");

    expect(hospitalityEn.valuePropBody).toContain("service promise");
    expect(higherEducationEn.valuePropBody).toContain("student service");
    expect(logisticsEn.valuePropBody).toContain("inventory coverage");
    expect(automotiveEn.valuePropBody).toContain("parts");
  });

  it("keeps sector KPIs and decisions anchored in distinct business levers", () => {
    const hospitalityFr = getSectorPageById("fr", "hcr");
    const higherEducationFr = getSectorPageById("fr", "higher-education");
    const logisticsFr = getSectorPageById("fr", "logistics-transport-retail");
    const automotiveFr = getSectorPageById("fr", "automotive");

    expect(hospitalityFr.kpis.join(" ")).toContain("RevPAR");
    expect(hospitalityFr.decisions.join(" ")).toContain("terrasses");
    expect(higherEducationFr.kpis.join(" ")).toContain("yield");
    expect(higherEducationFr.decisions.join(" ")).toContain(
      "surveillance d'examens",
    );
    expect(logisticsFr.kpis.join(" ")).toContain("Couverture de stock");
    expect(logisticsFr.decisions.join(" ")).toContain("réapprovisionnement");
    expect(automotiveFr.kpis.join(" ")).toContain("Taux de service pièces");
    expect(automotiveFr.decisions.join(" ")).toContain(
      "transferts inter-sites",
    );

    const hospitalityEn = getSectorPageById("en", "hcr");
    const higherEducationEn = getSectorPageById("en", "higher-education");
    const logisticsEn = getSectorPageById("en", "logistics-transport-retail");
    const automotiveEn = getSectorPageById("en", "automotive");

    expect(hospitalityEn.kpis.join(" ")).toContain("RevPAR");
    expect(hospitalityEn.decisions.join(" ")).toContain("terraces");
    expect(higherEducationEn.kpis.join(" ")).toContain("yield");
    expect(higherEducationEn.decisions.join(" ")).toContain("exam proctoring");
    expect(logisticsEn.kpis.join(" ")).toContain("Inventory coverage");
    expect(logisticsEn.decisions.join(" ")).toContain("replenishment");
    expect(automotiveEn.kpis.join(" ")).toContain("Parts fill rate");
    expect(automotiveEn.decisions.join(" ")).toContain("inter-site transfers");
  });
});
