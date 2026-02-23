import { describe, it, expect } from "vitest";
import {
  getSerpResourceBySlug,
  getSerpResourceSlugs,
  serpResourceTargetsFr,
} from "../serp-resources-fr";

describe("serp resources FR catalog", () => {
  it("contains 30 unique targets", () => {
    expect(serpResourceTargetsFr).toHaveLength(30);
    const slugs = getSerpResourceSlugs();
    expect(new Set(slugs).size).toBe(30);
  });

  it("resolves an entry from its slug", () => {
    const entry = getSerpResourceBySlug("cout-sous-couverture");
    expect(entry).toBeDefined();
    expect(entry?.query).toBe("coût de la sous-couverture");
  });
});
