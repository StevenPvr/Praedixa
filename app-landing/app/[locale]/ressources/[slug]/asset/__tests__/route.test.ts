import { describe, it, expect } from "vitest";
import { GET } from "../route";

describe("GET /[locale]/ressources/[slug]/asset", () => {
  it("returns downloadable asset for FR resources", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        locale: "fr",
        slug: "cout-sous-couverture",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("attachment");

    const body = await response.text();
    expect(body).toContain("metric,input_value,unit");
  });

  it("returns 404 for non-fr locale", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        locale: "en",
        slug: "cout-sous-couverture",
      }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 404 for unknown slug", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        locale: "fr",
        slug: "inconnu",
      }),
    });

    expect(response.status).toBe(404);
  });
});
