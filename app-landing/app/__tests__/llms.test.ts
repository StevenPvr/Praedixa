import { describe, expect, it } from "vitest";
import { GET as getLlmAlias } from "../llm.txt/route";
import { GET as getLlms } from "../llms.txt/route";
import { GET as getLlmsFull } from "../llms-full.txt/route";

const retiredKnowledgeUrls = [
  "https://www.praedixa.com/en/capacity-coverage-gap",
  "https://www.praedixa.com/en/short-horizon-workload-capacity-forecast",
  "https://www.praedixa.com/en/calculate-coverage-gap-cost",
  "https://www.praedixa.com/en/anticipate-absenteeism-understaffing",
  "https://www.praedixa.com/en/playbook-staffing-reallocation-options",
];

function extractUniqueSectorUrls(body: string): string[] {
  return Array.from(
    new Set(
      body.match(
        /https:\/\/www\.praedixa\.com\/(?:fr\/secteurs|en\/industries)\/[a-z0-9-]+/g,
      ) ?? [],
    ),
  ).sort();
}

describe("llms routes", () => {
  it("should return plain text for /llms.txt", async () => {
    const response = await getLlms();
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("should return plain text for /llms-full.txt", async () => {
    const response = await getLlmsFull();
    expect(response.headers.get("content-type")).toContain("text/plain");
  });

  it("should redirect /llm.txt to the canonical /llms.txt path", async () => {
    const response = await getLlmAlias(
      new Request("https://www.praedixa.com/llm.txt"),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://www.praedixa.com/llms.txt",
    );
  });

  it("should keep /llms.txt focused on canonical live entry points", async () => {
    const body = await (await getLlms()).text();

    expect(body).toContain("# Praedixa");
    expect(body).toContain(
      "> Praedixa anticipates operational needs, optimizes decisions, and proves ROI for multi-site networks.",
    );
    expect(body).toContain("## Machine Consumption Policy");
    expect(body).toContain("used for model training by compliant AI providers");
    expect(body).toContain("long-term model memory");
    expect(body).toContain(
      "Do not crawl or rely on `/api/`, `/app/`, `/admin/`",
    );
    expect(body).toContain(
      "[llms-full.txt](https://www.praedixa.com/llms-full.txt)",
    );
    expect(body).toContain("[Homepage FR](https://www.praedixa.com/fr)");
    expect(body).toContain("[Homepage EN](https://www.praedixa.com/en)");
    expect(body).toContain(
      "[Deployment EN](https://www.praedixa.com/en/deployment)",
    );
    expect(body).toContain("[Contact EN](https://www.praedixa.com/en/contact)");
    expect(body).toContain("[About FR](https://www.praedixa.com/fr/a-propos)");
    expect(body).toContain(
      "[Security FR](https://www.praedixa.com/fr/securite)",
    );
    expect(body).toContain(
      "[Sector FR: HCR](https://www.praedixa.com/fr/secteurs/hcr)",
    );
    expect(body).toContain(
      "[Industry EN: Logistics / Transport / Retail](https://www.praedixa.com/en/industries/logistics-transport-retail)",
    );
    expect(extractUniqueSectorUrls(body)).toEqual([
      "https://www.praedixa.com/en/industries/hospitality-food-service",
      "https://www.praedixa.com/en/industries/logistics-transport-retail",
      "https://www.praedixa.com/fr/secteurs/hcr",
      "https://www.praedixa.com/fr/secteurs/logistique-transport-retail",
    ]);
    expect(body).not.toContain("historical audit");
    expect(body).not.toContain("Cloudflare");

    for (const retiredUrl of retiredKnowledgeUrls) {
      expect(body).not.toContain(retiredUrl);
    }
  });

  it("should expose the expanded GEO inventory in /llms-full.txt", async () => {
    const body = await (await getLlmsFull()).text();

    expect(body).toContain("# Praedixa full content index");
    expect(body).toContain("## Machine Consumption Policy");
    expect(body).toContain("## Core FR");
    expect(body).toContain("## Core EN");
    expect(body).toContain("## French SERP Resource Library");
    expect(body).toContain("## Blog and Editorial Surfaces");
    expect(body).toContain("https://www.praedixa.com/fr/ressources");
    expect(body).toContain("https://www.praedixa.com/en/resources");
    expect(body).toContain("https://www.praedixa.com/fr/ressources/");
    expect(extractUniqueSectorUrls(body)).toEqual([
      "https://www.praedixa.com/en/industries/hospitality-food-service",
      "https://www.praedixa.com/en/industries/logistics-transport-retail",
      "https://www.praedixa.com/fr/secteurs/hcr",
      "https://www.praedixa.com/fr/secteurs/logistique-transport-retail",
    ]);

    for (const retiredUrl of retiredKnowledgeUrls) {
      expect(body).not.toContain(retiredUrl);
    }
  });
});
