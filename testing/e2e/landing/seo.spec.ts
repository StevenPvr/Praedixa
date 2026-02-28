import { test, expect } from "@playwright/test";

test.describe("Landing SEO", () => {
  test("root URL permanently redirects to /fr", async ({ request }) => {
    const response = await request.get("/", { maxRedirects: 0 });
    expect(response).not.toBeNull();
    expect(response.status()).toBe(301);
    expect(response.headers()["location"]).toContain("/fr");
  });

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
    await expect(canonical).toHaveAttribute(
      "href",
      "https://www.praedixa.com/fr",
    );

    const hreflangFr = page.locator('link[rel="alternate"][hreflang="fr-FR"]');
    await expect(hreflangFr).toHaveAttribute(
      "href",
      "https://www.praedixa.com/fr",
    );

    const hreflangEn = page.locator('link[rel="alternate"][hreflang="en"]');
    await expect(hreflangEn).toHaveAttribute(
      "href",
      "https://www.praedixa.com/en",
    );

    const hreflangDefault = page.locator(
      'link[rel="alternate"][hreflang="x-default"]',
    );
    await expect(hreflangDefault).toHaveAttribute(
      "href",
      "https://www.praedixa.com/fr",
    );
  });

  test("FR page has proper lang attribute", async ({ page }) => {
    await page.goto("/fr");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "fr");
  });

  test("EN page has proper lang attribute", async ({ page }) => {
    await page.goto("/en");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "en");
  });

  test("SERP resource page exposes canonical and breadcrumb JSON-LD", async ({
    page,
  }) => {
    await page.goto("/fr/ressources/cout-sous-couverture");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      "href",
      "https://www.praedixa.com/fr/ressources/cout-sous-couverture",
    );

    const breadcrumbScript = page.locator(
      'script[type="application/ld+json"]#praedixa-breadcrumb-json-ld-cout-sous-couverture',
    );
    await expect(breadcrumbScript).toBeAttached();
  });

  test("SERP resource page exposes tracked primary CTA and downloadable asset", async ({
    page,
    request,
  }) => {
    await page.goto("/fr/ressources/cout-sous-couverture");

    const pilotCta = page.getByRole("link", {
      name: /Calculer le cout de l'inaction/i,
    });
    const pilotHref = await pilotCta.getAttribute("href");
    expect(pilotHref).toContain("source=seo_resource");
    expect(pilotHref).toContain("seo_slug=cout-sous-couverture");

    const assetLink = page.locator(
      'a[href="/fr/ressources/cout-sous-couverture/asset"]',
    );
    await expect(assetLink).toBeVisible();
    const assetHref = await assetLink.getAttribute("href");
    expect(assetHref).toBe("/fr/ressources/cout-sous-couverture/asset");

    const assetResponse = await request.get(assetHref ?? "");
    expect(assetResponse.status()).toBe(200);
    expect(assetResponse.headers()["content-disposition"]).toContain(
      "attachment",
    );
  });

  test("SERP resource page exposes article-level JSON-LD", async ({ page }) => {
    await page.goto("/fr/ressources/cout-sous-couverture");

    const articleScript = page.locator(
      'script[type="application/ld+json"]#praedixa-article-json-ld-cout-sous-couverture',
    );
    await expect(articleScript).toBeAttached();
  });
});
