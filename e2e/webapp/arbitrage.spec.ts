import { test, expect } from "@playwright/test";
import { setupAuth } from "./fixtures/auth";
import {
  mockAlerts,
  mockArbitrageOptions,
  mockValidateArbitrage,
  mockDecisions,
  IDS,
} from "./fixtures/api-mocks";

test.describe("Arbitrage list page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAlerts(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/arbitrage");
    await expect(
      page.getByRole("heading", { name: "Arbitrage", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Alertes et recommandations d'arbitrage economique"),
    ).toBeVisible();
  });

  test("displays only risk-type alerts as arbitrage cards", async ({
    page,
  }) => {
    await page.goto("/arbitrage");

    // Mock has 2 risk alerts and 1 forecast alert
    // Only risk alerts should appear
    await expect(page.getByText("Deficit critique Dept. A1")).toBeVisible();
    await expect(page.getByText("Risque modere Dept. B1")).toBeVisible();
    // Forecast alert should NOT appear
    await expect(
      page.getByText("Nouvelle prevision disponible"),
    ).not.toBeVisible();
  });

  test("each alert card has an 'Arbitrer' button", async ({ page }) => {
    await page.goto("/arbitrage");

    const arbitrerButtons = page.getByRole("link", { name: "Arbitrer" });
    // 2 risk alerts = 2 buttons
    await expect(arbitrerButtons).toHaveCount(2);
  });

  test("clicking 'Arbitrer' navigates to alert detail", async ({ page }) => {
    await page.goto("/arbitrage");

    // Mock the arbitrage options endpoint for navigation
    await mockArbitrageOptions(page);

    // Click the first "Arbitrer" link
    await page.getByRole("link", { name: "Arbitrer" }).first().click();
    await expect(page).toHaveURL(new RegExp(`/arbitrage/${IDS.alert1}`));
  });
});

test.describe("Arbitrage detail page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockArbitrageOptions(page);
    await mockValidateArbitrage(page);
    await mockDecisions(page);
  });

  test("displays alert context card with site and department info", async ({
    page,
  }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    // Context card should show alert details
    await expect(page.getByText("Deficit critique Dept. A1")).toBeVisible();
    await expect(page.getByText("Paris CDG")).toBeVisible();
    await expect(page.getByText("Logistique Paris")).toBeVisible();
    await expect(page.getByText("25%")).toBeVisible(); // deficitPct
    await expect(page.getByText("7 jours")).toBeVisible(); // horizonDays
  });

  test("displays 4 option cards in a grid", async ({ page }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    // Wait for options section
    const optionsSection = page.getByLabel("Options d'arbitrage");
    await expect(optionsSection).toBeVisible();

    // 4 option cards
    const optionCards = optionsSection.getByRole("article");
    await expect(optionCards).toHaveCount(4);
  });

  test("recommended option has the 'Recommande' badge", async ({ page }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    // recommendationIndex=1 means "Interimaire externe" is recommended
    await expect(page.getByText("Recommande")).toBeVisible();

    // The badge should be near the recommended option label
    const recommendedCard = page.getByLabel("Option : Interimaire externe");
    await expect(recommendedCard.getByText("Recommande")).toBeVisible();
  });

  test("each option card shows cost, delay, and risk level", async ({
    page,
  }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    // Check the first option (Heures supplementaires)
    const overtimeCard = page.getByLabel("Option : Heures supplementaires");
    await expect(overtimeCard).toBeVisible();
    // Cost formatted in EUR
    await expect(overtimeCard.getByText(/12[\s\u202f]000/)).toBeVisible();
    // Delay
    await expect(overtimeCard.getByText("0 jour")).toBeVisible();
    // Coverage impact
    await expect(overtimeCard.getByText("+15%")).toBeVisible();
  });

  test("option cards show pros and cons", async ({ page }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    const externalCard = page.getByLabel("Option : Interimaire externe");
    await expect(externalCard).toBeVisible();

    // Pros
    await expect(externalCard.getByText("Cout modere")).toBeVisible();
    await expect(
      externalCard.getByText("Couvre le deficit complet"),
    ).toBeVisible();

    // Cons
    await expect(externalCard.getByText("Delai de 3 jours")).toBeVisible();
    await expect(externalCard.getByText("Formation necessaire")).toBeVisible();
  });

  test("each option card has a 'Valider cette option' button", async ({
    page,
  }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    const validateButtons = page.getByRole("button", {
      name: "Valider cette option",
    });
    await expect(validateButtons).toHaveCount(4);
  });

  test("clicking validate shows success banner and redirects to /decisions", async ({
    page,
  }) => {
    await page.goto(`/arbitrage/${IDS.alert1}`);

    // Click validate on the recommended option (index 1)
    const externalCard = page.getByLabel("Option : Interimaire externe");
    await externalCard
      .getByRole("button", { name: "Valider cette option" })
      .click();

    // Success banner should appear
    await expect(
      page.getByText("Decision enregistree avec succes"),
    ).toBeVisible();

    // Should redirect to /decisions after ~1.5s
    await expect(page).toHaveURL(/\/decisions/, { timeout: 5000 });
  });

  test("validation error shows error banner with retry button", async ({
    page,
  }) => {
    // Override the validate mock to fail
    await mockValidateArbitrage(page, { fail: true });

    await page.goto(`/arbitrage/${IDS.alert1}`);

    // Click validate
    const firstCard = page.getByLabel("Option : Heures supplementaires");
    await firstCard
      .getByRole("button", { name: "Valider cette option" })
      .click();

    // Error banner should appear
    await expect(page.getByText(/n'a pas pu etre enregistre/)).toBeVisible();

    // Retry button
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });
});
