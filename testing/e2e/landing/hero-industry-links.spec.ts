import { expect, test } from "@playwright/test";

test.describe("Hero industry links", () => {
  test("renders the homepage sector cards section with the published sector links", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/fr");

    const sectorSection = page.locator("#secteurs");
    await expect(sectorSection).toBeVisible();
    await expect(
      sectorSection.getByRole("heading", {
        name: "Une solution adaptée à votre secteur.",
      }),
    ).toBeVisible();

    const sectorLinks = sectorSection.locator("a[href^='/fr/secteurs/']");
    await expect(sectorLinks).toHaveCount(5);
    await expect(
      sectorSection.locator("a[href='/fr/secteurs/hcr']"),
    ).toBeVisible();
    await expect(
      sectorSection.locator("a[href='/fr/secteurs/enseignement-superieur']"),
    ).toBeVisible();
    await expect(
      sectorSection.locator(
        "a[href='/fr/secteurs/logistique-transport-retail']",
      ),
    ).toBeVisible();
    await expect(
      sectorSection.locator(
        "a[href='/fr/secteurs/automobile-concessions-ateliers']",
      ),
    ).toBeVisible();
    await expect(
      sectorSection.locator("a[href='/fr/secteurs/fitness-reseaux-clubs']"),
    ).toBeVisible();
  });
});
