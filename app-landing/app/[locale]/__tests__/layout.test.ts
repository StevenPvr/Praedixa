import { afterEach, describe, expect, it, vi } from "vitest";
import { generateStaticParams } from "../layout";

describe("[locale] layout generateStaticParams", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns no prerendered locales in development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    await expect(generateStaticParams()).resolves.toEqual([]);
  });

  it("returns both locales outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(generateStaticParams()).resolves.toEqual([
      { locale: "fr" },
      { locale: "en" },
    ]);
  });
});
