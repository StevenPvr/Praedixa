import { beforeEach, describe, expect, it } from "vitest";
import {
  loadPostRoute,
  makeRequest,
  mockEmailsSend,
  validBody,
} from "./route-test-helpers";

describe("POST /api/deployment-request delivery flow", () => {
  let POST: (request: Request) => Promise<{ status: number; body: unknown }>;

  beforeEach(async () => {
    POST = await loadPostRoute();
  });

  describe("honeypot", () => {
    it("returns success silently when the website field is filled", async () => {
      const res = await POST(
        makeRequest(validBody({ website: "http://spam.com" })),
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(mockEmailsSend).not.toHaveBeenCalled();
    });

    it("accepts a missing website field", async () => {
      const body = validBody();
      delete (body as Record<string, unknown>)["website"];
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(mockEmailsSend).toHaveBeenCalledTimes(2);
    });
  });

  describe("successful submission", () => {
    it("sends the admin and confirmation emails", async () => {
      const res = await POST(makeRequest(validBody()));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(mockEmailsSend).toHaveBeenCalledTimes(2);
    });

    it("sends the admin email to the configured contact address", async () => {
      await POST(makeRequest(validBody()));
      const adminCall = mockEmailsSend.mock.calls[0]![0];
      expect(adminCall.to).toEqual(["admin@praedixa.com"]);
      expect(adminCall.from).toBe("Praedixa <noreply@praedixa.com>");
      expect(adminCall.subject).toContain("ACME Corp");
    });

    it("sends the confirmation email to the applicant", async () => {
      await POST(makeRequest(validBody({ email: "marie@acme.fr" })));
      const confirmCall = mockEmailsSend.mock.calls[1]![0];
      expect(confirmCall.to).toEqual(["marie@acme.fr"]);
      expect(confirmCall.subject).toContain("Demande de déploiement reçue");
      expect(confirmCall.replyTo).toBe("admin@praedixa.com");
      expect(confirmCall.text).toContain(
        "Nous confirmons la bonne réception de votre demande",
      );
    });

    it("includes acquisition context in the admin email when present", async () => {
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

  describe("HTML escaping", () => {
    it("escapes HTML entities in the company name", async () => {
      await POST(
        makeRequest(
          validBody({ companyName: '<script>alert("xss")</script>' }),
        ),
      );
      const adminCall = mockEmailsSend.mock.calls[0]![0];
      expect(adminCall.html).not.toContain("<script>");
      expect(adminCall.html).toContain("&lt;script&gt;");
    });

    it("escapes quotes in the email body", async () => {
      await POST(makeRequest(validBody({ companyName: 'ACME "Quoted" Corp' })));
      const adminCall = mockEmailsSend.mock.calls[0]![0];
      expect(adminCall.html).toContain("&quot;");
    });

    it("strips newlines from the email subject", async () => {
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

  describe("error handling", () => {
    it("returns 500 when Resend throws", async () => {
      mockEmailsSend.mockRejectedValueOnce(new Error("Resend API error"));
      const res = await POST(makeRequest(validBody()));
      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: "Erreur lors de l'envoi. Veuillez réessayer.",
      });
    });
  });
});
