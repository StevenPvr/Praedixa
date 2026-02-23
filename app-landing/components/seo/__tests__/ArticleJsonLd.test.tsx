import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ArticleJsonLd } from "../ArticleJsonLd";

describe("ArticleJsonLd", () => {
  it("renders Article schema for standard resource pages", () => {
    const { container } = render(
      <ArticleJsonLd
        schemaType="Article"
        headline="Coût de la sous-couverture"
        description="Calcul complet du coût de la sous-couverture."
        path="/fr/ressources/cout-sous-couverture"
        locale="fr-FR"
        query="coût de la sous-couverture"
      />,
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]#praedixa-article-json-ld',
    );
    expect(script).toBeTruthy();

    const parsed = JSON.parse(script?.textContent ?? "{}");
    expect(parsed["@type"]).toBe("Article");
    expect(parsed.url).toBe(
      "https://www.praedixa.com/fr/ressources/cout-sous-couverture",
    );
  });

  it("renders WebPage schema when requested", () => {
    const { container } = render(
      <ArticleJsonLd
        schemaType="WebPage"
        headline="Calculateur besoin en effectifs"
        description="Calculateur FTE"
        path="/fr/ressources/calcul-besoin-effectifs-entrepot"
        locale="fr-FR"
        query="calcul besoin en effectifs entrepôt"
      />,
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]#praedixa-article-json-ld',
    );
    const parsed = JSON.parse(script?.textContent ?? "{}");
    expect(parsed["@type"]).toBe("WebPage");
    expect(parsed.mainEntityOfPage).toBeUndefined();
  });
});
