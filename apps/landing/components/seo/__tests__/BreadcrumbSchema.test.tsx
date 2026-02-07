import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { BreadcrumbSchema } from "../BreadcrumbSchema";

// Mock next/script — renders a regular <script> tag for testability
vi.mock("next/script", () => ({
  default: (props: React.ScriptHTMLAttributes<HTMLScriptElement>) => {
    const { dangerouslySetInnerHTML, ...rest } = props;
    return (
      <script
        {...rest}
        dangerouslySetInnerHTML={
          dangerouslySetInnerHTML as { __html: string } | undefined
        }
      />
    );
  },
}));

describe("BreadcrumbSchema", () => {
  const sampleItems = [
    { name: "Accueil", url: "https://www.praedixa.com" },
    {
      name: "Devenir pilote",
      url: "https://www.praedixa.com/devenir-pilote",
    },
  ];

  it("should render a script tag with type application/ld+json", () => {
    const { container } = render(<BreadcrumbSchema items={sampleItems} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).not.toBeNull();
  });

  it("should have the id 'breadcrumb-schema'", () => {
    const { container } = render(<BreadcrumbSchema items={sampleItems} />);
    const script = container.querySelector("#breadcrumb-schema");
    expect(script).not.toBeNull();
  });

  it("should output valid JSON-LD with @context and @type", () => {
    const { container } = render(<BreadcrumbSchema items={sampleItems} />);
    const script = container.querySelector("#breadcrumb-schema");
    const data = JSON.parse(script!.textContent!);
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("BreadcrumbList");
  });

  it("should map items to itemListElement with correct positions", () => {
    const { container } = render(<BreadcrumbSchema items={sampleItems} />);
    const script = container.querySelector("#breadcrumb-schema");
    const data = JSON.parse(script!.textContent!);
    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Accueil",
      item: "https://www.praedixa.com",
    });
    expect(data.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Devenir pilote",
      item: "https://www.praedixa.com/devenir-pilote",
    });
  });

  it("should handle a single breadcrumb item", () => {
    const { container } = render(
      <BreadcrumbSchema
        items={[{ name: "Accueil", url: "https://www.praedixa.com" }]}
      />,
    );
    const script = container.querySelector("#breadcrumb-schema");
    const data = JSON.parse(script!.textContent!);
    expect(data.itemListElement).toHaveLength(1);
    expect(data.itemListElement[0].position).toBe(1);
  });

  it("should handle an empty items array", () => {
    const { container } = render(<BreadcrumbSchema items={[]} />);
    const script = container.querySelector("#breadcrumb-schema");
    const data = JSON.parse(script!.textContent!);
    expect(data.itemListElement).toHaveLength(0);
  });
});
