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

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const coverageEnabled =
      process.env.COVERAGE === "1" ||
      testInfo.config.metadata?.coverageEnabled === true;

    if (coverageEnabled) {
      await Promise.all([
        page.coverage.startJSCoverage({ resetOnNavigation: false }),
        page.coverage.startCSSCoverage({ resetOnNavigation: false }),
      ]);
    }

    await use(page);

    if (coverageEnabled) {
      const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage(),
      ]);

      const isLocalUrl = (url: string): boolean =>
        url.startsWith("http://localhost:") ||
        url.startsWith("http://127.0.0.1:") ||
        url.startsWith("http://[::1]:") ||
        url.startsWith("http://0.0.0.0:");

      const isCoverageHarnessUrl = (url: string): boolean =>
        /\/coverage-harness(?:[/?#]|$)/.test(url);

      // Keep the coverage scope deterministic: only dedicated harness routes.
      const coverageList = [
        ...jsCoverage.filter(
          (entry) =>
            isLocalUrl(entry.url) &&
            isCoverageHarnessUrl(entry.url) &&
            !entry.url.includes("__nextjs") &&
            !entry.url.includes("_next/static/chunks/webpack"),
        ),
        ...cssCoverage.filter(
          (entry) => isLocalUrl(entry.url) && isCoverageHarnessUrl(entry.url),
        ),
      ];

      if (coverageList.length > 0) {
        await addCoverageReport(coverageList, testInfo);
      }
    }
  },
});

export { expect };
