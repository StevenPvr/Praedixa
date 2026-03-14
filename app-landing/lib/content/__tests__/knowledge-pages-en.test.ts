import { describe, expect, it } from "vitest";
import { getKnowledgePage, type KnowledgePageKey } from "../knowledge-pages";
import { en } from "../../i18n/dictionaries/en";

const enKnowledgeKeys: KnowledgePageKey[] = [
  "about",
  "security",
  "resources",
  "productMethod",
  "howItWorksPage",
  "decisionLogProof",
  "integrationData",
];

describe("knowledge pages EN messaging", () => {
  it("keeps core annex pages aligned with the simplified value proposition", () => {
    expect(getKnowledgePage("en", "about").lead).toContain("DecisionOps");
    expect(getKnowledgePage("en", "productMethod").lead).toContain(
      "without replacing your tools",
    );
    expect(
      getKnowledgePage("en", "productMethod").sections[2]?.paragraphs[1],
    ).toContain("Forecasting");
    expect(
      getKnowledgePage("en", "productMethod").sections[3]?.paragraphs[1],
    ).toContain("Econometric models");
    expect(getKnowledgePage("en", "integrationData").lead).toContain(
      "systems that matter to a decision",
    );
    expect(getKnowledgePage("en", "howItWorksPage").lead).toContain(
      "federate the useful data",
    );
    expect(
      getKnowledgePage("en", "decisionLogProof").sections[0]?.paragraphs[1],
    ).toContain("Econometric models");
    expect(getKnowledgePage("en", "decisionLogProof").title).toBe("ROI pack");
    expect(en.servicesPage.heading).toBe(
      "Praedixa Signature Service vs KPI forecasting only.",
    );
    expect(en.servicesPage.fullPackage.includes).toContain(
      "Decision journal: option, choice, reason, outcome.",
    );
    expect(
      en.faq.items.some(
        (item) => item.question === "How does Praedixa calculate trade-offs?",
      ),
    ).toBe(true);
  });

  it("uses only the approved English CTAs on annex knowledge pages", () => {
    const allowedCtas = new Set([
      "Get the free ROI diagnostic",
      "Apply for the ROI pilot",
    ]);

    enKnowledgeKeys.forEach((key) => {
      expect(allowedCtas.has(getKnowledgePage("en", key).ctaLabel)).toBe(true);
    });
  });
});
