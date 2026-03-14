import { describe, expect, it } from "vitest";
import { fr } from "../../i18n/dictionaries/fr";
import { en } from "../../i18n/dictionaries/en";
import { getLegalContent } from "../legal";
import { getKnowledgePage, type KnowledgePageKey } from "../knowledge-pages";
import { siteConfig } from "../../config/site";

const knowledgeKeys: KnowledgePageKey[] = [
  "about",
  "security",
  "resources",
  "productMethod",
  "howItWorksPage",
  "decisionLogProof",
  "integrationData",
];

const forbiddenPublicStrings = [
  "Pilote fondateur",
  "Founding Pilot",
  "diagnostic ROI",
  "ROI pilot",
  "Get the free ROI diagnostic",
  "Apply for the ROI pilot",
  "Voir le protocole de mise en place",
  "View the deployment protocol",
  "en cours de formalisation",
  "currently being formalized",
  "Onboarding fixe déduit si engagement annuel",
  "Cloudflare",
];

describe("public copy hygiene", () => {
  it("does not reintroduce retired public offer wording in core dictionaries and legal pages", () => {
    const payload = JSON.stringify({
      fr,
      en,
      legalFr: {
        legal: getLegalContent("fr", "legal"),
        privacy: getLegalContent("fr", "privacy"),
        terms: getLegalContent("fr", "terms"),
      },
      legalEn: {
        legal: getLegalContent("en", "legal"),
        privacy: getLegalContent("en", "privacy"),
        terms: getLegalContent("en", "terms"),
      },
      siteConfig,
      knowledgeFr: knowledgeKeys.map((key) => getKnowledgePage("fr", key)),
      knowledgeEn: knowledgeKeys.map((key) => getKnowledgePage("en", key)),
    });

    forbiddenPublicStrings.forEach((value) => {
      expect(payload).not.toContain(value);
    });
  });
});
