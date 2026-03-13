import { test, expect } from "@playwright/test";

test.describe("Local booking flow", () => {
  test("shows booking panel after contact submit and posts 3 slots", async ({
    page,
  }) => {
    await page.route("**/api/contact/challenge", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          captchaA: 2,
          captchaB: 3,
          challengeToken: "test-challenge",
        }),
      });
    });

    await page.route("**/api/contact", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      expect(body.companyName).toBe("Atlas Logistics");
      expect(body.email).toBe("camille@atlas.fr");
      expect(body.captchaAnswer).toBe(5);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route("**/api/scoping-call", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      expect(body.email).toBe("camille@atlas.fr");
      expect(body.companyName).toBe("Atlas Logistics");
      expect(body.timezone).toBe("Europe/Paris");
      expect(Array.isArray(body.slots)).toBe(true);
      expect((body.slots as unknown[]).length).toBe(3);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/fr/contact?intent=audit");

    await page.getByLabel(/Entreprise/i).fill("Atlas Logistics");
    await page.getByLabel(/Email/i).fill("camille@atlas.fr");
    await page
      .getByLabel(/Message/i)
      .fill(
        "Nous voulons cadrer un audit historique sur nos décisions de couverture multi-sites.",
      );

    await page.locator("#contact-captcha").fill("5");
    await page.locator("#contact-consent").check();

    const submit = page.getByRole("button", { name: /Envoyer/i });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(
      page.getByRole("heading", { name: /Message envoyé/i }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /Proposer un cadrage/i }),
    ).toBeVisible();

    await expect(page.locator("#booking-company")).toHaveValue(
      "Atlas Logistics",
    );
    await expect(page.locator("#booking-email")).toHaveValue(
      "camille@atlas.fr",
    );

    await page.locator("#booking-timezone").fill("Europe/Paris");
    await page
      .locator('input[type="datetime-local"]')
      .nth(0)
      .fill("2030-01-10T10:00");
    await page
      .locator('input[type="datetime-local"]')
      .nth(1)
      .fill("2030-01-10T14:00");
    await page
      .locator('input[type="datetime-local"]')
      .nth(2)
      .fill("2030-01-11T09:30");

    await page.getByRole("button", { name: /Proposer mes créneaux/i }).click();

    await expect(
      page.getByRole("heading", { name: /Créneaux envoyés/i }),
    ).toBeVisible();
  });
});
