import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { JsonLd } from "../JsonLd";

function parseJsonLd(script: Element) {
  return JSON.parse(script.textContent!.replace(/\\u003c/g, "<"));
}

function getAllSchemas() {
  const script = document.querySelector(
    'script[type="application/ld+json"]#praedixa-json-ld',
  );
  if (!script) return [];
  const parsed = parseJsonLd(script);
  return parsed["@graph"] ?? (Array.isArray(parsed) ? parsed : [parsed]);
}

describe("JsonLd", () => {
  it("should inject a single script tag with type application/ld+json into head", () => {
    render(<JsonLd />);
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]#praedixa-json-ld',
    );
    expect(scripts.length).toBe(1);
  });

  it("should include the Organization schema", () => {
    render(<JsonLd />);
    const schemas = getAllSchemas();
    const data = schemas.find(
      (s: { "@type"?: string }) => s["@type"] === "Organization",
    );
    expect(data).toBeDefined();
    expect(data!.name).toBe("Praedixa");
    expect(data!.url).toBe("https://www.praedixa.com");
  });

  it("should include the SoftwareApplication schema", () => {
    render(<JsonLd />);
    const schemas = getAllSchemas();
    const data = schemas.find(
      (s: { "@type"?: string }) => s["@type"] === "SoftwareApplication",
    );
    expect(data).toBeDefined();
    expect(data!.applicationCategory).toBe("BusinessApplication");
  });

  it("should include the HowTo schema with steps", () => {
    render(<JsonLd />);
    const schemas = getAllSchemas();
    const data = schemas.find(
      (s: { "@type"?: string }) => s["@type"] === "HowTo",
    );
    expect(data).toBeDefined();
    expect(data!.step.length).toBeGreaterThanOrEqual(3);
    expect(data!.step[0].position).toBe(1);
  });

  it("should include the FAQPage schema with questions", () => {
    render(<JsonLd />);
    const schemas = getAllSchemas();
    const data = schemas.find(
      (s: { "@type"?: string }) => s["@type"] === "FAQPage",
    );
    expect(data).toBeDefined();
    expect(data!.mainEntity.length).toBeGreaterThan(0);
    expect(data!.mainEntity[0]["@type"]).toBe("Question");
    expect(data!.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
  });

  it("should include the Service schema", () => {
    render(<JsonLd />);
    const schemas = getAllSchemas();
    const data = schemas.find(
      (s: { "@type"?: string }) => s["@type"] === "Service",
    );
    expect(data).toBeDefined();
    expect(data!.provider.name).toBe("Praedixa");
  });

  it("should include the WebSite schema", () => {
    render(<JsonLd />);
    const schemas = getAllSchemas();
    const data = schemas.find(
      (s: { "@type"?: string }) => s["@type"] === "WebSite",
    );
    expect(data).toBeDefined();
    expect(data!.inLanguage).toEqual(["fr-FR", "en-US"]);
  });

  it("should escape < characters as \\u003c to prevent script injection", () => {
    render(<JsonLd />);
    const script = document.querySelector(
      'script[type="application/ld+json"]#praedixa-json-ld',
    );
    expect(script?.textContent).not.toContain("<");
  });

  it("should have valid JSON in each script", () => {
    render(<JsonLd />);
    const script = document.querySelector(
      'script[type="application/ld+json"]#praedixa-json-ld',
    );
    expect(script).toBeTruthy();
    expect(() => parseJsonLd(script!)).not.toThrow();
  });
});
