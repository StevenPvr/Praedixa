import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (url: URL | string, status?: number) => ({
      status: status ?? 307,
      headers: {
        Location: String(url),
      },
    }),
  },
}));

describe("GET /apple-touch-icon-precomposed.png", () => {
  it("redirects to the canonical apple touch icon asset", async () => {
    const { GET } = await import("../route");
    const response = GET(
      new Request("http://localhost:3000/apple-touch-icon-precomposed.png"),
    ) as unknown as {
      status: number;
      headers: Record<string, string>;
    };

    expect(response.status).toBe(308);
    expect(response.headers["Location"]).toBe(
      "http://localhost:3000/apple-touch-icon.png",
    );
  });
});
