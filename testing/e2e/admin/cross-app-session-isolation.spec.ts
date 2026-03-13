import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import { setupAuth as setupWebappAuth } from "../webapp/fixtures/auth";
import {
  mockCatchAll,
  mockVueClientApis,
  TEST_ORG_ID,
} from "./fixtures/workspace-mocks";

test.describe("Cross-app session isolation", () => {
  test("webapp session activity does not disconnect admin workspace", async ({
    page,
  }) => {
    await setupAdminAuth(page);
    await mockCatchAll(page);
    await mockVueClientApis(page);

    await page.goto(`/clients/${TEST_ORG_ID}/vue-client`);
    await expect(
      page.getByRole("heading", { name: "Vue client", exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    const webappPage = await page.context().newPage();
    await setupWebappAuth(webappPage);
    await webappPage.goto("http://localhost:3001/login");

    const statuses = await webappPage.evaluate(async () => {
      const requests = Array.from({ length: 120 }, () =>
        fetch("/auth/session?min_ttl=0", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }).then((response) => response.status),
      );
      return Promise.all(requests);
    });

    expect(statuses.every((status) => status === 200)).toBe(true);
    await webappPage.close();

    await page.reload();
    await expect(page).toHaveURL(
      new RegExp(`/clients/${TEST_ORG_ID}/vue-client`),
    );
    await expect(
      page.getByRole("heading", { name: "Vue client", exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
