import { test, expect } from "@playwright/test";

test.describe("Pilot application form (/devenir-pilote)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fr/devenir-pilote");
  });

  test("loads the premium pilot form page", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /candidature pilote premium/i,
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
      page.getByLabel(/Quel est votre principal enjeu de couverture/),
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
    await page.route("**/api/pilot-application", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.getByLabel(/Entreprise/).fill("Atlas Logistics");
    await page.getByLabel(/Secteur/).selectOption("Logistique");
    await page.getByLabel(/Effectif/).selectOption("250-500");
    await page.getByLabel(/Nombre de sites/).selectOption("4-10");

    await page.getByLabel(/Prénom/).fill("Camille");
    await page.locator('input[name="lastName"]').fill("Durand");
    await page
      .getByLabel(/Fonction/)
      .selectOption("COO / Direction des opérations");
    await page.getByLabel(/Email professionnel/).fill("camille@atlas.fr");

    await page.getByLabel(/Horizon projet/).selectOption("0-3 mois");
    await page
      .getByLabel(/Quel est votre principal enjeu de couverture/)
      .fill(
        "Nous devons anticiper les tensions de couverture entre nos principaux sites.",
      );

    // Consent: interact with the checkbox directly to ensure state change
    const checkbox = page.getByRole("checkbox");
    // Force click parent label or check the box directly if possible.
    // Since the input is visible (just styled), we can try checking it or clicking the label.
    // The previous approach clicked the text. Let's try clicking the checkbox input directly with force if needed,
    // or verify state after clicking text.
    await page
      .getByText(/J'accepte les/, { exact: false })
      .first()
      .click({ force: true });

    // Verify consent is registered (button should be enabled)
    const submitButton = page.getByRole("button", {
      name: /envoyer ma candidature/i,
    });
    await expect(submitButton).toBeEnabled();

    await submitButton.click();

    await expect(page.getByText(/Candidature transmise/i)).toBeVisible();
  });
});
