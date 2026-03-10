import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadPostRoute, makeRequest, validBody } from "./route-test-helpers";

describe("POST /api/pilot-application security guards", () => {
  let POST: (
    request: Request,
  ) => Promise<{ status: number; body: unknown; headers: Headers }>;

  beforeEach(async () => {
    POST = await loadPostRoute();
  });

  describe("content-length guard", () => {
    it("returns 413 when content-length exceeds 2000 bytes", async () => {
      const res = await POST(
        makeRequest(validBody(), { "content-length": "5000" }),
      );
      expect(res.status).toBe(413);
      expect(res.body).toEqual({ error: "Corps de requête trop volumineux." });
    });

    it("returns 413 when the raw text body exceeds 2000 bytes", async () => {
      const body = validBody({ companyName: "A".repeat(1950) });
      const json = JSON.stringify(body);
      const req = new Request("http://localhost:3000/api/pilot-application", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "100",
          origin: "http://localhost:3000",
        },
        body: json,
      });

      const res = await POST(req);
      expect(res.status).toBe(413);
    });
  });

  describe("rate limiting", () => {
    it("allows the first 5 requests from the same IP", async () => {
      for (let index = 0; index < 5; index += 1) {
        const res = await POST(
          makeRequest(validBody(), { "cf-connecting-ip": "1.2.3.4" }),
        );
        expect(res.status).not.toBe(429);
      }
    });

    it("returns 429 on the 6th request from the same IP", async () => {
      for (let index = 0; index < 5; index += 1) {
        await POST(makeRequest(validBody(), { "cf-connecting-ip": "5.5.5.5" }));
      }

      const res = await POST(
        makeRequest(validBody(), { "cf-connecting-ip": "5.5.5.5" }),
      );
      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        error: "Trop de requêtes. Veuillez réessayer plus tard.",
      });
    });

    it("uses x-forwarded-for when cf-connecting-ip is absent", async () => {
      vi.stubEnv("LANDING_TRUST_PROXY_IP_HEADERS", "1");

      for (let index = 0; index < 5; index += 1) {
        await POST(
          makeRequest(validBody(), { "x-forwarded-for": "9.9.9.9, 10.0.0.1" }),
        );
      }

      const res = await POST(
        makeRequest(validBody(), { "x-forwarded-for": "9.9.9.9, 10.0.0.1" }),
      );
      expect(res.status).toBe(429);
    });

    it("still allows a different IP when one address is limited", async () => {
      vi.stubEnv("LANDING_TRUST_PROXY_IP_HEADERS", "1");

      for (let index = 0; index < 6; index += 1) {
        await POST(makeRequest(validBody(), { "cf-connecting-ip": "7.7.7.7" }));
      }

      const res = await POST(
        makeRequest(validBody(), { "cf-connecting-ip": "8.8.8.8" }),
      );
      expect(res.status).not.toBe(429);
    });
  });

  describe("origin guard", () => {
    it("returns 403 when the origin host is not trusted", async () => {
      const res = await POST(
        makeRequest(validBody(), { origin: "https://evil.example" }),
      );
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Origine de requête non autorisée." });
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    it("returns 403 when sec-fetch-site is cross-site", async () => {
      const res = await POST(
        makeRequest(validBody(), { "sec-fetch-site": "cross-site" }),
      );
      expect(res.status).toBe(403);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    it("returns 403 when origin and referer are both missing", async () => {
      const payload = JSON.stringify(validBody());
      const req = new Request("http://localhost:3000/api/pilot-application", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(new TextEncoder().encode(payload).length),
        },
        body: payload,
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Origine de requête non autorisée." });
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });
  });

  describe("invalid JSON", () => {
    it("returns 415 for non-JSON content types", async () => {
      const req = new Request("http://localhost:3000/api/pilot-application", {
        method: "POST",
        headers: {
          "content-type": "text/plain",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify(validBody()),
      });

      const res = await POST(req);
      expect(res.status).toBe(415);
      expect(res.body).toEqual({ error: "Content-Type non supporte." });
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    it("returns 400 for malformed JSON", async () => {
      const req = new Request("http://localhost:3000/api/pilot-application", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "10",
          origin: "http://localhost:3000",
        },
        body: "not-json!!",
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "JSON invalide." });
    });

    it("returns 400 when the body is an array", async () => {
      const res = await POST(makeRequest([1, 2, 3]));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Corps de requête invalide." });
    });

    it("returns 400 when the body is null", async () => {
      const req = new Request("http://localhost:3000/api/pilot-application", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "4",
          origin: "http://localhost:3000",
        },
        body: "null",
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Corps de requête invalide." });
    });
  });
});
