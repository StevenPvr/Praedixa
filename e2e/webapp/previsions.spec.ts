import { test, expect } from "@playwright/test";
import { setupAuth } from "./fixtures/auth";
import {
  mockForecasts,
  mockDailyForecasts,
  mockSites,
} from "./fixtures/api-mocks";

test.describe("Previsions page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockForecasts(page);
    await mockDailyForecasts(page);
    await mockSites(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/previsions");
    await expect(
      page.getByRole("heading", { name: "Previsions", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Previsions de capacite humaine et marchandise"),
    ).toBeVisible();
  });

  test("displays the dimension filter bar", async ({ page }) => {
    await page.goto("/previsions");

    // Filter bar with dimension toggle
    await expect(page.getByText("Dimension")).toBeVisible();
    await expect(page.getByRole("button", { name: "Humaine" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Marchandise" }),
    ).toBeVisible();
  });

  test("displays risk cards section", async ({ page }) => {
    await page.goto("/previsions");

    const riskSection = page.getByLabel("Risques par departement");
    await expect(riskSection).toBeVisible();
    await expect(
      riskSection.getByRole("heading", { name: "Risques par departement" }),
    ).toBeVisible();
  });

  test("risk cards show risk level labels (Faible/Moyen/Eleve)", async ({
    page,
  }) => {
    await page.goto("/previsions");

    const riskSection = page.getByLabel("Risques par departement");
    await expect(riskSection).toBeVisible();

    // Should show risk cards with labels — at least one card with a risk label
    const riskLabels = riskSection.getByText(/Risque (Faible|Moyen|Eleve)/);
    const count = await riskLabels.count();
    expect(count).toBeGreaterThan(0);
  });

  test("risk cards are clickable links to dimension detail", async ({
    page,
  }) => {
    await page.goto("/previsions");

    const riskSection = page.getByLabel("Risques par departement");
    await expect(riskSection).toBeVisible();

    // Risk cards should be links
    const links = riskSection.getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    // All links should point to /previsions/humaine (default dimension)
    const firstHref = await links.first().getAttribute("href");
    expect(firstHref).toBe("/previsions/humaine");
  });

  test("clicking Marchandise dimension changes link targets", async ({
    page,
  }) => {
    await page.goto("/previsions");

    // Click Marchandise filter
    await page.getByRole("button", { name: "Marchandise" }).click();

    // Wait for the risk section to update
    const riskSection = page.getByLabel("Risques par departement");

    // Links should now point to /previsions/marchandise
    const links = riskSection.getByRole("link");
    // Wait for at least one link
    await expect(links.first()).toBeVisible();
    const firstHref = await links.first().getAttribute("href");
    expect(firstHref).toBe("/previsions/marchandise");
  });

  test("clicking a risk card navigates to dimension detail page", async ({
    page,
  }) => {
    await page.goto("/previsions");

    const riskSection = page.getByLabel("Risques par departement");
    await expect(riskSection).toBeVisible();

    // Click on the first risk card
    await riskSection.getByRole("link").first().click();

    // Should navigate to the dimension detail page
    await expect(page).toHaveURL(/\/previsions\/humaine/);
  });
});
