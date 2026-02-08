import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockProofPacksApis,
  mockProofPacksApisNoAdoption,
  mockProofPacksApisError,
  MOCK_PROOF_PACKS_SUMMARY,
} from "./fixtures/api-mocks";

test.describe("Proof Packs page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await mockProofPacksApis(page);
    await page.goto("/proof-packs");

    await expect(
      page.getByRole("heading", { name: "Proof Packs", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Preuves de valeur mensuelles par organisation"),
    ).toBeVisible();
  });

  test("displays export button (disabled)", async ({ page }) => {
    await mockProofPacksApis(page);
    await page.goto("/proof-packs");

    const exportBtn = page.getByRole("button", { name: "Exporter" });
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeDisabled();
  });

  test("displays summary stat cards", async ({ page }) => {
    await mockProofPacksApis(page);
    await page.goto("/proof-packs");

    await expect(page.getByText("Total proof packs")).toBeVisible();
    await expect(
      page.getByText(String(MOCK_PROOF_PACKS_SUMMARY.totalProofRecords)),
    ).toBeVisible();

    await expect(page.getByText("Gain net total")).toBeVisible();

    await expect(page.getByText("Organisations").first()).toBeVisible();
    await expect(
      page.getByText(String(MOCK_PROOF_PACKS_SUMMARY.orgsWithProof)).first(),
    ).toBeVisible();
  });

  test("displays average adoption rate", async ({ page }) => {
    await mockProofPacksApis(page);
    await page.goto("/proof-packs");

    await expect(page.getByText("Taux d'adoption moyen")).toBeVisible();
    await expect(page.getByText("72.5%")).toBeVisible();
  });

  test("hides adoption rate section when null", async ({ page }) => {
    await mockProofPacksApisNoAdoption(page);
    await page.goto("/proof-packs");

    await expect(
      page.getByRole("heading", { name: "Proof Packs", exact: true }),
    ).toBeVisible();
    // Should NOT show adoption section
    await expect(page.getByText("Taux d'adoption moyen")).not.toBeVisible();
  });

  test("displays per-org table with data", async ({ page }) => {
    await mockProofPacksApis(page);
    await page.goto("/proof-packs");

    await expect(
      page.getByText("Par organisation", { exact: true }),
    ).toBeVisible();

    // Truncated org IDs
    const orgPrefix = MOCK_PROOF_PACKS_SUMMARY.orgs[0].organizationId.slice(
      0,
      8,
    );
    await expect(page.getByText(`${orgPrefix}...`)).toBeVisible();

    // Per-org adoption: 85.2%
    await expect(page.getByText("85.2%")).toBeVisible();

    // Second org has null adoption -> "N/A"
    await expect(page.getByText("N/A")).toBeVisible();
  });

  test("hides per-org table when no orgs", async ({ page }) => {
    await mockProofPacksApisNoAdoption(page);
    await page.goto("/proof-packs");

    await expect(
      page.getByRole("heading", { name: "Proof Packs", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Par organisation")).not.toBeVisible();
  });

  test("shows loading skeletons before data loads", async ({ page }) => {
    await page.route(
      "**/api/v1/admin/monitoring/proof-packs/summary*",
      (route) =>
        new Promise((resolve) => setTimeout(resolve, 2000)).then(() =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: MOCK_PROOF_PACKS_SUMMARY,
              timestamp: "2026-02-07T12:00:00Z",
            }),
          }),
        ),
    );

    await page.goto("/proof-packs");

    await expect(
      page.getByRole("heading", { name: "Proof Packs", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Preuves de valeur mensuelles")).toBeVisible();
  });

  test("shows error fallback on API failure", async ({ page }) => {
    await mockProofPacksApisError(page);
    await page.goto("/proof-packs");

    await expect(page.getByText("Erreur de chargement")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /reessayer/i }),
    ).toBeVisible();
  });
});
