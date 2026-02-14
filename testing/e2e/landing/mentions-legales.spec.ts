import { test, expect } from "@playwright/test";

test.describe("Mentions legales page", () => {
  test("displays page title", async ({ page }) => {
    await page.goto("/fr/mentions-legales");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Mentions",
    );
  });

  test("has back link to home", async ({ page }) => {
    await page.goto("/fr/mentions-legales");
    const backLink = page.getByText("Retour");
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/");
  });

  test("displays legal sections", async ({ page }) => {
    await page.goto("/fr/mentions-legales");
    await expect(page.getByRole("heading", { name: /diteur/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /bergement/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Propri.*intellectuelle/ }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Cookies/ })).toBeVisible();
  });

  test("mentions Cloudflare as host", async ({ page }) => {
    await page.goto("/fr/mentions-legales");
    await expect(page.getByText(/Cloudflare/)).toBeVisible();
  });
});
