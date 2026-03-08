import { describe, expect, it } from "vitest";
import {
  getKnowledgePage,
  type KnowledgePageKey,
} from "../knowledge-pages";
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
    expect(getKnowledgePage("en", "about").lead).toContain("supply chain");
    expect(getKnowledgePage("en", "productMethod").lead).toContain(
      "without replacing your tools",
    );
    expect(getKnowledgePage("en", "integrationData").lead).toContain(
      "shared foundation",
    );
    expect(getKnowledgePage("en", "howItWorksPage").lead).toContain(
      "bring the data together",
    );
    expect(getKnowledgePage("en", "decisionLogProof").title).toBe("ROI pack");
    expect(en.servicesPage.heading).toBe("Praedixa offer vs ROI diagnostic.");
    expect(en.servicesPage.fullPackage.includes).toContain(
      "HR, finance, operations, and supply chain data brought together",
    );
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
