import { test, expect } from "./fixtures/coverage";

test.describe("Login page error handling", () => {
  test("displays reauth banner when reauth=1 query param is set", async ({
    page,
  }) => {
    await page.goto("/login?reauth=1");

    await expect(
      page.getByText(
        "Session expiree ou droits insuffisants. Veuillez vous reconnecter.",
      ),
    ).toBeVisible();
  });

  test("displays error message on invalid credentials", async ({ page }) => {
    // Override fetch to intercept Supabase signInWithPassword
    await page.addInitScript(() => {
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : "";
        if (url.includes("/auth/v1/token")) {
          return new Response(
            JSON.stringify({
              error: "invalid_grant",
              error_description: "Invalid login credentials",
              message: "Invalid login credentials",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        return origFetch(input, init);
      };
    });

    await page.goto("/login");

    // Fill and submit the form
    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Mot de passe").fill("wrongpassword");
    await page.getByRole("button", { name: "Se connecter" }).click();

    // Error message should appear
    await expect(page.getByText("Invalid login credentials")).toBeVisible();
  });

  test("shows loading state during login submission", async ({ page }) => {
    // Override fetch with delay to capture loading state
    await page.addInitScript(() => {
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : "";
        if (url.includes("/auth/v1/token")) {
          await new Promise((r) => setTimeout(r, 3000));
          return new Response(
            JSON.stringify({
              error: "invalid_grant",
              error_description: "Invalid login credentials",
              message: "Invalid login credentials",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        return origFetch(input, init);
      };
    });

    await page.goto("/login");

    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Mot de passe").fill("password");
    await page.getByRole("button", { name: "Se connecter" }).click();

    // Button should show loading text
    await expect(
      page.getByRole("button", { name: "Connexion..." }),
    ).toBeVisible({ timeout: 5000 });
    // Button should be disabled
    await expect(
      page.getByRole("button", { name: "Connexion..." }),
    ).toBeDisabled();
  });

  test("handles session validation failure after successful auth", async ({
    page,
  }) => {
    // Override fetch: password grant returns expired session, refresh grant fails
    await page.addInitScript(() => {
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : "";
        if (url.includes("/auth/v1/token")) {
          if (url.includes("grant_type=refresh_token")) {
            return new Response(
              JSON.stringify({
                error: "invalid_grant",
                error_description: "Token has been revoked",
                message: "Token has been revoked",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }
          return new Response(
            JSON.stringify({
              access_token: "mock-expired-token",
              token_type: "bearer",
              expires_in: 0,
              expires_at: 0,
              refresh_token: "mock-refresh",
              user: {
                id: "user-1",
                aud: "authenticated",
                role: "authenticated",
                email: "test@example.com",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return origFetch(input, init);
      };
    });

    await page.goto("/login");

    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Mot de passe").fill("password");
    await page.getByRole("button", { name: "Se connecter" }).click();

    // Should show session invalid error
    await expect(
      page.getByText("Session invalide. Veuillez reessayer."),
    ).toBeVisible({ timeout: 10000 });
  });

  test("login form requires email and password fields", async ({ page }) => {
    await page.goto("/login");

    // Both inputs have required attribute
    const emailInput = page.getByLabel("Email");
    const passwordInput = page.getByLabel("Mot de passe");

    await expect(emailInput).toHaveAttribute("required", "");
    await expect(passwordInput).toHaveAttribute("required", "");
  });

  test("login page subtitle is displayed", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Connectez-vous a votre espace")).toBeVisible();
  });
});
