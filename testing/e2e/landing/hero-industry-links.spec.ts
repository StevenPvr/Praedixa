import { expect, test } from "@playwright/test";

test.describe("Hero industry links", () => {
  test("renders the current sector teaser without legacy carousel roles", async ({
    page,
  }) => {
    await page.goto("/fr");

    await expect(
      page.getByRole("heading", {
        name: "4 verticales nettes. Une même boucle de décision.",
      }),
    ).toBeVisible();
    await expect(page.locator('a[href="/fr/secteurs/hcr"]')).toHaveCount(1);
    await expect(
      page.locator('a[href="/fr/secteurs/enseignement-superieur"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('a[href="/fr/secteurs/logistique-transport-retail"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('a[href="/fr/secteurs/automobile-concessions-ateliers"]'),
    ).toHaveCount(1);
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByRole("tabpanel")).toHaveCount(0);
  });
});
