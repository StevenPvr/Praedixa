import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Parametres page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/parametres");

    await expect(
      page.getByRole("heading", { name: "Parametres", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Gestion du compte et preferences utilisateur essentielles."),
    ).toBeVisible();
  });

  test("displays profile section", async ({ page }) => {
    await page.goto("/parametres");

    await expect(page.getByRole("heading", { name: "Profil" })).toBeVisible();
    await expect(page.getByText("Email")).toBeVisible();
    await expect(page.getByText("Role")).toBeVisible();
    await expect(page.getByText("Organisation")).toBeVisible();
  });

  test("language switch is available", async ({ page }) => {
    await page.goto("/parametres");

    const languageSelect = page.locator("select").filter({ hasText: "Francais" });
    await expect(languageSelect).toBeVisible();
    await languageSelect.selectOption("en");
    await expect(languageSelect).toHaveValue("en");
  });

  test("notifications checkbox is persisted in localStorage", async ({ page }) => {
    await page.goto("/parametres");

    const checkbox = page.getByLabel("Alertes critiques uniquement");
    await expect(checkbox).toBeVisible();
    await checkbox.uncheck();

    await expect
      .poll(() =>
        page.evaluate(
          () => window.localStorage.getItem("praedixa_notifications_critical_only"),
        ),
      )
      .toBe("0");
  });
});
