import { NextResponse } from "next/server";
import { localizedSlugs } from "../../lib/i18n/config";

const BASE_URL = "https://www.praedixa.com";

const contentKeys = [
  "about",
  "security",
  "resources",
  "productMethod",
  "howItWorksPage",
  "decisionLogProof",
  "integrationData",
] as const;

function section(title: string, urls: string[]): string {
  return [`## ${title}`, ...urls.map((url) => `- ${url}`), ""].join("\n");
}

export async function GET() {
  const fr = contentKeys.map(
    (key) => `${BASE_URL}/fr/${localizedSlugs[key].fr}`,
  );
  const en = contentKeys.map(
    (key) => `${BASE_URL}/en/${localizedSlugs[key].en}`,
  );

  const body = [
    "# Praedixa content index",
    "",
    "Official domain: https://www.praedixa.com",
    "",
    "## Canonical positioning",
    "- AI decision copilot for multi-site networks.",
    "- Anticipate short-horizon KPI drifts (D+3/D+7/D+14 when relevant).",
    "- Quantify trade-offs (cost/service/risk) across reinforcement, reassignment, and service adjustment.",
    "- Trigger first assisted step, manager validates.",
    "- Decision Log + monthly ROI proof (audit-ready format).",
    "- Read-only start on existing exports/APIs.",
    "- Not a tool replacement project (ERP/scheduling/BI).",
    "- Month 1 offered: historical audit (read-only).",
    "",
    section("Core FR", [
      `${BASE_URL}/fr`,
      `${BASE_URL}/fr/${localizedSlugs.pilot.fr}`,
      `${BASE_URL}/fr/pilot-protocol`,
      `${BASE_URL}/fr/${localizedSlugs.contact.fr}`,
      `${BASE_URL}/fr/${localizedSlugs.resources.fr}`,
    ]),
    section("Core EN", [
      `${BASE_URL}/en`,
      `${BASE_URL}/en/${localizedSlugs.pilot.en}`,
      `${BASE_URL}/en/pilot-protocol`,
      `${BASE_URL}/en/${localizedSlugs.contact.en}`,
      `${BASE_URL}/en/${localizedSlugs.resources.en}`,
    ]),
    section("FR content", fr),
    section("EN content", en),
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
