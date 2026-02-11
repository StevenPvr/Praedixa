import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

type DeviceKind = "desktop" | "mobile";

interface RouteAuditConfig {
  path: string;
  slug: string;
  heading: string | RegExp;
}

interface FocusProbe {
  step: number;
  target: string;
  indicator: "none" | "outline" | "box-shadow" | "underline";
}

interface FocusAudit {
  passed: boolean;
  probes: FocusProbe[];
}

interface ContrastSample {
  target: string;
  text: string;
  ratio: number;
  minimum: number;
}

interface ContrastAudit {
  checked: number;
  lowestRatio: number;
  warningFailures: number;
  criticalFailures: number;
  samples: ContrastSample[];
}

interface ChecklistRow {
  device: DeviceKind;
  route: string;
  heading: string;
  screenshot: string;
  focusStatus: "OK" | "FAIL";
  contrastStatus: "OK" | "WARN" | "CRITICAL";
  notes: string;
}

const AUTH_ROUTES: RouteAuditConfig[] = [
  {
    path: "/dashboard",
    slug: "dashboard",
    heading: "War room operationnelle",
  },
  {
    path: "/actions",
    slug: "actions",
    heading: /Centre de traitement|Treatment center/i,
  },
  {
    path: "/previsions",
    slug: "previsions",
    heading: "Anticipation des tensions",
  },
  {
    path: "/donnees",
    slug: "donnees",
    heading: "Referentiel operationnel",
  },
  {
    path: "/rapports",
    slug: "rapports",
    heading: "Rapports board-ready",
  },
  {
    path: "/messages",
    slug: "messages",
    heading: "Support strategique",
  },
  {
    path: "/parametres",
    slug: "parametres",
    heading: "Gouvernance et reglages",
  },
];

const LOGIN_ROUTE: RouteAuditConfig = {
  path: "/login",
  slug: "login",
  heading: "Connexion securisee",
};

const OUTPUT_ROOT = path.join(process.cwd(), "test-results", "visual-qa");
const checklistRows: ChecklistRow[] = [];

function toRelative(filePath: string): string {
  const relative = path.relative(process.cwd(), filePath);
  return relative.length > 0 ? relative : filePath;
}

async function mockLiveApiAliases(page: Page): Promise<void> {
  await page.route("**/api/v1/live/**", (route) => {
    const url = new URL(route.request().url());
    const rewrittenPath = url.pathname.replace("/api/v1/live", "/api/v1");
    const rewrittenUrl = `${url.origin}${rewrittenPath}${url.search}`;
    return route.fallback({ url: rewrittenUrl });
  });
}

async function auditFocusVisibility(page: Page): Promise<FocusAudit> {
  const probes: FocusProbe[] = [];
  for (let step = 1; step <= 4; step += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(40);
    const probe = await page.evaluate((currentStep) => {
      const active = document.querySelector<HTMLElement>(":focus-visible");
      if (!active) {
        return {
          step: currentStep,
          target: "none",
          indicator: "none" as const,
        };
      }

      const style = window.getComputedStyle(active);
      const outlineWidth = Number.parseFloat(style.outlineWidth || "0");
      const hasOutline = outlineWidth >= 1 && style.outlineStyle !== "none";
      const hasShadow = style.boxShadow !== "none";
      const hasUnderline = style.textDecorationLine.includes("underline");

      let indicator: FocusProbe["indicator"] = "none";
      if (hasOutline) indicator = "outline";
      else if (hasShadow) indicator = "box-shadow";
      else if (hasUnderline) indicator = "underline";

      const text = (active.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 48);
      const aria = active.getAttribute("aria-label");
      const tag = active.tagName.toLowerCase();
      const target = `${tag}${aria ? ` [aria-label="${aria}"]` : ""}${text ? ` "${text}"` : ""}`;

      return { step: currentStep, target, indicator };
    }, step);

    probes.push(probe);
  }

  return {
    passed: probes.some((probe) => probe.indicator !== "none"),
    probes,
  };
}

async function auditContrast(page: Page): Promise<ContrastAudit> {
  return page.evaluate(() => {
    type Sample = {
      target: string;
      text: string;
      ratio: number;
      minimum: number;
    };

    function parseColor(
      value: string,
    ): [number, number, number, number] | null {
      const rootStyle = getComputedStyle(document.documentElement);
      const expandedVars = value.replace(
        /var\((--[^),\s]+)(?:,\s*([^)]+))?\)/g,
        (_match, varName: string, fallback?: string) => {
          const resolved = rootStyle.getPropertyValue(varName).trim();
          if (resolved.length > 0) return resolved;
          return fallback?.trim() ?? "";
        },
      );

      const normalizedValue = expandedVars
        .replace(/var\(--tw-(?:bg|text|border)-opacity(?:,\s*[^)]+)?\)/g, "1")
        .replace(/var\(--tw-[^)]+(?:,\s*[^)]+)?\)/g, "1");

      const probe = document.createElement("span");
      const sentinel = "rgb(1, 2, 3)";
      probe.style.color = sentinel;
      probe.style.color = normalizedValue;
      probe.style.position = "fixed";
      probe.style.left = "-9999px";
      probe.style.top = "-9999px";
      probe.style.pointerEvents = "none";
      document.body.appendChild(probe);
      const normalized = getComputedStyle(probe).color;
      probe.remove();

      if (normalized === sentinel && value.toLowerCase().trim() !== sentinel) {
        return null;
      }

      const match = normalized.match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1]
        .split(",")
        .map((part) => Number.parseFloat(part.trim()));
      if (parts.length < 3 || parts.some((part) => Number.isNaN(part)))
        return null;
      const alpha =
        parts.length >= 4 && Number.isFinite(parts[3]) ? parts[3] : 1;
      return [parts[0], parts[1], parts[2], alpha];
    }

    function blend(
      fg: [number, number, number],
      alpha: number,
      bg: [number, number, number],
    ): [number, number, number] {
      return [
        fg[0] * alpha + bg[0] * (1 - alpha),
        fg[1] * alpha + bg[1] * (1 - alpha),
        fg[2] * alpha + bg[2] * (1 - alpha),
      ];
    }

    function resolveBackground(
      element: HTMLElement,
    ): [number, number, number] | null {
      let current: HTMLElement | null = element;
      while (current) {
        const style = getComputedStyle(current);
        if (
          style.backgroundImage !== "none" &&
          parseColor(style.backgroundColor)?.[3] === 0
        ) {
          return null;
        }

        const color = parseColor(style.backgroundColor);
        if (color && color[3] > 0) {
          if (color[3] >= 0.999) {
            return [color[0], color[1], color[2]];
          }
          return blend(
            [color[0], color[1], color[2]],
            color[3],
            [255, 255, 255],
          );
        }
        current = current.parentElement;
      }
      return [255, 255, 255];
    }

    function srgbToLinear(channel: number): number {
      const normalized = channel / 255;
      if (normalized <= 0.04045) return normalized / 12.92;
      return ((normalized + 0.055) / 1.055) ** 2.4;
    }

    function relativeLuminance(rgb: [number, number, number]): number {
      const [r, g, b] = rgb;
      return (
        0.2126 * srgbToLinear(r) +
        0.7152 * srgbToLinear(g) +
        0.0722 * srgbToLinear(b)
      );
    }

    function contrastRatio(
      a: [number, number, number],
      b: [number, number, number],
    ): number {
      const l1 = relativeLuminance(a);
      const l2 = relativeLuminance(b);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function targetLabel(element: HTMLElement, text: string): string {
      const tag = element.tagName.toLowerCase();
      const aria = element.getAttribute("aria-label");
      return `${tag}${aria ? ` [aria-label="${aria}"]` : ""}${text ? ` "${text.slice(0, 36)}"` : ""}`;
    }

    const scope = document.querySelector("main") ?? document.body;
    const candidates = Array.from(
      scope.querySelectorAll<HTMLElement>(
        "h1, h2, h3, p, span, a, button, label, li, td, th",
      ),
    );

    let checked = 0;
    let warningFailures = 0;
    let criticalFailures = 0;
    let lowestRatio = Number.POSITIVE_INFINITY;
    const failures: Sample[] = [];

    for (const element of candidates) {
      if (checked >= 36) break;
      const rect = element.getBoundingClientRect();
      if (
        rect.width < 2 ||
        rect.height < 2 ||
        rect.right <= 0 ||
        rect.left >= window.innerWidth ||
        rect.bottom <= 0 ||
        rect.top >= window.innerHeight
      ) {
        continue;
      }

      const style = getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number.parseFloat(style.opacity || "1") < 0.85
      ) {
        continue;
      }

      const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
      if (text.length < 3) continue;

      const textColor = parseColor(style.color);
      if (!textColor) continue;

      const background = resolveBackground(element);
      if (!background) continue;
      const fgRgb =
        textColor[3] < 1
          ? blend(
              [textColor[0], textColor[1], textColor[2]],
              textColor[3],
              background,
            )
          : ([textColor[0], textColor[1], textColor[2]] as [
              number,
              number,
              number,
            ]);

      const ratio = contrastRatio(fgRgb, background);
      checked += 1;
      if (ratio < lowestRatio) lowestRatio = ratio;

      const fontSizePx = Number.parseFloat(style.fontSize || "16");
      const fontWeight = Number.parseInt(style.fontWeight || "400", 10);
      const isLargeText =
        fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
      const minimum = isLargeText ? 3 : 4.5;

      if (ratio < minimum) {
        warningFailures += 1;
        if (ratio < 3) criticalFailures += 1;
        failures.push({
          target: targetLabel(element, text),
          text: text.slice(0, 72),
          ratio,
          minimum,
        });
      }
    }

    const samples = failures
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 5)
      .map((sample) => ({
        ...sample,
        ratio: Number(sample.ratio.toFixed(2)),
        minimum: Number(sample.minimum.toFixed(2)),
      }));

    return {
      checked,
      lowestRatio: Number.isFinite(lowestRatio)
        ? Number(lowestRatio.toFixed(2))
        : 0,
      warningFailures,
      criticalFailures,
      samples,
    };
  });
}

async function auditRoute(
  page: Page,
  route: RouteAuditConfig,
  device: DeviceKind,
): Promise<ChecklistRow> {
  await page.goto(route.path, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: route.heading }),
  ).toBeVisible();
  await page.waitForTimeout(180);

  const focus = await auditFocusVisibility(page);
  const contrast = await auditContrast(page);

  const screenshotDir = path.join(OUTPUT_ROOT, device);
  mkdirSync(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, `${route.slug}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const contrastStatus: ChecklistRow["contrastStatus"] =
    contrast.criticalFailures > 0
      ? "CRITICAL"
      : contrast.warningFailures > 0
        ? "WARN"
        : "OK";
  const notes = [
    `focus:${focus.probes.map((probe) => probe.indicator).join(",")}`,
    `contrast:min=${contrast.lowestRatio} warnings=${contrast.warningFailures} critical=${contrast.criticalFailures}`,
    contrast.samples.length > 0
      ? `sample:${contrast.samples[0].target} ratio=${contrast.samples[0].ratio}/${contrast.samples[0].minimum}`
      : "sample:none",
  ].join(" | ");

  return {
    device,
    route: route.path,
    heading:
      typeof route.heading === "string"
        ? route.heading
        : route.heading.toString(),
    screenshot: toRelative(screenshotPath),
    focusStatus: focus.passed ? "OK" : "FAIL",
    contrastStatus,
    notes,
  };
}

function writeChecklist(rows: ChecklistRow[]): void {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const jsonPath = path.join(OUTPUT_ROOT, "premium-ui-checklist.json");
  const mdPath = path.join(OUTPUT_ROOT, "premium-ui-checklist.md");

  const payload = {
    generatedAt: new Date().toISOString(),
    routesAudited: rows.length,
    rows,
  };
  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  const lines = [
    "# Premium UI Visual QA Checklist",
    "",
    `Generated at: ${payload.generatedAt}`,
    "",
    "| Device | Route | Heading | Screenshot | Focus | Contrast | Notes |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.device} | \`${row.route}\` | ${row.heading} | \`${row.screenshot}\` | ${row.focusStatus} | ${row.contrastStatus} | ${row.notes.replace(/\|/g, "\\|")} |`,
    ),
    "",
  ];

  writeFileSync(mdPath, lines.join("\n"), "utf8");
}

test.describe("Premium visual QA", () => {
  test.describe.configure({ mode: "serial" });

  test("authenticated routes - desktop", async ({ page }) => {
    test.setTimeout(180_000);

    await page.setViewportSize({ width: 1536, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setupAuth(page);
    await mockAllApis(page);
    await mockLiveApiAliases(page);

    for (const route of AUTH_ROUTES) {
      const row = await auditRoute(page, route, "desktop");
      checklistRows.push(row);
    }
  });

  test("authenticated routes - mobile", async ({ page }) => {
    test.setTimeout(180_000);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setupAuth(page);
    await mockAllApis(page);
    await mockLiveApiAliases(page);

    for (const route of AUTH_ROUTES) {
      const row = await auditRoute(page, route, "mobile");
      checklistRows.push(row);
    }
  });

  test("login route - desktop and mobile", async ({ page }) => {
    test.setTimeout(90_000);

    await page.context().clearCookies();
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.setViewportSize({ width: 1536, height: 960 });
    const desktopLogin = await auditRoute(page, LOGIN_ROUTE, "desktop");
    checklistRows.push(desktopLogin);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileLogin = await auditRoute(page, LOGIN_ROUTE, "mobile");
    checklistRows.push(mobileLogin);
  });

  test.afterAll(async () => {
    writeChecklist(checklistRows);
  });
});
