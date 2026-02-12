import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Parametres page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/parametres");
    await expect(
      page.getByRole("heading", { name: "Gouvernance et reglages", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Cadrez les couts, seuils et parametres operationnels de votre organisation.",
      ),
    ).toBeVisible();
  });

  test("displays tab bar with all settings tabs", async ({ page }) => {
    await page.goto("/parametres");
    await expect(
      page.getByRole("tab", { name: "Baremes de couts" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Horaires des postes" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Seuils d'alerte" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sites" })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Exporter les donnees" }),
    ).toBeVisible();
  });

  test("cost tab is active by default and shows table", async ({ page }) => {
    await page.goto("/parametres");

    const section = page.getByLabel("Baremes de couts");
    await expect(section).toBeVisible();
    await expect(section.getByText("Baremes de couts par site")).toBeVisible();
    await expect(
      section.getByRole("columnheader", { name: "Site" }),
    ).toBeVisible();
    await expect(section.getByText("Valeur par defaut")).toBeVisible();
    await expect(section.getByText("Lyon-Sat")).toBeVisible();
  });

  test("shifts tab displays shift configuration", async ({ page }) => {
    await page.goto("/parametres");
    await page.getByRole("tab", { name: "Horaires des postes" }).click();

    const section = page.getByLabel("Horaires des postes");
    await expect(section).toBeVisible();
    await expect(section.getByText("AM")).toBeVisible();
    await expect(section.getByText("PM")).toBeVisible();
    await expect(section.getByText("Matin")).toBeVisible();
    await expect(section.getByText("Apres-midi")).toBeVisible();
  });

  test("seuils tab displays alert thresholds", async ({ page }) => {
    await page.goto("/parametres");
    await page.getByRole("tab", { name: "Seuils d'alerte" }).click();

    const section = page.getByLabel("Seuils d'alerte");
    await expect(section).toBeVisible();
    await expect(
      section.getByText("Seuil de risque sous-effectif"),
    ).toBeVisible();
    await expect(section.getByText("20%")).toBeVisible();
    await expect(section.getByText("8%")).toBeVisible();
    await expect(section.getByText("3j")).toBeVisible();
    await expect(section.getByText("85%")).toBeVisible();
  });

  test("sites tab displays sites table", async ({ page }) => {
    await page.goto("/parametres");
    await page.getByRole("tab", { name: "Sites" }).click();

    const section = page.getByLabel("Configuration des sites");
    await expect(section).toBeVisible();
    await expect(section.getByText("Paris CDG")).toBeVisible();
    await expect(section.getByText("Lyon Saint-Exupery")).toBeVisible();
  });

  test("export tab displays export buttons", async ({ page }) => {
    await page.goto("/parametres");
    await page.getByRole("tab", { name: "Exporter les donnees" }).click();

    const section = page.getByLabel("Exporter les donnees");
    await expect(section).toBeVisible();
    await expect(
      section.getByText(
        "Telechargez vos donnees au format tableur (CSV) ou document (PDF)",
      ),
    ).toBeVisible();
    await expect(
      section.getByRole("button", { name: "Telecharger CSV" }),
    ).toBeVisible();
    await expect(
      section.getByRole("button", { name: "Telecharger PDF" }),
    ).toBeVisible();
  });

  test("switching between tabs hides previous tab content", async ({
    page,
  }) => {
    await page.goto("/parametres");
    await expect(page.getByLabel("Baremes de couts")).toBeVisible();

    await page.getByRole("tab", { name: "Horaires des postes" }).click();
    await expect(page.getByLabel("Horaires des postes")).toBeVisible();
    await expect(page.getByLabel("Baremes de couts")).not.toBeVisible();

    await page.getByRole("tab", { name: "Exporter les donnees" }).click();
    await expect(page.getByLabel("Exporter les donnees")).toBeVisible();
    await expect(page.getByLabel("Horaires des postes")).not.toBeVisible();
  });
});
