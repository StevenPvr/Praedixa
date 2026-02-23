import { describe, it, expect } from "vitest";
import { getSerpBriefBySlug } from "../serp-briefs-fr";
import { serpResourceTargetsFr } from "../serp-resources-fr";

describe("serp briefs FR", () => {
  it("provides a brief for each SEO target page", () => {
    for (const target of serpResourceTargetsFr) {
      const brief = getSerpBriefBySlug(target.slug);
      expect(brief, `Missing brief for ${target.slug}`).toBeDefined();
      expect(brief?.outlineH2.length).toBeGreaterThanOrEqual(5);
      expect(brief?.paa.length).toBeGreaterThanOrEqual(4);
      expect(brief?.backlinks.length).toBeGreaterThanOrEqual(3);
    }
  });
});
