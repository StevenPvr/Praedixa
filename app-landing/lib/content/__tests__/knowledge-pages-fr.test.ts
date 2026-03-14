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
    expect(getKnowledgePage("fr", "about").lead).toContain("arbitrer plus tôt");
    expect(getKnowledgePage("fr", "productMethod").lead).toContain(
      "sans remplacer les outils déjà en place",
    );
    expect(getKnowledgePage("fr", "productMethod").lead).toContain(
      "relire l’impact",
    );
    expect(
      getKnowledgePage("fr", "productMethod").sections[1]?.paragraphs[1],
    ).toContain("optimisation sous contrainte");
    expect(
      getKnowledgePage("fr", "productMethod").sections[2]?.paragraphs[1],
    ).toContain("modèles économétriques");
    expect(getKnowledgePage("fr", "integrationData").lead).toContain(
      "lecture utile",
    );
    expect(getKnowledgePage("fr", "howItWorksPage").lead).toContain(
      "compare les arbitrages",
    );
    expect(getKnowledgePage("fr", "decisionLogProof").lead).toContain(
      "Exemple illustratif",
    );
    expect(
      getKnowledgePage("fr", "decisionLogProof").sections[2]?.paragraphs[1],
    ).toContain("modèles économétriques");
    expect(getKnowledgePage("fr", "decisionLogProof").title).toBe(
      "Preuve sur historique",
    );
    expect(fr.servicesPage.heading).toBe(
      "Ce que vous achetez: un premier périmètre de décision, pas un projet SI de plus.",
    );
    expect(fr.servicesPage.fullPackage.includes).toContain(
      "Cadre commun Ops / Finance / Réseau",
    );
    expect(
      fr.faq.items.some(
        (item) => item.question === "Comment Praedixa calcule les arbitrages ?",
      ),
    ).toBe(true);
    expect(
      fr.faq.items.some((item) =>
        item.answer.includes("modèles économétriques"),
      ),
    ).toBe(true);
  });

  it("uses only the approved French CTAs on annex knowledge pages", () => {
    const allowedCtas = new Set([
      "Voir un exemple concret",
      "Cadrer un premier périmètre",
    ]);

    frKnowledgeKeys.forEach((key) => {
      expect(allowedCtas.has(getKnowledgePage("fr", key).ctaLabel)).toBe(true);
    });
  });
});
