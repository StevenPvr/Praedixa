import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be declared before any import that touches the source module
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockEmailsSend = vi.fn((_args: any) =>
  Promise.resolve({ data: { id: "mock-id" }, error: null }),
);

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockEmailsSend };
  },
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: () => Promise.resolve(body),
    }),
  },
}));

vi.mock("../../../../lib/config/site", () => ({
  siteConfig: {
    contact: { email: "admin@praedixa.com" },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    companyName: "ACME Corp",
    email: "jean@acme.fr",
    phone: "+33 6 12 34 56 78",
    employeeRange: "100-250",
    sector: "Logistique",
    website: "",
    consent: true,
    ...overrides,
  };
}

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  const json = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("http://localhost:3000/api/pilot-application", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(new TextEncoder().encode(json).length),
      ...headers,
    },
    body: json,
  });
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("POST /api/pilot-application", () => {
  let POST: (request: Request) => Promise<{ status: number; body: unknown }>;

  beforeEach(async () => {
    // Reset module-level state (rateLimitMap, resend singleton) before each test
    vi.resetModules();
    mockEmailsSend.mockClear();
    mockEmailsSend.mockResolvedValue({ data: { id: "mock-id" }, error: null });

    process.env.RESEND_API_KEY = "re_test_key";

    const mod = await import("../route");
    POST = mod.POST as unknown as typeof POST;
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  // =========================================================================
  // Content-Length guard
  // =========================================================================

  describe("content-length guard", () => {
    it("should return 413 when content-length exceeds 2000 bytes", async () => {
      const req = makeRequest(validBody(), { "content-length": "5000" });
      const res = await POST(req);
      expect(res.status).toBe(413);
      expect(res.body).toEqual({
        error: "Corps de requête trop volumineux.",
      });
    });

    it("should return 413 when raw text body exceeds 2000 bytes", async () => {
      const longCompany = "A".repeat(1950);
      const body = validBody({ companyName: longCompany });
      const json = JSON.stringify(body);
      const req = new Request("http://localhost:3000/api/pilot-application", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // Deliberately understate content-length to bypass header check
          "content-length": "100",
        },
        body: json,
      });
      const res = await POST(req);
      expect(res.status).toBe(413);
    });
  });

  // =========================================================================
  // Rate limiting
  // =========================================================================

  describe("rate limiting", () => {
    it("should allow the first 5 requests from the same IP", async () => {
      for (let i = 0; i < 5; i++) {
        // Reset modules each time to clear Resend singleton but keep rateLimitMap
        // Actually, since vi.resetModules() is in beforeEach, we need a different approach.
        // We re-import once and call POST 5 times from the same module instance.
        const req = makeRequest(validBody(), {
          "cf-connecting-ip": "1.2.3.4",
        });
        const res = await POST(req);
        // All should succeed (200) or be non-429
        expect(res.status).not.toBe(429);
      }
    });

    it("should return 429 on the 6th request from the same IP", async () => {
      for (let i = 0; i < 5; i++) {
        const req = makeRequest(validBody(), {
          "cf-connecting-ip": "5.5.5.5",
        });
        await POST(req);
      }
      const req = makeRequest(validBody(), {
        "cf-connecting-ip": "5.5.5.5",
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        error: "Trop de requêtes. Veuillez réessayer plus tard.",
      });
    });

    it("should use x-forwarded-for when cf-connecting-ip is absent", async () => {
      for (let i = 0; i < 5; i++) {
        const req = makeRequest(validBody(), {
          "x-forwarded-for": "9.9.9.9, 10.0.0.1",
        });
        await POST(req);
      }
      const req = makeRequest(validBody(), {
        "x-forwarded-for": "9.9.9.9, 10.0.0.1",
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
    });

    it("should allow requests from a different IP even when one IP is limited", async () => {
      for (let i = 0; i < 6; i++) {
        const req = makeRequest(validBody(), {
          "cf-connecting-ip": "7.7.7.7",
        });
        await POST(req);
      }
      // Different IP should still work
      const req = makeRequest(validBody(), {
        "cf-connecting-ip": "8.8.8.8",
      });
      const res = await POST(req);
      expect(res.status).not.toBe(429);
    });
  });

  // =========================================================================
  // Origin guard
  // =========================================================================

  describe("origin guard", () => {
    it("should return 403 when origin host is not trusted", async () => {
      const req = makeRequest(validBody(), {
        origin: "https://evil.example",
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Origine de requête non autorisée." });
    });

    it("should return 403 when sec-fetch-site is cross-site", async () => {
      const req = makeRequest(validBody(), {
        "sec-fetch-site": "cross-site",
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // Invalid JSON
  // =========================================================================

  describe("invalid JSON", () => {
    it("should return 400 for malformed JSON", async () => {
      const req = new Request("http://localhost:3000/api/pilot-application", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "10",
        },
        body: "not-json!!",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "JSON invalide." });
    });

    it("should return 400 when body is an array", async () => {
      const req = makeRequest([1, 2, 3]);
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Corps de requête invalide." });
    });

    it("should return 400 when body is null JSON", async () => {
      const req = new Request("http://localhost:3000/api/pilot-application", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "4",
        },
        body: "null",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Corps de requête invalide." });
    });
  });

  // =========================================================================
  // Validation — companyName
  // =========================================================================

  describe("companyName validation", () => {
    it("should return 400 when companyName is missing", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).companyName;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Nom d'entreprise requis." });
    });

    it("should return 400 when companyName is empty string", async () => {
      const res = await POST(makeRequest(validBody({ companyName: "" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Nom d'entreprise requis." });
    });

    it("should return 400 when companyName is whitespace only", async () => {
      const res = await POST(makeRequest(validBody({ companyName: "   " })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Nom d'entreprise requis." });
    });

    it("should return 400 when companyName exceeds 200 characters", async () => {
      const res = await POST(
        makeRequest(validBody({ companyName: "A".repeat(201) })),
      );
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "Nom d'entreprise trop long (max 200 caractères).",
      });
    });
  });

  // =========================================================================
  // Validation — email
  // =========================================================================

  describe("email validation", () => {
    it("should return 400 when email is missing", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).email;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Email requis." });
    });

    it("should return 400 when email is empty", async () => {
      const res = await POST(makeRequest(validBody({ email: "" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Email requis." });
    });

    it("should return 400 when email format is invalid (no @)", async () => {
      const res = await POST(makeRequest(validBody({ email: "bad-email" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Adresse email invalide." });
    });

    it("should return 400 when email format is invalid (no domain)", async () => {
      const res = await POST(makeRequest(validBody({ email: "user@" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Adresse email invalide." });
    });

    it("should return 400 when email exceeds 254 characters", async () => {
      // 246 + "@test.com" (9 chars) = 255, exceeding the 254 limit
      const longEmail = `${"a".repeat(246)}@test.com`;
      const res = await POST(makeRequest(validBody({ email: longEmail })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Adresse email trop longue." });
    });

    it("should normalise email to lowercase", async () => {
      const res = await POST(makeRequest(validBody({ email: "Jean@ACME.FR" })));
      expect(res.status).toBe(200);
      // The confirmation email should be sent to the lowercase version
      const confirmCall = mockEmailsSend.mock.calls[1]!;
      expect(confirmCall[0].to).toEqual(["jean@acme.fr"]);
    });
  });

  // =========================================================================
  // Validation — phone
  // =========================================================================

  describe("phone validation", () => {
    it("should accept empty phone (optional field)", async () => {
      const res = await POST(makeRequest(validBody({ phone: "" })));
      expect(res.status).toBe(200);
    });

    it("should accept absent phone", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).phone;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(200);
    });

    it("should return 400 when phone contains invalid characters", async () => {
      const res = await POST(makeRequest(validBody({ phone: "+33 6 abc" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error:
          "Numéro de téléphone invalide (chiffres, +, -, espaces uniquement).",
      });
    });

    it("should return 400 when phone exceeds 30 characters", async () => {
      const res = await POST(makeRequest(validBody({ phone: "1".repeat(31) })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Numéro de téléphone trop long." });
    });

    it("should return 400 when phone is a non-string value", async () => {
      const res = await POST(makeRequest(validBody({ phone: 12345 })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Numéro de téléphone invalide." });
    });
  });

  // =========================================================================
  // Validation — employeeRange
  // =========================================================================

  describe("employeeRange validation", () => {
    it("should return 400 for missing employeeRange", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).employeeRange;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Effectif requis." });
    });

    it("should return 400 for invalid employeeRange not in allowlist", async () => {
      const res = await POST(makeRequest(validBody({ employeeRange: "1-10" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Tranche d'effectif invalide." });
    });

    it("should accept all valid employee ranges", async () => {
      const validRanges = [
        "50-100",
        "100-250",
        "250-500",
        "500-1 000",
        "1 000+",
        "500-1000",
        "1000+",
      ];
      for (const range of validRanges) {
        // Re-import to reset rate limiting for each iteration
        vi.resetModules();
        process.env.RESEND_API_KEY = "re_test_key";
        const mod = await import("../route");
        const fn = mod.POST as unknown as typeof POST;
        const res = await fn(makeRequest(validBody({ employeeRange: range })));
        expect(res.status).toBe(200);
      }
    });
  });

  // =========================================================================
  // Validation — sector
  // =========================================================================

  describe("sector validation", () => {
    it("should return 400 for missing sector", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).sector;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Secteur requis." });
    });

    it("should return 400 for sector not in allowlist", async () => {
      const res = await POST(makeRequest(validBody({ sector: "Finance" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Secteur invalide." });
    });

    it("should accept all valid sectors", async () => {
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
        vi.resetModules();
        process.env.RESEND_API_KEY = "re_test_key";
        const mod = await import("../route");
        const fn = mod.POST as unknown as typeof POST;
        const res = await fn(makeRequest(validBody({ sector })));
        expect(res.status).toBe(200);
      }
    });
  });

  // =========================================================================
  // Validation — consent
  // =========================================================================

  describe("consent validation", () => {
    it("should return 400 when consent is missing", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).consent;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Consentement requis." });
    });

    it("should return 400 when consent is false", async () => {
      const res = await POST(makeRequest(validBody({ consent: false })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error:
          "Vous devez accepter les conditions pour envoyer votre candidature.",
      });
    });

    it("should return 400 when consent is a string instead of boolean", async () => {
      const res = await POST(makeRequest(validBody({ consent: "true" })));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Consentement requis." });
    });
  });

  // =========================================================================
  // Honeypot
  // =========================================================================

  describe("honeypot", () => {
    it("should return success silently when website field is filled (bot trap)", async () => {
      const res = await POST(
        makeRequest(validBody({ website: "http://spam.com" })),
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      // Crucially, no emails should be sent
      expect(mockEmailsSend).not.toHaveBeenCalled();
    });

    it("should handle missing website field gracefully (defaults to empty string)", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>).website;
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      // Emails should still be sent because honeypot was not triggered
      expect(mockEmailsSend).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // Success path — email sending
  // =========================================================================

  describe("successful submission", () => {
    it("should call Resend.emails.send twice (admin + confirmation)", async () => {
      const res = await POST(makeRequest(validBody()));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(mockEmailsSend).toHaveBeenCalledTimes(2);
    });

    it("should send admin email to configured contact address", async () => {
      await POST(makeRequest(validBody()));
      const adminCall = mockEmailsSend.mock.calls[0]![0];
      expect(adminCall.to).toEqual(["admin@praedixa.com"]);
      expect(adminCall.from).toBe("Praedixa <noreply@praedixa.com>");
      expect(adminCall.subject).toContain("ACME Corp");
    });

    it("should send confirmation email to the applicant", async () => {
      await POST(makeRequest(validBody({ email: "test@example.com" })));
      const confirmCall = mockEmailsSend.mock.calls[1]![0];
      expect(confirmCall.to).toEqual(["test@example.com"]);
      expect(confirmCall.subject).toContain("Candidature entreprise pilote");
      expect(confirmCall.replyTo).toBe("admin@praedixa.com");
      expect(confirmCall.text).toContain(
        "Nous confirmons la bonne réception de votre demande",
      );
    });

    it("should include acquisition context in the admin email when present", async () => {
      await POST(
        makeRequest(
          validBody({
            acquisitionSource: "seo_resource",
            acquisitionSlug: "cout-sous-couverture",
            acquisitionQuery: "cout de la sous-couverture",
          }),
        ),
      );

      const adminCall = mockEmailsSend.mock.calls[0]![0];
      expect(adminCall.html).toContain("Attribution");
      expect(adminCall.html).toContain("seo_resource");
      expect(adminCall.html).toContain("cout-sous-couverture");
    });
  });

  // =========================================================================
  // XSS / HTML escaping
  // =========================================================================

  describe("HTML escaping (XSS prevention)", () => {
    it("should escape HTML entities in company name within email body", async () => {
      await POST(
        makeRequest(
          validBody({ companyName: '<script>alert("xss")</script>' }),
        ),
      );
      const adminCall = mockEmailsSend.mock.calls[0]![0];
      expect(adminCall.html).not.toContain("<script>");
      expect(adminCall.html).toContain("&lt;script&gt;");
    });

    it("should escape quotes in email address within email body", async () => {
      await POST(makeRequest(validBody({ email: 'user"inject@test.com' })));
      const adminCall = mockEmailsSend.mock.calls[0]![0];
      expect(adminCall.html).toContain("&quot;");
    });

    it("should strip newlines from email subject to prevent header injection", async () => {
      await POST(
        makeRequest(
          validBody({ companyName: "Company\r\nBcc: spam@evil.com" }),
        ),
      );
      const adminCall = mockEmailsSend.mock.calls[0]![0];
      expect(adminCall.subject).not.toContain("\r");
      expect(adminCall.subject).not.toContain("\n");
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe("error handling", () => {
    it("should return 500 when Resend throws an error", async () => {
      mockEmailsSend.mockRejectedValueOnce(new Error("Resend API error"));
      const res = await POST(makeRequest(validBody()));
      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: "Erreur lors de l'envoi. Veuillez réessayer.",
      });
    });
  });
});
