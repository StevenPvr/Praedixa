import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
] as const;

test.describe("Landing horizontal overflow", () => {
  for (const viewport of VIEWPORTS) {
    test(`has no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/fr");

      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        return {
          docClientWidth: doc.clientWidth,
          docScrollWidth: doc.scrollWidth,
          bodyClientWidth: body.clientWidth,
          bodyScrollWidth: body.scrollWidth,
        };
      });

      expect(metrics.docScrollWidth - metrics.docClientWidth).toBeLessThanOrEqual(1);
      expect(metrics.bodyScrollWidth - metrics.bodyClientWidth).toBeLessThanOrEqual(1);
    });
  }
});
