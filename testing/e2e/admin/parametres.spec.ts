import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockParametresApis,
  mockParametresApisError,
} from "./fixtures/api-mocks-v2";

test.describe("Parametres page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays heading and subtitle", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    await expect(
      page.getByRole("heading", { name: "Parametres" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Supervision de l'onboarding admin et hygiene de configuration systeme.",
      ),
    ).toBeVisible();
  });

  test("displays 2 section tabs", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    await expect(
      page.getByRole("button", { name: "Onboarding (2)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Configuration" }),
    ).toBeVisible();
  });

  test("default tab Onboarding shows create client controls", async ({
    page,
  }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    await expect(page.getByText("Creer un client")).toBeVisible();
    await expect(page.getByLabel("Nom")).toBeVisible();
    await expect(page.getByLabel("Slug")).toBeVisible();
    await expect(page.getByLabel("Email contact")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Creer le client" }),
    ).toBeVisible();
  });

  test("Onboarding tab shows current case counters", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    await expect(page.getByText("Cases visibles")).toBeVisible();
    await expect(page.getByText("Cases bloques")).toBeVisible();
    await expect(page.getByText("Activation full")).toBeVisible();
  });

  test("DataTable with onboarding cases", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    await expect(
      page.getByRole("columnheader", { name: "Organisation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Statut" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Phase" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Readiness" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Charge ouverte" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Ouvert le" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Action" }),
    ).toBeVisible();
    await expect(page.getByText("Acme Logistique")).toBeVisible();
    await expect(page.getByText("source activation")).toBeVisible();
  });

  test("Configuration tab shows 3 StatCards", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    await page.getByRole("button", { name: "Configuration" }).click();
    await expect(page.getByText("Organisations avec manques")).toBeVisible();
    await expect(
      page.getByText("Parametres manquants", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Etat global")).toBeVisible();
  });

  test("Configuration tab shows missing config details", async ({ page }) => {
    await mockParametresApis(page);
    await page.goto("/parametres");
    await page.getByRole("button", { name: "Configuration" }).click();
    await expect(page.getByText("Hygiene incomplete")).toBeVisible();
    await expect(page.getByText("Global Freight")).toBeVisible();
    await expect(page.getByText("Cout interne")).toBeVisible();
  });

  test("shows error state", async ({ page }) => {
    await mockParametresApisError(page);
    await page.goto("/parametres");
    await expect(page.getByText("Erreur de chargement")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });
});
