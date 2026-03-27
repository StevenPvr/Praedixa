import { expect, test } from "@playwright/test";

test.describe("Hero industry links", () => {
  test("keeps the homepage network use-cases section free of retired sector links", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/fr");

    const sectorSection = page.locator("#secteurs");
    await expect(sectorSection).toBeVisible();
    await expect(
      sectorSection.getByRole("heading", {
        name: "Les arbitrages qui reviennent chaque semaine dans un réseau QSR.",
      }),
    ).toBeVisible();

    await expect(sectorSection.locator("a[href^='/fr/secteurs/']")).toHaveCount(
      0,
    );
  });
});
