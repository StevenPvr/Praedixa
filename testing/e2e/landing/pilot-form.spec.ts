import { test, expect } from "@playwright/test";

test.describe("Deployment request form (/fr/deploiement)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/contact/challenge", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          captchaA: 2,
          captchaB: 3,
          challengeToken: "test-challenge",
        }),
      });
    });

    await page.goto("/fr/deploiement");
  });

  test("loads the deployment form page", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/fr\/contact\?intent=deploiement$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /cadrer un premier périmètre de décision/i,
      { timeout: 15_000 },
    );
  });

  test("shows required qualification fields", async ({ page }) => {
    await expect(page.getByLabel(/Entreprise/)).toBeVisible();
    await expect(page.getByLabel(/Fonction/)).toBeVisible();
    await expect(page.getByLabel(/Email professionnel/)).toBeVisible();
    await expect(page.getByLabel(/Nombre de sites/)).toBeVisible();
    await expect(page.getByLabel(/Secteur/)).toBeVisible();
    await expect(page.getByLabel(/Horizon projet/)).toBeVisible();
    await expect(
      page.getByLabel(/Arbitrage principal à objectiver/i),
    ).toBeVisible();
  });

  test("submit button stays disabled until form is complete", async ({
    page,
  }) => {
    const submit = page.getByRole("button", { name: /envoyer la demande/i });
    await expect(submit).toBeDisabled();

    await page.getByLabel(/Entreprise/).fill("Atlas Logistics");
    await expect(submit).toBeDisabled();
  });

  test("submits successfully when required fields are complete", async ({
    page,
  }) => {
    await page.route("**/api/contact", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      expect(body.companyName).toBe("Atlas Logistics");
      expect(body.role).toBe("COO");
      expect(body.email).toBe("camille@atlas.fr");
      expect(body.siteCount).toBe("4-10");
      expect(body.intent).toBe("deployment");
      expect(body.captchaAnswer).toBe(5);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.getByLabel(/Entreprise/).fill("Atlas Logistics");
    await page.getByLabel(/Fonction/).fill("COO");
    await page.getByLabel(/Email professionnel/).fill("camille@atlas.fr");
    await page.getByLabel(/Nombre de sites/).selectOption("4-10");
    await page
      .getByLabel(/Secteur/)
      .selectOption({ label: "Logistique / Transport / Retail" });
    await page.getByLabel(/Horizon projet/).selectOption("0-3 mois");
    await page
      .getByLabel(/Arbitrage principal à objectiver/i)
      .fill(
        "Nous devons anticiper les tensions de couverture entre nos principaux sites.",
      );
    await page.locator("#contact-captcha").fill("5");

    const checkbox = page.locator("#contact-consent");
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    const submitButton = page.getByRole("button", {
      name: /envoyer la demande/i,
    });
    await expect(submitButton).toBeEnabled();

    await submitButton.click();

    await expect(
      page.getByRole("heading", { name: /Demande envoyée/i }),
    ).toBeVisible();
  });
});
