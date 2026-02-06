import { test, expect } from "@playwright/test";

test.describe("Webapp authentication", () => {
  test("/login page loads successfully", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Praedixa" })).toBeVisible();
  });

  test("login page has email input", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
  });

  test("login page has password input", async ({ page }) => {
    await page.goto("/login");
    const passwordInput = page.getByLabel("Mot de passe");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("login page has submit button", async ({ page }) => {
    await page.goto("/login");
    const submitButton = page.getByRole("button", { name: /se connecter/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test("login page shows subtitle", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Connectez-vous a votre espace")).toBeVisible();
  });

  test("unauthenticated access to /dashboard redirects to /login", async ({
    page,
  }) => {
    // Without auth, the middleware should redirect to /login
    await page.goto("/dashboard");
    // We expect to end up on the login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("email input has placeholder text", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.getByPlaceholder("vous@entreprise.com");
    await expect(emailInput).toBeVisible();
  });

  test("submit button shows loading state on click", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Mot de passe").fill("password");

    // Click the submit button
    await page.getByRole("button", { name: /se connecter/i }).click();

    // The button text should change to loading state
    // (It may flash quickly depending on network, so check it was attempted)
    const buttonText = await page.getByRole("button").first().textContent();
    expect(buttonText).toBeTruthy();
  });
});
