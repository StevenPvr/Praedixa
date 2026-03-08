import { describe, expect, it } from "vitest";
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

  it("should keep /llms.txt focused on canonical live entry points", async () => {
    const body = await (await getLlms()).text();

    expect(body).toContain("# Praedixa");
    expect(body).toContain("> Praedixa is an AI decision copilot");
    expect(body).toContain("[llms-full.txt](https://www.praedixa.com/llms-full.txt)");
    expect(body).toContain("[Homepage FR](https://www.praedixa.com/fr)");
    expect(body).toContain("[Homepage EN](https://www.praedixa.com/en)");
    expect(body).toContain("[Pilot Protocol EN](https://www.praedixa.com/en/pilot-protocol)");
    expect(body).toContain(
      "[Pilot Application EN](https://www.praedixa.com/en/pilot-application)",
    );
    expect(body).toContain("[Contact EN](https://www.praedixa.com/en/contact)");
    expect(body).toContain("[About FR](https://www.praedixa.com/fr/a-propos)");
    expect(body).toContain("[Security FR](https://www.praedixa.com/fr/securite)");

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

    for (const retiredUrl of retiredKnowledgeUrls) {
      expect(body).not.toContain(retiredUrl);
    }
  });
});
