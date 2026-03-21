import { afterEach, describe, expect, it } from "vitest";
import { GET } from "../route";
import { __resetSecurityStoreStateForTests } from "../../../../lib/security/security-store";

describe("GET /api/resource-asset", () => {
  afterEach(() => {
    __resetSecurityStoreStateForTests();
  });

  it("issues a signed redirect for same-origin teaser downloads", async () => {
    const response = await GET(
      new Request(
        "http://localhost:3000/api/resource-asset?locale=fr&slug=cout-sous-couverture",
        {
          headers: {
            referer: "http://localhost:3000/fr/ressources/cout-sous-couverture",
          },
        },
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/fr/ressources/cout-sous-couverture/asset?exp=",
    );
    expect(response.headers.get("location")).toContain("&sig=");
  });

  it("rejects cross-site download minting requests", async () => {
    const response = await GET(
      new Request(
        "http://localhost:3000/api/resource-asset?locale=fr&slug=cout-sous-couverture",
        {
          headers: {
            "sec-fetch-site": "cross-site",
          },
        },
      ),
    );

    expect(response.status).toBe(403);
  });
});
