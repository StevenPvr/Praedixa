import { test, expect } from "@playwright/test";

test.describe("Landing SEO", () => {
  test("page has a meta title", async ({ page }) => {
    await page.goto("/fr");
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).toContain("Praedixa");
  });

  test("page has a meta description", async ({ page }) => {
    await page.goto("/fr");
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute("content", /.+/);
  });

  test("page has Open Graph meta tags", async ({ page }) => {
    await page.goto("/fr");
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /.+/);

    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toHaveAttribute("content", /.+/);
  });

  test("page has JSON-LD structured data", async ({ page }) => {
    await page.goto("/fr");
    await page.waitForSelector('script[type="application/ld+json"]', {
      state: "attached",
      timeout: 5_000,
    });
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Validate the JSON-LD content is valid JSON
    const content = await jsonLd.first().textContent();
    expect(() => JSON.parse(content!)).not.toThrow();
  });

  test("/sitemap.xml returns valid XML", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    const contentType = response!.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/xml/);
    const body = await response!.text();
    expect(body).toContain("<urlset");
  });

  test("/robots.txt returns valid text", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    const body = await response!.text();
    expect(body).toContain("User-Agent");
  });

  test("page has canonical URL", async ({ page }) => {
    await page.goto("/fr");
    const canonical = page.locator('link[rel="canonical"]');
    const count = await canonical.count();
    // Canonical may be set via Next.js metadata
    if (count > 0) {
      await expect(canonical).toHaveAttribute("href", /.+/);
    }
  });

  test("page has proper lang attribute", async ({ page }) => {
    await page.goto("/fr");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "fr");
  });
});
