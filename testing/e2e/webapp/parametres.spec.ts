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
    const main = page.getByRole("main");

    await expect(
      page.getByRole("heading", { name: "Parametres", level: 1 }),
    ).toBeVisible();
    await expect(
      main.getByText(
        "Gestion du compte et preferences utilisateur essentielles.",
      ),
    ).toBeVisible();
  });

  test("displays profile section", async ({ page }) => {
    await page.goto("/parametres");
    const main = page.getByRole("main");

    await expect(main.getByRole("heading", { name: "Profil" })).toBeVisible();
    await expect(main.getByText("Email")).toBeVisible();
    await expect(main.getByText("Role")).toBeVisible();
    await expect(main.getByText("Organisation")).toBeVisible();
  });

  test("language switch is available", async ({ page }) => {
    await page.goto("/parametres");
    const main = page.getByRole("main");

    const languageSelect = main.getByRole("combobox", { name: "Langue" });
    await expect(languageSelect).toBeVisible();
    await languageSelect.selectOption("en");
    await expect(languageSelect).toHaveValue("en");
  });

  test("notifications checkbox is persisted in localStorage", async ({
    page,
  }) => {
    await page.goto("/parametres");
    const main = page.getByRole("main");

    const checkbox = main.getByRole("checkbox", {
      name: "Alertes critiques uniquement",
    });
    await expect(checkbox).toBeVisible();
    await checkbox.uncheck();

    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem("praedixa_notifications_critical_only"),
        ),
      )
      .toBe("0");
  });
});
