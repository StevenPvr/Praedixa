import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Authenticated navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("sidebar navigation links work between pages", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "War room operationnelle" }),
    ).toBeVisible();

    await page.goto("/donnees");
    await expect(
      page.getByRole("heading", { name: "Référentiel opérationnel", level: 1 }),
    ).toBeVisible();

    await page.goto("/previsions");
    await expect(
      page.getByRole("heading", {
        name: "Anticipation des tensions",
        level: 1,
      }),
    ).toBeVisible();

    await page.goto("/actions");
    await expect(
      page.getByRole("heading", { name: "Centre de traitement", level: 1 }),
    ).toBeVisible();

    const nav = page.getByLabel("Navigation principale");
    await nav.getByRole("link", { name: /Tableau de bord/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: "War room operationnelle" }),
    ).toBeVisible();
  });

  test("active page has aria-current indicator in sidebar", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const nav = page.getByLabel("Navigation principale");
    await expect(nav).toBeVisible();

    const dashboardLink = nav.getByRole("link", { name: /Tableau de bord/ });
    await expect(dashboardLink).toHaveAttribute("aria-current", "page");

    await page.goto("/rapports");
    const rapportsLink = nav.getByRole("link", { name: /Rapports/ });
    await expect(rapportsLink).toHaveAttribute("aria-current", "page");

    const dashLink = nav.getByRole("link", { name: /Tableau de bord/ });
    await expect(dashLink).not.toHaveAttribute("aria-current", "page");
  });

  test("invalid route shows 404 not-found page", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");

    // The not-found page should show 404
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page introuvable")).toBeVisible();

    // Should have a link back to dashboard
    await expect(
      page.getByRole("link", { name: "Retour au tableau de bord" }),
    ).toBeVisible();
  });

  test("page titles are correct for each section", async ({ page }) => {
    const pageTitles: Array<{ url: string; title: string }> = [
      { url: "/dashboard", title: "War room operationnelle" },
      { url: "/donnees", title: "Référentiel opérationnel" },
      { url: "/previsions", title: "Anticipation des tensions" },
      { url: "/actions", title: "Centre de traitement" },
      { url: "/rapports", title: "Rapports board-ready" },
    ];

    for (const { url, title } of pageTitles) {
      await page.goto(url);
      await expect(
        page.getByRole("heading", { name: title, level: 1 }),
      ).toBeVisible();
    }
  });
});
