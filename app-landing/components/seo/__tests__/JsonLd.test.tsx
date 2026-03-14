import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonLd } from "../JsonLd";
import { getDictionary } from "../../../lib/i18n/get-dictionary";

function readSchemaTypes(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll('script[type="application/ld+json"]'),
  ).map((node) => {
    const content = node.textContent ?? "{}";
    const parsed = JSON.parse(content) as { "@type"?: string };
    return parsed["@type"] ?? "";
  });
}

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
    throw new Error("Expected organization and website schemas");
  }
  return [schemas[0]!, schemas[1]!];
}

describe("JsonLd", () => {
  it("renders only organization and website schemas by default", async () => {
    const dict = await getDictionary("fr");
    const { container } = render(<JsonLd locale="fr" dict={dict} />);

    const schemaTypes = readSchemaTypes(container);

    expect(schemaTypes).toEqual(["Organization", "WebSite"]);
  });

  it("links the website schema to the canonical organization entity", async () => {
    const dict = await getDictionary("fr");
    const { container } = render(<JsonLd locale="fr" dict={dict} />);

    const [organization, webSite] = readRequiredSchemas(container) as [
      {
        "@id"?: string;
      },
      {
        "@id"?: string;
        publisher?: { "@id"?: string };
      },
    ];

    expect(organization["@id"]).toBe("https://www.praedixa.com#organization");
    expect(webSite["@id"]).toBe("https://www.praedixa.com#website");
    expect(webSite.publisher?.["@id"]).toBe(
      "https://www.praedixa.com#organization",
    );
  });

  it("renders page-level schemas only when explicitly requested", async () => {
    const dict = await getDictionary("en");
    const { container } = render(
      <JsonLd
        locale="en"
        dict={dict}
        types={["softwareApplication", "service", "faq"]}
      />,
    );

    const schemaTypes = readSchemaTypes(container);

    expect(schemaTypes).toEqual(["SoftwareApplication", "Service", "FAQPage"]);
  });

  it("keeps the French FAQ schema aligned with the approved ML and optimization wording", async () => {
    const dict = await getDictionary("fr");
    const { container } = render(
      <JsonLd locale="fr" dict={dict} types={["faq"]} />,
    );

    const faqScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const parsed = JSON.parse(faqScript?.textContent ?? "{}") as {
      mainEntity?: Array<{ name?: string; acceptedAnswer?: { text?: string } }>;
    };

    expect(
      parsed.mainEntity?.some(
        (entry) =>
          entry.name === "Comment Praedixa calcule les arbitrages ?" &&
          entry.acceptedAnswer?.text?.includes("modèles économétriques"),
      ),
    ).toBe(true);
  });

  it("keeps the English FAQ schema aligned with the approved econometrics wording", async () => {
    const dict = await getDictionary("en");
    const { container } = render(
      <JsonLd locale="en" dict={dict} types={["faq"]} />,
    );

    const faqScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const parsed = JSON.parse(faqScript?.textContent ?? "{}") as {
      mainEntity?: Array<{ name?: string; acceptedAnswer?: { text?: string } }>;
    };

    expect(
      parsed.mainEntity?.some(
        (entry) =>
          entry.name === "How does Praedixa calculate trade-offs?" &&
          entry.acceptedAnswer?.text?.includes("econometric models"),
      ),
    ).toBe(true);
  });
});
