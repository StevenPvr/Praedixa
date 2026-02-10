import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { JsonLd } from "../JsonLd";

describe("JsonLd", () => {
  it("should render 6 script tags with type application/ld+json", () => {
    const { container } = render(<JsonLd />);
    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    expect(scripts.length).toBe(6);
  });

  it("should include the Organization schema", () => {
    const { container } = render(<JsonLd />);
    const script = container.querySelector("#praedixa-org-jsonld");
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent!.replace(/\\u003c/g, "<"));
    expect(data["@type"]).toBe("Organization");
    expect(data.name).toBe("Praedixa");
    expect(data.url).toBe("https://www.praedixa.com");
  });

  it("should include the SoftwareApplication schema", () => {
    const { container } = render(<JsonLd />);
    const script = container.querySelector("#praedixa-software-jsonld");
    const data = JSON.parse(script!.textContent!.replace(/\\u003c/g, "<"));
    expect(data["@type"]).toBe("SoftwareApplication");
    expect(data.applicationCategory).toBe("BusinessApplication");
  });

  it("should include the HowTo schema with 3 steps", () => {
    const { container } = render(<JsonLd />);
    const script = container.querySelector("#praedixa-howto-jsonld");
    const data = JSON.parse(script!.textContent!.replace(/\\u003c/g, "<"));
    expect(data["@type"]).toBe("HowTo");
    expect(data.step).toHaveLength(3);
    expect(data.step[0].position).toBe(1);
  });

  it("should include the FAQPage schema with questions", () => {
    const { container } = render(<JsonLd />);
    const script = container.querySelector("#praedixa-faq-jsonld");
    const data = JSON.parse(script!.textContent!.replace(/\\u003c/g, "<"));
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity.length).toBeGreaterThan(0);
    expect(data.mainEntity[0]["@type"]).toBe("Question");
    expect(data.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
  });

  it("should include the Service schema", () => {
    const { container } = render(<JsonLd />);
    const script = container.querySelector("#praedixa-service-jsonld");
    const data = JSON.parse(script!.textContent!.replace(/\\u003c/g, "<"));
    expect(data["@type"]).toBe("Service");
    expect(data.provider.name).toBe("Praedixa");
  });

  it("should include the WebSite schema", () => {
    const { container } = render(<JsonLd />);
    const script = container.querySelector("#praedixa-website-jsonld");
    const data = JSON.parse(script!.textContent!.replace(/\\u003c/g, "<"));
    expect(data["@type"]).toBe("WebSite");
    expect(data.inLanguage).toBe("fr-FR");
  });

  it("should escape < characters as \\u003c to prevent script injection", () => {
    const { container } = render(<JsonLd />);
    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    for (const script of scripts) {
      // The raw content should NOT contain a bare < inside the JSON
      // (except the opening <script> tag of course)
      expect(script.textContent).not.toContain("<");
    }
  });

  it("should have valid JSON in every script tag", () => {
    const { container } = render(<JsonLd />);
    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    for (const script of scripts) {
      expect(() =>
        JSON.parse(script.textContent!.replace(/\\u003c/g, "<")),
      ).not.toThrow();
    }
  });
});
