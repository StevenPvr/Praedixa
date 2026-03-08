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

describe("JsonLd", () => {
  it("renders only organization and website schemas by default", async () => {
    const dict = await getDictionary("fr");
    const { container } = render(<JsonLd locale="fr" dict={dict} />);

    const schemaTypes = readSchemaTypes(container);

    expect(schemaTypes).toEqual(["Organization", "WebSite"]);
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

    expect(schemaTypes).toEqual([
      "SoftwareApplication",
      "Service",
      "FAQPage",
    ]);
  });
});
