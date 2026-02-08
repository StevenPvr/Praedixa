import { test as base, expect } from "@playwright/test";
import { addCoverageReport } from "monocart-reporter";

/**
 * Playwright fixture that collects V8 code coverage when COVERAGE=1.
 *
 * Uses Playwright's built-in page.coverage API (Chromium only) which
 * returns entries WITH source text — required by monocart-reporter to
 * calculate line/branch/function/statement metrics.
 *
 * Usage: import { test, expect } from "../fixtures/coverage" instead of
 * "@playwright/test" in spec files that need coverage collection.
 *
 * When COVERAGE is not set, this is a zero-overhead pass-through.
 */

const COVERAGE_ENABLED = process.env.COVERAGE === "1";

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    if (COVERAGE_ENABLED) {
      await Promise.all([
        page.coverage.startJSCoverage({ resetOnNavigation: false }),
        page.coverage.startCSSCoverage({ resetOnNavigation: false }),
      ]);
    }

    await use(page);

    if (COVERAGE_ENABLED) {
      const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage(),
      ]);

      const coverageList = [
        ...jsCoverage.filter(
          (entry) =>
            entry.url.startsWith("http://localhost:") &&
            !entry.url.includes("__nextjs") &&
            !entry.url.includes("_next/static/chunks/webpack"),
        ),
        ...cssCoverage.filter((entry) =>
          entry.url.startsWith("http://localhost:"),
        ),
      ];

      if (coverageList.length > 0) {
        await addCoverageReport(coverageList, testInfo);
      }
    }
  },
});

export { expect };
