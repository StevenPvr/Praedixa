import { expect, test } from "@playwright/test";

test.describe("Hero ICP carousel", () => {
  test("does not render overlapping tabpanels while switching cards", async ({
    page,
  }) => {
    await page.goto("/fr");

    const carousel = page.getByRole("region", { name: "Carte ICP" });
    const tabs = page.getByRole("tab");
    await expect(carousel).toBeVisible();
    await expect(tabs).toHaveCount(5);

    for (let index = 0; index < 5; index += 1) {
      await tabs.nth(index).click();

      const maxPanelsDuringTransition = await page.evaluate(async () => {
        let maxPanels = 0;
        const deadline = performance.now() + 420;

        while (performance.now() < deadline) {
          maxPanels = Math.max(
            maxPanels,
            document.querySelectorAll('[role="tabpanel"]').length,
          );
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
        }

        return maxPanels;
      });

      expect(maxPanelsDuringTransition).toBe(1);
      await expect(page.getByRole("tabpanel")).toHaveCount(1);
    }
  });
});

