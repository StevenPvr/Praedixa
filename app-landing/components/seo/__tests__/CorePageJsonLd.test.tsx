import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CorePageJsonLd } from "../CorePageJsonLd";

function readSchemas(container: HTMLElement): Array<Record<string, unknown>> {
  return Array.from(
    container.querySelectorAll('script[type="application/ld+json"]'),
  ).map(
    (node) => JSON.parse(node.textContent ?? "{}") as Record<string, unknown>,
  );
}

function readRequiredSchemas(
  container: HTMLElement,
): [Record<string, unknown>, Record<string, unknown>] {
  const schemas = readSchemas(container);
  if (schemas.length < 2) {
    throw new Error("Expected WebPage and BreadcrumbList schemas");
  }
  return [schemas[0]!, schemas[1]!];
}

describe("CorePageJsonLd", () => {
  it("renders a linked WebPage schema and breadcrumb schema for a pillar page", () => {
    const { container } = render(
      <CorePageJsonLd
        locale="fr"
        name="Produit & méthode"
        description="Comprendre la méthode Praedixa."
        path="/fr/produit-methode"
        breadcrumbs={[
          { name: "Accueil", path: "/fr" },
          { name: "Produit & méthode", path: "/fr/produit-methode" },
        ]}
      />,
    );

    const [webPage, breadcrumb] = readRequiredSchemas(container) as [
      {
        "@id"?: string;
        "@type"?: string;
        url?: string;
        inLanguage?: string;
        isPartOf?: { "@id"?: string };
        about?: { "@id"?: string };
        breadcrumb?: { "@id"?: string };
      },
      {
        "@id"?: string;
        "@type"?: string;
        itemListElement?: Array<{ name?: string; item?: string }>;
      },
    ];

    expect(webPage["@type"]).toBe("WebPage");
    expect(webPage["@id"]).toBe(
      "https://www.praedixa.com/fr/produit-methode#webpage",
    );
    expect(webPage.url).toBe("https://www.praedixa.com/fr/produit-methode");
    expect(webPage.inLanguage).toBe("fr");
    expect(webPage.isPartOf?.["@id"]).toBe("https://www.praedixa.com#website");
    expect(webPage.about?.["@id"]).toBe(
      "https://www.praedixa.com#organization",
    );
    expect(webPage.breadcrumb?.["@id"]).toBe(
      "https://www.praedixa.com/fr/produit-methode#breadcrumb",
    );

    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    expect(breadcrumb["@id"]).toBe(
      "https://www.praedixa.com/fr/produit-methode#breadcrumb",
    );
    expect(breadcrumb.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: "https://www.praedixa.com/fr",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Produit & méthode",
        item: "https://www.praedixa.com/fr/produit-methode",
      },
    ]);
  });
});
