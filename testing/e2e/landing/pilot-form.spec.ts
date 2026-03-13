import { test, expect } from "@playwright/test";

test.describe("Deployment request form (/fr/deploiement)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fr/deploiement");
  });

  test("loads the deployment form page", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /demande de deploiement praedixa/i,
      { timeout: 15_000 },
    );
    await expect(
      page.getByRole("link", { name: /retour au site/i }),
    ).toBeVisible();
  });

  test("shows required qualification fields", async ({ page }) => {
    await expect(page.getByLabel(/Entreprise/)).toBeVisible();
    await expect(page.getByLabel(/Secteur/)).toBeVisible();
    await expect(page.getByLabel(/Nombre de sites/)).toBeVisible();
    await expect(page.getByLabel(/Fonction/)).toBeVisible();
    await expect(page.getByLabel(/Horizon projet/)).toBeVisible();
    await expect(
      page.getByLabel(/Principal arbitrage.*optimiser/i),
    ).toBeVisible();
  });

  test("submit button stays disabled until form is complete", async ({
    page,
  }) => {
    const submit = page.getByRole("button", {
      name: /envoyer ma candidature/i,
    });
    await expect(submit).toBeDisabled();

    await page.getByLabel(/Entreprise/).fill("Atlas Logistics");
    await expect(submit).toBeDisabled();
  });

  test("submits successfully when required fields are complete", async ({
    page,
  }) => {
    await page.route("**/api/deployment-request", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.getByLabel(/Entreprise/).fill("Atlas Logistics");
    await page
      .getByLabel(/Secteur/)
      .selectOption({ label: "Logistique / Transport / Retail" });
    await page.getByLabel(/Effectif/).selectOption("250-500");
    await page.getByLabel(/Nombre de sites/).selectOption("4-10");

    await page.getByLabel(/Prenom|Prénom/).fill("Camille");
    await page.getByLabel(/^Nom$/).fill("Durand");
    await page
      .getByLabel(/Fonction/)
      .selectOption({ label: "COO / Direction des opérations" });
    await page.getByLabel(/Email professionnel/).fill("camille@atlas.fr");

    await page.getByLabel(/Horizon projet/).selectOption("0-3 mois");
    await page
      .getByLabel(/Principal arbitrage.*optimiser/i)
      .fill(
        "Nous devons anticiper les tensions de couverture entre nos principaux sites.",
      );

    const checkbox = page.getByRole("checkbox");
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Verify consent is registered (button should be enabled)
    const submitButton = page.getByRole("button", {
      name: /envoyer ma candidature/i,
    });
    await expect(submitButton).toBeEnabled();

    await submitButton.click();

    await expect(page.getByText(/Candidature transmise/i)).toBeVisible();
  });
});
