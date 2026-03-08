import { describe, expect, it } from "vitest";
import {
  getKnowledgePage,
  type KnowledgePageKey,
} from "../knowledge-pages";
import { fr } from "../../i18n/dictionaries/fr";

const frKnowledgeKeys: KnowledgePageKey[] = [
  "about",
  "security",
  "resources",
  "productMethod",
  "howItWorksPage",
  "decisionLogProof",
  "integrationData",
];

describe("knowledge pages FR messaging", () => {
  it("keeps core annex pages aligned with the home value proposition", () => {
    expect(getKnowledgePage("fr", "about").lead).toContain("supply chain");
    expect(getKnowledgePage("fr", "productMethod").lead).toContain(
      "sans remplacer vos outils",
    );
    expect(getKnowledgePage("fr", "productMethod").lead).toContain(
      "supply chain",
    );
    expect(getKnowledgePage("fr", "integrationData").lead).toContain(
      "dans une même base",
    );
    expect(getKnowledgePage("fr", "howItWorksPage").lead).toContain(
      "rendre les besoins visibles",
    );
    expect(getKnowledgePage("fr", "decisionLogProof").title).toBe(
      "Dossier ROI",
    );
    expect(fr.servicesPage.heading).toBe("Offre Praedixa vs diagnostic ROI.");
    expect(fr.servicesPage.fullPackage.includes).toContain(
      "Données RH, finance, opérations et supply chain réunies",
    );
  });

  it("uses only the approved French CTAs on annex knowledge pages", () => {
    const allowedCtas = new Set([
      "Obtenir le diagnostic ROI gratuit",
      "Demander un pilote ROI",
    ]);

    frKnowledgeKeys.forEach((key) => {
      expect(allowedCtas.has(getKnowledgePage("fr", key).ctaLabel)).toBe(true);
    });
  });
});
