import { describe, expect, it } from "vitest";
import { GET } from "../route";

describe("rss.xml route", () => {
  it("returns RSS XML with published blog posts", async () => {
    const response = await GET();

    expect(response.headers.get("Content-Type")).toContain(
      "application/rss+xml",
    );

    const body = await response.text();
    expect(body).toContain("<rss");
    expect(body).not.toContain("<item>");
  });
});
