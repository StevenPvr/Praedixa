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
    expect(getKnowledgePage("en", "about").lead).toContain(
      "trade-offs that put margin at risk",
    );
    expect(getKnowledgePage("en", "productMethod").lead).toContain(
      "without replacing the tools already in place",
    );
    expect(
      getKnowledgePage("en", "productMethod").sections[1]?.paragraphs[1],
    ).toContain("Forecasting");
    expect(
      getKnowledgePage("en", "productMethod").sections[2]?.paragraphs[1],
    ).toContain("Econometric models");
    expect(getKnowledgePage("en", "integrationData").lead).toContain(
      "without requiring a planning or WFM replacement",
    );
    expect(getKnowledgePage("en", "howItWorksPage").lead).toContain(
      "compares trade-offs",
    );
    expect(getKnowledgePage("en", "decisionLogProof").lead).toContain(
      "Illustrative public example",
    );
    expect(
      getKnowledgePage("en", "decisionLogProof").sections[2]?.paragraphs[1],
    ).toContain("Econometric models");
    expect(getKnowledgePage("en", "decisionLogProof").title).toBe("ROI pack");
    expect(en.servicesPage.heading).toBe(
      "Praedixa deployment and historical proof.",
    );
    expect(en.servicesPage.fullPackage.includes).toContain(
      "Software rollout and scoped implementation",
    );
    expect(
      en.faq.items.some(
        (item) => item.question === "How does Praedixa calculate trade-offs?",
      ),
    ).toBe(true);
  });

  it("uses only the approved English CTAs on annex knowledge pages", () => {
    const allowedCtas = new Set([
      "See a concrete example",
      "Discuss deployment",
    ]);

    enKnowledgeKeys.forEach((key) => {
      expect(allowedCtas.has(getKnowledgePage("en", key).ctaLabel)).toBe(true);
    });
  });
});
