import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";

test("debug: check where /dashboard redirects", async ({ page }, testInfo) => {
  await setupAuth(page);
  const response = await page.goto("/dashboard");
  console.log("Final URL:", page.url());
  console.log("Response status:", response?.status());
  console.log("Response URL:", response?.url());
  const debugScreenshotPath = testInfo.outputPath("debug-dashboard.png");
  await page.screenshot({ path: debugScreenshotPath });
  // Show page content
  const title = await page.title();
  console.log("Page title:", title);
  const h1 = await page
    .locator("h1")
    .first()
    .textContent()
    .catch(() => "NO H1");
  console.log("H1 content:", h1);
});
