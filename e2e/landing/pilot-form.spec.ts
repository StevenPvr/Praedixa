import { test, expect } from "@playwright/test";

test.describe("Pilot application form (/devenir-pilote)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/devenir-pilote");
  });

  test("loads the pilot form page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/diagnostic|pilote/i);
  });

  test("displays the Praedixa logo and back link", async ({ page }) => {
    await expect(page.getByText("Praedixa")).toBeVisible();
    await expect(page.getByText("Retour au site")).toBeVisible();
  });

  test("step 1: shows company name input", async ({ page }) => {
    const companyInput = page.getByPlaceholder("Ex: Logistique Express");
    await expect(companyInput).toBeVisible();
  });

  test("step 1: continue button is disabled when company name is empty", async ({
    page,
  }) => {
    const continueButton = page.getByRole("button", { name: /continuer/i });
    await expect(continueButton).toBeDisabled();
  });

  test("step 1: can fill company name and proceed to step 2", async ({
    page,
  }) => {
    await page.getByPlaceholder("Ex: Logistique Express").fill("Test Corp");
    await page.getByRole("button", { name: /continuer/i }).click();
    // Step 2 should show the email field
    await expect(page.getByPlaceholder("vous@entreprise.com")).toBeVisible();
  });

  test("step 2: has email and phone fields", async ({ page }) => {
    // Navigate to step 2
    await page.getByPlaceholder("Ex: Logistique Express").fill("Test Corp");
    await page.getByRole("button", { name: /continuer/i }).click();

    await expect(page.getByPlaceholder("vous@entreprise.com")).toBeVisible();
    await expect(page.getByPlaceholder("06 12 34 56 78")).toBeVisible();
  });

  test("step 2: can go back to step 1", async ({ page }) => {
    // Navigate to step 2
    await page.getByPlaceholder("Ex: Logistique Express").fill("Test Corp");
    await page.getByRole("button", { name: /continuer/i }).click();

    // Go back
    await page.getByRole("button", { name: /retour/i }).click();
    await expect(page.getByPlaceholder("Ex: Logistique Express")).toBeVisible();
  });

  test("step 2: proceed to step 3 with email", async ({ page }) => {
    // Navigate to step 2
    await page.getByPlaceholder("Ex: Logistique Express").fill("Test Corp");
    await page.getByRole("button", { name: /continuer/i }).click();

    // Fill email and continue
    await page.getByPlaceholder("vous@entreprise.com").fill("test@example.com");
    await page.getByRole("button", { name: /continuer/i }).click();

    // Step 3 should show employee ranges
    await expect(page.getByText("50-100")).toBeVisible();
  });

  test("navigates through all steps to confirmation", async ({ page }) => {
    // Step 1: Company name
    await page.getByPlaceholder("Ex: Logistique Express").fill("Test Corp");
    await page.getByRole("button", { name: /continuer/i }).click();

    // Step 2: Contact info
    await page.getByPlaceholder("vous@entreprise.com").fill("test@example.com");
    await page.getByRole("button", { name: /continuer/i }).click();

    // Step 3: Employee range
    await page.getByText("50-100").click();

    // Step 4: Sector
    await page.getByText("Logistique").click();

    // Step 5: Confirmation
    await expect(page.getByText(/v.rifiez vos informations/i)).toBeVisible();
    await expect(page.getByText("Test Corp")).toBeVisible();
    await expect(page.getByText("test@example.com")).toBeVisible();
  });

  test("progress indicator shows 5 steps", async ({ page }) => {
    // The progress indicator should show step circles
    const stepCircles = page.locator(
      ".flex.items-center.gap-2 .flex.items-center.justify-center.rounded-full",
    );
    await expect(stepCircles).toHaveCount(5);
  });
});
