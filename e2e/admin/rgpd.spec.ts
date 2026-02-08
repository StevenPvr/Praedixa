import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";

test.describe("RGPD page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/rgpd");

    await expect(
      page.getByRole("heading", { name: "RGPD", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Conformite RGPD et gestion des donnees personnelles"),
    ).toBeVisible();
  });

  test("displays all 4 RGPD action cards", async ({ page }) => {
    await page.goto("/rgpd");

    const cards = [
      {
        title: "Registre des traitements",
        button: "Consulter",
      },
      {
        title: "Export des donnees",
        button: "Exporter",
      },
      {
        title: "Suppression des donnees",
        button: "Supprimer",
      },
      {
        title: "Politique de retention",
        button: "Configurer",
      },
    ];

    for (const card of cards) {
      await expect(
        page.getByRole("heading", { name: card.title }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: card.button }),
      ).toBeVisible();
    }
  });

  test("displays card descriptions", async ({ page }) => {
    await page.goto("/rgpd");

    await expect(page.getByText(/article 30 du RGPD/)).toBeVisible();
    await expect(
      page.getByText(/droit a la portabilite, article 20/),
    ).toBeVisible();
    await expect(
      page.getByText(/droit a l'effacement, article 17/),
    ).toBeVisible();
    await expect(
      page.getByText(/delais de conservation des donnees/),
    ).toBeVisible();
  });

  test("suppression button has danger variant styling", async ({ page }) => {
    await page.goto("/rgpd");

    // The "Supprimer" button should have danger styling (border-danger-500)
    const supprimerBtn = page.getByRole("button", { name: "Supprimer" });
    await expect(supprimerBtn).toBeVisible();
    await expect(supprimerBtn).toHaveClass(/border-danger-500/);
  });
});
