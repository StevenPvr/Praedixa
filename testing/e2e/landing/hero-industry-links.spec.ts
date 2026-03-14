import { expect, test } from "@playwright/test";

test.describe("Hero industry links", () => {
  test("renders the qualification block without legacy carousel roles", async ({
    page,
  }) => {
    await page.goto("/fr");

    await expect(
      page.getByRole("heading", {
        name: "Un bon point de départ si…",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pas pour vous si…" }),
    ).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByRole("tabpanel")).toHaveCount(0);
  });
});
