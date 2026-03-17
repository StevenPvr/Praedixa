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

describe("llms routes", () => {
  it("should return plain text for /llms.txt", async () => {
    const response = await getLlms();
    expect(response.headers.get("content-type")).toContain("text/plain");
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
      "> Praedixa helps multi-site networks spot the trade-offs that threaten margin earlier",
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
      "[Industry EN: Higher education](https://www.praedixa.com/en/industries/higher-education)",
    );
    expect(body).toContain(
      "[Sector FR: Fitness](https://www.praedixa.com/fr/secteurs/fitness-reseaux-clubs)",
    );
    expect(body).not.toContain("historical audit");
    expect(body).not.toContain("Cloudflare");

    for (const retiredUrl of retiredKnowledgeUrls) {
      expect(body).not.toContain(retiredUrl);
    }
  });

  it("should expose the expanded GEO inventory in /llms-full.txt", async () => {
    const body = await (await getLlmsFull()).text();

    expect(body).toContain("# Praedixa full content index");
    expect(body).toContain("## Core FR");
    expect(body).toContain("## Core EN");
    expect(body).toContain("## French SERP Resource Library");
    expect(body).toContain("## Blog and Editorial Surfaces");
    expect(body).toContain("https://www.praedixa.com/fr/ressources");
    expect(body).toContain("https://www.praedixa.com/en/resources");
    expect(body).toContain("https://www.praedixa.com/fr/ressources/");
    expect(body).toContain("https://www.praedixa.com/fr/secteurs/hcr");
    expect(body).toContain(
      "https://www.praedixa.com/en/industries/logistics-transport-retail",
    );
    expect(body).toContain(
      "https://www.praedixa.com/en/industries/fitness-club-networks",
    );

    for (const retiredUrl of retiredKnowledgeUrls) {
      expect(body).not.toContain(retiredUrl);
    }
  });
});
