import { test, expect } from "@playwright/test";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Authenticated navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("sidebar navigation links work between pages", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for dashboard to load
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    // Navigate to Donnees via sidebar
    const nav = page.getByLabel("Navigation principale");
    await nav.getByText("Donnees").click();
    await expect(page).toHaveURL(/\/donnees/);
    await expect(
      page.getByRole("heading", { name: "Donnees", level: 1 }),
    ).toBeVisible();

    // Navigate to Decisions via sidebar
    await nav.getByText("Decisions").click();
    await expect(page).toHaveURL(/\/decisions/);
    await expect(
      page.getByRole("heading", { name: "Decisions", level: 1 }),
    ).toBeVisible();

    // Navigate to Arbitrage via sidebar
    await nav.getByText("Arbitrage").click();
    await expect(page).toHaveURL(/\/arbitrage/);
    await expect(
      page.getByRole("heading", { name: "Arbitrage", level: 1 }),
    ).toBeVisible();

    // Navigate back to Dashboard
    await nav.getByText("Dashboard").click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });

  test("active page has amber indicator in sidebar", async ({ page }) => {
    await page.goto("/dashboard");

    const nav = page.getByLabel("Navigation principale");
    await expect(nav).toBeVisible();

    // Dashboard link should have aria-current="page"
    const dashboardLink = nav.getByRole("link", { name: "Dashboard" });
    await expect(dashboardLink).toHaveAttribute("aria-current", "page");

    // Navigate to Donnees and check the indicator moves
    await nav.getByText("Donnees").click();
    await expect(page).toHaveURL(/\/donnees/);

    const donneesLink = nav.getByRole("link", { name: "Donnees" });
    await expect(donneesLink).toHaveAttribute("aria-current", "page");

    // Dashboard should no longer be current
    const dashLink = nav.getByRole("link", { name: "Dashboard" });
    await expect(dashLink).not.toHaveAttribute("aria-current", "page");
  });

  test("invalid route shows 404 not-found page", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");

    // The not-found page should show 404
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page introuvable")).toBeVisible();

    // Should have a link back to dashboard
    await expect(
      page.getByRole("link", { name: "Retour au dashboard" }),
    ).toBeVisible();
  });

  test("page titles are correct for each section", async ({ page }) => {
    const pageTitles: Array<{ url: string; title: string }> = [
      { url: "/dashboard", title: "Dashboard" },
      { url: "/donnees", title: "Donnees" },
      { url: "/previsions", title: "Previsions" },
      { url: "/arbitrage", title: "Arbitrage" },
      { url: "/decisions", title: "Decisions" },
    ];

    for (const { url, title } of pageTitles) {
      await page.goto(url);
      await expect(
        page.getByRole("heading", { name: title, level: 1 }),
      ).toBeVisible();
    }
  });
});
