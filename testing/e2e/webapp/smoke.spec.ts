import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import {
  mockAllApis,
  spyOperationalDecisionSubmission,
} from "./fixtures/api-mocks";

test.describe("Webapp smoke", () => {
  test("login page exposes the OIDC-only entrypoint and preserves a safe next path", async ({
    page,
  }) => {
    await page.route("**/auth/login**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "ok",
      }),
    );

    await page.goto("/login?next=/actions");

    await expect(
      page.getByRole("heading", { name: "Connexion securisee" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuer vers la connexion" }),
    ).toBeVisible();
    await expect(page.getByLabel(/Email/)).toHaveCount(0);
    await expect(page.getByLabel("Mot de passe")).toHaveCount(0);

    await page
      .getByRole("button", { name: "Continuer vers la connexion" })
      .click();

    await expect(page).toHaveURL(/\/auth\/login\?next=%2Factions/);
  });

  test("protected dashboard redirects to login without a signed session", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(
      page.getByRole("heading", { name: "Connexion securisee" }),
    ).toBeVisible();
  });

  test("signed org_admin session can navigate from dashboard to actions", async ({
    page,
  }) => {
    await setupAuth(page);
    await mockAllApis(page);

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Priorites du jour" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Ouvrir Actions" }).click();
    await expect(page).toHaveURL(/\/actions$/);
    await expect(
      page.getByRole("heading", { name: "Centre Actions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Options recommandees" }),
    ).toBeVisible();
  });

  test("signed org_admin session submits the production operational decision contract", async ({
    page,
  }) => {
    await setupAuth(page);
    await mockAllApis(page);
    const submissionSpy = await spyOperationalDecisionSubmission(page);

    await page.goto("/actions");
    await page
      .getByRole("button", { name: /interim/i })
      .first()
      .click();
    await page.getByRole("button", { name: "Valider la decision" }).click();

    await expect(
      page.getByRole("button", { name: "Valider la decision" }),
    ).toBeDisabled();

    const payload = await submissionSpy.waitForSubmission();
    expect(payload).toMatchObject({
      alertId: expect.any(String),
      optionId: expect.any(String),
    });
    expect(Object.keys(payload).sort()).toEqual(["alertId", "optionId"]);
  });
});
