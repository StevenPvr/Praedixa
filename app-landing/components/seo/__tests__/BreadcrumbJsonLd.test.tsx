import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BreadcrumbJsonLd } from "../BreadcrumbJsonLd";

describe("BreadcrumbJsonLd", () => {
  it("renders a valid BreadcrumbList graph", () => {
    const { container } = render(
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/fr" },
          { name: "Resources", path: "/fr/ressources" },
        ]}
      />,
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]#praedixa-breadcrumb-json-ld',
    );
    expect(script).toBeTruthy();

    const parsed = JSON.parse(script?.textContent ?? "{}");
    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement).toHaveLength(2);
    expect(parsed.itemListElement[0].item).toBe("https://www.praedixa.com/fr");
  });
});
