import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Actions page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("displays page heading and subtitle", async ({ page }) => {
    await page.goto("/actions");
    const main = page.getByRole("main");

    await expect(
      page.getByRole("heading", { name: "Centre Actions" }),
    ).toBeVisible();
    await expect(
      main.getByText(
        "Validez les decisions recommandees puis suivez leur historique.",
      ),
    ).toBeVisible();
  });

  test("displays alerts and recommendation sections", async ({ page }) => {
    await page.goto("/actions");

    await expect(page.getByRole("heading", { name: "Alertes" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Diagnostic" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Options recommandees" }),
    ).toBeVisible();
  });

  test("validating a selected option resets to disabled state", async ({
    page,
  }) => {
    await page.goto("/actions");

    const validateButton = page.getByRole("button", {
      name: "Valider la decision",
    });

    await page
      .getByRole("button", { name: /interim/i })
      .first()
      .click();
    await expect(validateButton).toBeEnabled();

    await validateButton.click();
    await expect(validateButton).toBeDisabled();
  });

  test("error state shows workspace error message", async ({ page }) => {
    await page.route("**/api/v1/**decision-workspace/*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur interne du serveur",
          },
        }),
      }),
    );

    await page.goto("/actions");
    await expect(page.getByText("Erreur interne du serveur")).toBeVisible();
  });
});
