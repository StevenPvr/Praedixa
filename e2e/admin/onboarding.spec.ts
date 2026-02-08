import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockOnboardingApis,
  mockOnboardingApisEmpty,
  mockOnboardingApisError,
  MOCK_ONBOARDING_LIST,
} from "./fixtures/api-mocks";

test.describe("Onboarding page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays page title and parcours count", async ({ page }) => {
    await mockOnboardingApis(page);
    await page.goto("/onboarding");

    await expect(
      page.getByRole("heading", { name: "Onboarding", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`${MOCK_ONBOARDING_LIST.length} parcours`),
    ).toBeVisible();
  });

  test("displays table headers", async ({ page }) => {
    await mockOnboardingApis(page);
    await page.goto("/onboarding");

    await expect(
      page.getByRole("heading", { name: "Onboarding", exact: true }),
    ).toBeVisible();

    const expectedHeaders = [
      "Organisation",
      "Statut",
      "Progression",
      "Demarre le",
      "Termine le",
    ];
    for (const header of expectedHeaders) {
      await expect(
        page.getByRole("columnheader", { name: header }),
      ).toBeVisible();
    }
  });

  test("renders onboarding data in the table", async ({ page }) => {
    await mockOnboardingApis(page);
    await page.goto("/onboarding");

    // Wait for data
    await expect(
      page.getByRole("heading", { name: "Onboarding", exact: true }),
    ).toBeVisible();

    // Organisation ID truncated (first 8 chars + ...)
    const orgIdPrefix = MOCK_ONBOARDING_LIST[0].organizationId.substring(0, 8);
    await expect(page.getByText(`${orgIdPrefix}...`)).toBeVisible();

    // Progression: "3/5" for first entry
    await expect(page.getByText("3/5")).toBeVisible();
    // "5/5" for second (completed) entry
    await expect(page.getByText("5/5")).toBeVisible();
  });

  test("shows 'En cours' for incomplete onboarding", async ({ page }) => {
    await mockOnboardingApis(page);
    await page.goto("/onboarding");

    // First entry has completedAt: null -> "En cours"
    await expect(page.getByText("En cours").first()).toBeVisible();
  });

  test("shows completion date for completed onboarding", async ({ page }) => {
    await mockOnboardingApis(page);
    await page.goto("/onboarding");

    // Second entry has completedAt: "2026-01-25T16:00:00Z"
    // fr-FR toLocaleDateString -> "25/01/2026"
    await expect(page.getByText("25/01/2026")).toBeVisible();
  });

  test("shows error fallback on API failure", async ({ page }) => {
    await mockOnboardingApisError(page);
    await page.goto("/onboarding");

    await expect(page.getByText("Erreur de chargement")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /reessayer/i }),
    ).toBeVisible();
  });

  test("shows empty table when no onboarding entries", async ({ page }) => {
    await mockOnboardingApisEmpty(page);
    await page.goto("/onboarding");

    await expect(
      page.getByRole("heading", { name: "Onboarding", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("0 parcours")).toBeVisible();
  });
});
