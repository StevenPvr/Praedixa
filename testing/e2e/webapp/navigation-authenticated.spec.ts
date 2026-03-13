import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Authenticated navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("sidebar navigation links work between existing pages", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Priorites du jour" }),
    ).toBeVisible();

    const nav = page.getByLabel("Navigation principale");

    await nav.getByRole("link", { name: /Previsions/ }).click();
    await expect(page).toHaveURL(/\/previsions$/);
    await expect(
      page.getByRole("heading", { name: "Previsions 7 jours" }),
    ).toBeVisible();

    await nav.getByRole("link", { name: /Actions/ }).click();
    await expect(page).toHaveURL(/\/actions$/);
    await expect(
      page.getByRole("heading", { name: "Centre Actions" }),
    ).toBeVisible();

    await nav.getByRole("link", { name: /Support/ }).click();
    await expect(page).toHaveURL(/\/messages$/);
    await expect(
      page.getByRole("heading", { name: "Messagerie support" }),
    ).toBeVisible();
  });

  test("active page has aria-current indicator in sidebar", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const nav = page.getByLabel("Navigation principale");
    await expect(nav.getByRole("link", { name: /Accueil/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.goto("/parametres");
    await expect(nav.getByRole("link", { name: /Reglages/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      nav.getByRole("link", { name: /Accueil/ }),
    ).not.toHaveAttribute("aria-current", "page");
  });

  test("invalid route redirects authenticated users to dashboard", async ({
    page,
  }) => {
    await page.goto("/this-page-does-not-exist");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Priorites du jour" }),
    ).toBeVisible();
  });

  test("page headings are correct for active sections", async ({ page }) => {
    const sections: Array<{ url: string; heading: string }> = [
      { url: "/dashboard", heading: "Priorites du jour" },
      { url: "/previsions", heading: "Previsions 7 jours" },
      { url: "/actions", heading: "Centre Actions" },
      { url: "/messages", heading: "Messagerie support" },
      { url: "/parametres", heading: "Parametres" },
    ];

    for (const section of sections) {
      await page.goto(section.url);
      await expect(
        page.getByRole("heading", { name: section.heading, level: 1 }),
      ).toBeVisible();
    }
  });
});
