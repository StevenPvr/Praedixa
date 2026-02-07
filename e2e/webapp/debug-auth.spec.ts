import { test, expect } from "@playwright/test";
import { setupAuth } from "./fixtures/auth";

test("debug: check where /dashboard redirects", async ({ page }) => {
  await setupAuth(page);
  const response = await page.goto("/dashboard");
  console.log("Final URL:", page.url());
  console.log("Response status:", response?.status());
  console.log("Response URL:", response?.url());
  // Take a screenshot
  await page.screenshot({ path: "e2e-debug-dashboard.png" });
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
