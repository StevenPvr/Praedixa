import { expect, test } from "@playwright/test";

test.describe("Hero industry links", () => {
  test("renders the current sector navigation without legacy carousel roles", async ({
    page,
  }) => {
    await page.goto("/fr");

    const industryNav = page.getByRole("navigation", {
      name: "Solutions par secteur",
    });

    await expect(industryNav).toBeVisible();
    await expect(industryNav.getByRole("link")).toHaveCount(4);
    await expect(
      industryNav.getByRole("link", { name: "HCR" }),
    ).toHaveAttribute("href", "/fr/secteurs/hcr");
    await expect(
      industryNav.getByRole("link", { name: "Enseignement supérieur" }),
    ).toHaveAttribute("href", "/fr/secteurs/enseignement-superieur");
    await expect(
      industryNav.getByRole("link", {
        name: "Logistique / Transport / Retail",
      }),
    ).toHaveAttribute("href", "/fr/secteurs/logistique-transport-retail");
    await expect(
      industryNav.getByRole("link", {
        name: "Automobile / concessions / ateliers",
      }),
    ).toHaveAttribute("href", "/fr/secteurs/automobile-concessions-ateliers");
    await expect(page.getByLabel("Preuves d'ancrage français")).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByRole("tabpanel")).toHaveCount(0);
  });
});
