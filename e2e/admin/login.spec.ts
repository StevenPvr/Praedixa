import { test, expect } from "./fixtures/coverage";

test.describe("Login page", () => {
  test("displays login form with all elements", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Espace administration")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Se connecter" }),
    ).toBeVisible();
  });

  test("email and password fields have correct types", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("placeholder", "admin@praedixa.com");

    const passwordInput = page.getByLabel("Mot de passe");
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("shows reauth banner when reauth=1 query param", async ({ page }) => {
    await page.goto("/login?reauth=1");

    await expect(
      page.getByText(
        /session expiree ou droits insuffisants/i,
      ),
    ).toBeVisible();
  });

  test("does not show reauth banner normally", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByText(/session expiree/i),
    ).not.toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    // Override fetch to intercept Supabase signInWithPassword
    await page.addInitScript(() => {
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : "";
        if (url.includes("/auth/v1/token")) {
          return new Response(JSON.stringify({
            error: "invalid_grant",
            error_description: "Invalid login credentials",
            message: "Invalid login credentials",
          }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        return origFetch(input, init);
      };
    });

    await page.goto("/login");

    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Mot de passe").fill("wrongpassword");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(
      page.getByText("Invalid login credentials"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows loading state while submitting", async ({ page }) => {
    // Override fetch with delay to capture loading state
    await page.addInitScript(() => {
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : "";
        if (url.includes("/auth/v1/token")) {
          await new Promise(r => setTimeout(r, 3000));
          return new Response(JSON.stringify({
            error: "invalid_grant",
            error_description: "Invalid login credentials",
            message: "Invalid login credentials",
          }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        return origFetch(input, init);
      };
    });

    await page.goto("/login");

    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Mot de passe").fill("password123");
    await page.getByRole("button", { name: "Se connecter" }).click();

    // Button should show "Connexion..." and be disabled
    await expect(
      page.getByRole("button", { name: "Connexion..." }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole("button", { name: "Connexion..." }),
    ).toBeDisabled({ timeout: 5000 });
  });
});
