import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockAccueilApis,
  mockAccueilApisError,
  mockAccueilApisEmpty,
  MOCK_PLATFORM_KPIS,
  MOCK_UNREAD_COUNT,
} from "./fixtures/api-mocks-v2";

test.describe("Accueil page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays heading and subtitle", async ({ page }) => {
    await mockAccueilApis(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Accueil" })).toBeVisible();
    await expect(page.getByText("Inbox operationnel")).toBeVisible();
  });

  test("displays 4 KPI stat cards", async ({ page }) => {
    await mockAccueilApis(page);
    await page.goto("/");
    await expect(page.getByText("Organisations actives")).toBeVisible();
    await expect(page.getByText("Utilisateurs")).toBeVisible();
    await expect(page.getByText("Items urgents")).toBeVisible();
    await expect(page.getByText("A surveiller")).toBeVisible();
    // Check KPI values
    await expect(
      page.getByText(String(MOCK_PLATFORM_KPIS.activeOrganizations), {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(String(MOCK_PLATFORM_KPIS.totalUsers), { exact: true }),
    ).toBeVisible();
  });

  test("displays inbox items sorted by priority", async ({ page }) => {
    await mockAccueilApis(page);
    await page.goto("/");
    // Urgent items should appear: critical alerts + unread >5
    await expect(page.getByText("2 alerte(s) critique(s)")).toBeVisible();
    await expect(page.getByText("8 messages non lus")).toBeVisible();
    // Warning items: missing cost params + low adoption
    await expect(page.getByText("Parametres de cout manquants")).toBeVisible();
    await expect(page.getByText("Adoption faible (35%)")).toBeVisible();
  });

  test("displays system health bar", async ({ page }) => {
    await mockAccueilApis(page);
    await page.goto("/");
    await expect(page.getByText("Sante plateforme")).toBeVisible();
    await expect(page.getByText("Taux d'ingestion")).toBeVisible();
    await expect(page.getByText("Taux d'erreur API")).toBeVisible();
    await expect(page.getByText("97.8%")).toBeVisible();
    await expect(page.getByText("0.3%")).toBeVisible();
  });

  test("displays unread messages card", async ({ page }) => {
    await mockAccueilApis(page);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Messages non lus", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(String(MOCK_UNREAD_COUNT.total))).toBeVisible();
    // Org names in unread list
    await expect(page.getByText("Acme Logistique").first()).toBeVisible();
  });

  test("displays activity feed", async ({ page }) => {
    await mockAccueilApis(page);
    await page.goto("/");
    await expect(page.getByText("Activite recente")).toBeVisible();
    await expect(page.getByText("Consultation organisation")).toBeVisible();
    await expect(page.getByText("Suspension organisation")).toBeVisible();
  });

  test("shows empty inbox state", async ({ page }) => {
    await mockAccueilApisEmpty(page);
    await page.goto("/");
    await expect(page.getByText("Aucun element en attente")).toBeVisible();
    await expect(
      page.getByText("Tout est en ordre sur la plateforme"),
    ).toBeVisible();
  });

  test("shows error fallback when KPIs fail", async ({ page }) => {
    await mockAccueilApisError(page);
    await page.goto("/");
    await expect(page.getByText("Erreur de chargement")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });
});
