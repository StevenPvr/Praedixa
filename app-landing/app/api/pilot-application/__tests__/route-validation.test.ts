import { beforeEach, describe, expect, it } from "vitest";
import { loadPostRoute, makeRequest, validBody } from "./route-test-helpers";

describe("POST /api/pilot-application validation", () => {
  let POST: (request: Request) => Promise<{ status: number; body: unknown }>;

  beforeEach(async () => {
    POST = await loadPostRoute();
  });

  describe("companyName", () => {
    it("rejects a missing companyName", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).companyName;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Nom d'entreprise requis." });
    });

    it("rejects an empty companyName", async () => {
      const res = await POST(makeRequest(validBody({ companyName: "" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Nom d'entreprise requis." });
    });

    it("rejects a whitespace-only companyName", async () => {
      const res = await POST(makeRequest(validBody({ companyName: "   " })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Nom d'entreprise requis." });
    });

    it("rejects a companyName longer than 200 characters", async () => {
      const res = await POST(makeRequest(validBody({ companyName: "A".repeat(201) })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "Nom d'entreprise trop long (max 200 caractères).",
      });
    });
  });

  describe("email", () => {
    it("rejects a missing email", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).email;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Email requis." });
    });

    it("rejects an empty email", async () => {
      const res = await POST(makeRequest(validBody({ email: "" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Email requis." });
    });

    it("rejects an invalid email with no @", async () => {
      const res = await POST(makeRequest(validBody({ email: "bad-email" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Adresse email invalide." });
    });

    it("rejects an invalid email with no domain", async () => {
      const res = await POST(makeRequest(validBody({ email: "user@" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Adresse email invalide." });
    });

    it("rejects an email longer than 254 characters", async () => {
      const longEmail = `${"a".repeat(246)}@test.com`;
      const res = await POST(makeRequest(validBody({ email: longEmail })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Adresse email trop longue." });
    });

    it("normalises email to lowercase", async () => {
      const res = await POST(makeRequest(validBody({ email: "Jean@ACME.FR" })));
      expect(res.status).toBe(200);
    });
  });

  describe("phone", () => {
    it("accepts an empty phone", async () => {
      const res = await POST(makeRequest(validBody({ phone: "" })));
      expect(res.status).toBe(200);
    });

    it("accepts an absent phone", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).phone;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(200);
    });

    it("rejects invalid phone characters", async () => {
      const res = await POST(makeRequest(validBody({ phone: "+33 6 abc" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "Numéro de téléphone invalide (chiffres, +, -, espaces uniquement).",
      });
    });

    it("rejects phones longer than 30 characters", async () => {
      const res = await POST(makeRequest(validBody({ phone: "1".repeat(31) })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Numéro de téléphone trop long." });
    });

    it("rejects non-string phone values", async () => {
      const res = await POST(makeRequest(validBody({ phone: 12345 })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Numéro de téléphone invalide." });
    });
  });

  describe("employeeRange", () => {
    it("rejects a missing employeeRange", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).employeeRange;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Effectif requis." });
    });

    it("rejects an employeeRange outside the allowlist", async () => {
      const res = await POST(makeRequest(validBody({ employeeRange: "1-10" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Tranche d'effectif invalide." });
    });

    it("accepts every valid employeeRange", async () => {
      const validRanges = ["50-100", "100-250", "250-500", "500-1 000", "1 000+", "500-1000", "1000+"];

      for (const range of validRanges) {
        const route = await loadPostRoute();
        const res = await route(makeRequest(validBody({ employeeRange: range })));
        expect(res.status).toBe(200);
      }
    });
  });

  describe("sector", () => {
    it("rejects a missing sector", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).sector;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Secteur requis." });
    });

    it("rejects a sector outside the allowlist", async () => {
      const res = await POST(makeRequest(validBody({ sector: "Finance" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Secteur invalide." });
    });

    it("accepts every valid sector", async () => {
      const validSectors = [
        "Logistique",
        "Transport",
        "Santé",
        "Industrie",
        "Distribution",
        "Agroalimentaire",
        "BTP",
        "Autre",
      ];

      for (const sector of validSectors) {
        const route = await loadPostRoute();
        const res = await route(makeRequest(validBody({ sector })));
        expect(res.status).toBe(200);
      }
    });
  });

  describe("consent", () => {
    it("rejects a missing consent", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).consent;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Consentement requis." });
    });

    it("rejects consent=false", async () => {
      const res = await POST(makeRequest(validBody({ consent: false })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "Vous devez accepter les conditions pour envoyer votre candidature.",
      });
    });

    it("rejects string consent values", async () => {
      const res = await POST(makeRequest(validBody({ consent: "true" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Consentement requis." });
    });
  });
});
