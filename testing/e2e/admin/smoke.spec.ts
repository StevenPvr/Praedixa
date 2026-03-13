import { test, expect } from "./fixtures/coverage";
test.describe("Admin smoke", () => {
  test("login page exposes the OIDC entrypoint", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Console Admin Praedixa")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuer vers la connexion" }),
    ).toBeVisible();
  });

  test("protected admin route redirects to login without a session", async ({
    page,
  }) => {
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(
      page.getByRole("button", { name: "Continuer vers la connexion" }),
    ).toBeVisible();
  });
});
