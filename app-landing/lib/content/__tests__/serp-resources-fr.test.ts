import { describe, it, expect } from "vitest";
import {
  getSerpResourceBySlug,
  getSerpResourceInternalLinks,
  getSerpResourcePrimaryCta,
  getSerpResourceSchemaType,
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

  it("resolves explicit internal links from the linking graph", () => {
    const links = getSerpResourceInternalLinks("cout-sous-couverture", 3);
    expect(links).toHaveLength(3);
    expect(links.map((entry) => entry.slug)).toEqual([
      "cout-inaction-logistique",
      "pilotage-masse-salariale-logistique",
      "traceabilite-decisions-operationnelles",
    ]);
  });

  it("returns per-page CTA and schema metadata", () => {
    expect(getSerpResourcePrimaryCta("cout-sous-couverture")).toBe(
      "Calculer le cout de l'inaction",
    );
    expect(getSerpResourceSchemaType("calcul-besoin-effectifs-entrepot")).toBe(
      "WebPage",
    );
    expect(getSerpResourceSchemaType("cout-sous-couverture")).toBe("Article");
  });
});
