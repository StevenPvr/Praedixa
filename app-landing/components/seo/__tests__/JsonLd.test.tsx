import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { JsonLd } from "../JsonLd";

function parseJsonLd(raw: string) {
  return JSON.parse(raw.replace(/\\u003c/g, "<"));
}

describe("JsonLd", () => {
  it("renders JSON-LD script", async () => {
    const node = await JsonLd({ locale: "fr" });
    const { container } = render(node);
    const script = container.querySelector(
      'script[type="application/ld+json"]#praedixa-json-ld',
    );
    expect(script).toBeTruthy();
  });

  it("contains Organization with official sameAs and no public email", async () => {
    const node = await JsonLd({ locale: "fr" });
    const { container } = render(node);
    const script = container.querySelector(
      'script[type="application/ld+json"]#praedixa-json-ld',
    );

    const parsed = parseJsonLd(script?.textContent ?? "{}");
    const graph = parsed["@graph"] as Array<Record<string, unknown>>;
    const org = graph.find((item) => item["@type"] === "Organization");

    expect(org).toBeDefined();
    expect(org?.name).toBe("Praedixa");
    expect(org?.sameAs).toEqual(["https://linkedin.com/company/praedixa"]);
    expect((org?.contactPoint as { email?: string }).email).toBeUndefined();
  });

  it("contains WebSite SearchAction", async () => {
    const node = await JsonLd({ locale: "en" });
    const { container } = render(node);
    const script = container.querySelector(
      'script[type="application/ld+json"]#praedixa-json-ld',
    );

    const parsed = parseJsonLd(script?.textContent ?? "{}");
    const graph = parsed["@graph"] as Array<Record<string, unknown>>;
    const website = graph.find((item) => item["@type"] === "WebSite");

    expect(website).toBeDefined();
    expect(website?.name).toBe("Praedixa");
    expect((website?.potentialAction as { "@type"?: string })["@type"]).toBe(
      "SearchAction",
    );
  });

  it("does not include FAQPage at layout level", async () => {
    const node = await JsonLd({ locale: "fr" });
    const { container } = render(node);
    const script = container.querySelector(
      'script[type="application/ld+json"]#praedixa-json-ld',
    );

    const parsed = parseJsonLd(script?.textContent ?? "{}");
    const graph = parsed["@graph"] as Array<Record<string, unknown>>;
    const faq = graph.find((item) => item["@type"] === "FAQPage");

    expect(faq).toBeUndefined();
  });
});
