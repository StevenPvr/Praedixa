import { readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isKnownAiCrawler,
  listLandingExposurePolicyRules,
  resolveLandingExposurePolicy,
  shouldBlockLandingAiCrawler,
} from "../exposure-policy";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(CURRENT_DIR, "../../../app");
const ROUTE_FILE_SUFFIXES = [
  "/page.tsx",
  "/route.ts",
  "/robots.ts",
  "/sitemap.ts",
] as const;

function walkFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath));
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

function toRoutePathname(absoluteFilePath: string): string {
  const relativePath = relative(APP_DIR, absoluteFilePath).replaceAll(
    "\\",
    "/",
  );

  if (relativePath === "page.tsx") {
    return "/";
  }

  if (relativePath === "robots.ts") {
    return "/robots.txt";
  }

  if (relativePath === "sitemap.ts") {
    return "/sitemap.xml";
  }

  if (relativePath.endsWith("/page.tsx")) {
    const pathname =
      "/" +
      relativePath.replace(/\/page\.tsx$/, "").replaceAll(/\[(.+?)\]/g, ":$1");
    return pathname;
  }

  if (relativePath.endsWith("/route.ts")) {
    return (
      "/" +
      relativePath.replace(/\/route\.ts$/, "").replaceAll(/\[(.+?)\]/g, ":$1")
    );
  }

  throw new Error(`Unsupported route file: ${absoluteFilePath}`);
}

describe("landing exposure policy", () => {
  it("keeps a versioned rule catalog", () => {
    expect(listLandingExposurePolicyRules().length).toBeGreaterThan(10);
  });

  it("classifies every page/route surface under app/", () => {
    const routeFiles = walkFiles(APP_DIR)
      .filter((file) =>
        ROUTE_FILE_SUFFIXES.some((suffix) =>
          file.replaceAll("\\", "/").endsWith(suffix),
        ),
      )
      .sort();

    expect(routeFiles.length).toBeGreaterThan(0);

    for (const file of routeFiles) {
      const pathname = toRoutePathname(file);
      expect(resolveLandingExposurePolicy(pathname), pathname).not.toBeNull();
    }
  });

  it("allows known AI crawlers on GEO pages but keeps signed assets protected", () => {
    expect(isKnownAiCrawler("GPTBot/1.0")).toBe(true);
    expect(isKnownAiCrawler("Googlebot/2.1")).toBe(true);
    expect(isKnownAiCrawler("MistralAI-User/1.0")).toBe(true);
    expect(shouldBlockLandingAiCrawler("/fr", "GPTBot/1.0").blocked).toBe(
      false,
    );
    expect(shouldBlockLandingAiCrawler("/fr", "Googlebot/2.1").blocked).toBe(
      false,
    );
    expect(
      shouldBlockLandingAiCrawler(
        "/fr/ressources/cout-sous-couverture/asset",
        "MistralAI-User/1.0",
      ).blocked,
    ).toBe(true);
  });

  it("marks signed resource assets as non-indexable P1 content", () => {
    const policy = resolveLandingExposurePolicy(
      "/fr/ressources/cout-sous-couverture/asset",
    );

    expect(policy).not.toBeNull();
    expect(policy?.classification).toBe("P1");
    expect(policy?.access).toBe("signed");
    expect(policy?.indexable).toBe(false);
  });
});
