import { describe, expect, it } from "vitest";
import { getKnowledgePage, type KnowledgePageKey } from "../knowledge-pages";
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
    expect(getKnowledgePage("fr", "about").lead).toContain("DecisionOps");
    expect(getKnowledgePage("fr", "productMethod").lead).toContain(
      "sans remplacer vos outils",
    );
    expect(getKnowledgePage("fr", "productMethod").lead).toContain(
      "supply chain",
    );
    expect(getKnowledgePage("fr", "integrationData").lead).toContain(
      "fédérer les systèmes",
    );
    expect(getKnowledgePage("fr", "howItWorksPage").lead).toContain(
      "fédérer les données utiles",
    );
    expect(getKnowledgePage("fr", "decisionLogProof").title).toBe(
      "Dossier ROI",
    );
    expect(fr.servicesPage.heading).toBe(
      "Déploiement Praedixa vs preuve sur historique.",
    );
    expect(fr.servicesPage.fullPackage.includes).toContain(
      "Onboarding fixe sur un périmètre multi-sites réaliste",
    );
  });

  it("uses only the approved French CTAs on annex knowledge pages", () => {
    const allowedCtas = new Set([
      "Demander la preuve sur historique",
      "Parler du déploiement",
    ]);

    frKnowledgeKeys.forEach((key) => {
      expect(allowedCtas.has(getKnowledgePage("fr", key).ctaLabel)).toBe(true);
    });
  });
});
