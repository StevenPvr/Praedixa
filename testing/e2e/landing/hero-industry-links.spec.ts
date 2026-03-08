import { expect, test } from "@playwright/test";

test.describe("Hero industry links", () => {
  test("renders the current hero industry navigation without legacy carousel roles", async ({
    page,
  }) => {
    await page.goto("/fr");

    const industryNav = page.getByRole("navigation", {
      name: "Solutions par secteur",
    });

    await expect(industryNav).toBeVisible();
    await expect(industryNav.getByRole("link")).toHaveCount(8);
    await expect(industryNav.getByRole("link", { name: "Restaurant" })).toHaveAttribute(
      "href",
      "/fr/ressources#contextes-couverts",
    );
    await expect(industryNav.getByRole("link", { name: "Hôtel" })).toHaveAttribute(
      "href",
      "/fr/ressources#contextes-couverts",
    );
    await expect(industryNav.getByRole("link", { name: "Automobile" })).toHaveAttribute(
      "href",
      "/fr/ressources#contextes-couverts",
    );
    await expect(page.getByLabel("Preuves d'ancrage français")).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByRole("tabpanel")).toHaveCount(0);
  });
});
