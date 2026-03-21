import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import { mockAdminShellApis } from "./fixtures/api-mocks";

test.describe("Sidebar navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
    await mockAdminShellApis(page);
  });

  test("sidebar exposes the current global navigation", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    await expect(
      nav.getByRole("link", { name: "Accueil", exact: true }).first(),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Clients", exact: true }).first(),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Demandes contact", exact: true }).first(),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Journal", exact: true }).first(),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Parametres", exact: true }).first(),
    ).toBeVisible();
  });

  test("logo Praedixa and Admin badge visible", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator("[data-sidebar]");
    await expect(sidebar.getByText("Praedixa", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("Admin", { exact: true })).toBeVisible();
  });

  test("navigate to / shows Accueil heading", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Accueil", level: 1 }),
    ).toBeVisible();
  });

  test("navigate to /clients shows Clients heading", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    await nav.getByRole("link", { name: "Clients", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Clients", level: 1 }),
    ).toBeVisible();
  });

  test("navigate to /journal shows Journal heading", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    await nav.getByRole("link", { name: "Journal", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Journal", level: 1 }),
    ).toBeVisible();
  });

  test("navigate to /parametres shows Parametres heading", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    await nav.getByRole("link", { name: "Parametres", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Parametres", level: 1 }),
    ).toBeVisible();
  });

  test("active item has aria-current=page", async ({ page }) => {
    await page.goto("/clients");
    const nav = page.locator('nav[aria-label="Navigation admin"]');
    const clientsLink = nav.getByRole("link", { name: "Clients" });
    await expect(clientsLink).toHaveAttribute("aria-current", "page");
  });
});
