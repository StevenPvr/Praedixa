import { describe, it, expect } from "vitest";
import { GET } from "../route";
import { buildSignedResourceAssetHref } from "../../../../../../lib/security/signed-resource-asset";

function buildSignedRequest(url: string): Request {
  return new Request(url);
}

describe("GET /[locale]/ressources/[slug]/asset", () => {
  it("returns downloadable asset for FR resources with a valid signature", async () => {
    const now = Date.now();
    const href = buildSignedResourceAssetHref("fr", "cout-sous-couverture", {
      now,
    });
    expect(href).toBeTruthy();

    const response = await GET(buildSignedRequest(`http://localhost${href}`), {
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

  it("returns 404 when the signature is missing", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        locale: "fr",
        slug: "cout-sous-couverture",
      }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 404 for non-fr locale", async () => {
    const now = Date.now();
    const href = buildSignedResourceAssetHref("en", "cout-sous-couverture", {
      now,
    });
    const response = await GET(buildSignedRequest(`http://localhost${href}`), {
      params: Promise.resolve({
        locale: "en",
        slug: "cout-sous-couverture",
      }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 404 for unknown slug", async () => {
    const now = Date.now();
    const href = buildSignedResourceAssetHref("fr", "inconnu", {
      now,
    });
    const response = await GET(
      buildSignedRequest(
        `http://localhost${href ?? "/fr/ressources/inconnu/asset"}`,
      ),
      {
        params: Promise.resolve({
          locale: "fr",
          slug: "inconnu",
        }),
      },
    );

    expect(response.status).toBe(404);
  });
});
