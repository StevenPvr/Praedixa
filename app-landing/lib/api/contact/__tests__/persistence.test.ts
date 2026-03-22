import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistContactRequest } from "../persistence";
import type { ContactPayload } from "../validation";

const BASE_PAYLOAD: ContactPayload = {
  locale: "fr",
  intent: "deployment",
  companyName: "ACME",
  role: "COO",
  email: "ops@acme.fr",
  siteCount: "11-30",
  sector: "Logistique / Transport / Retail",
  mainTradeOff: "Reallocation inter-sites",
  timeline: "0-3 mois",
  currentStack: "ERP + BI",
  message: "Contexte additionnel",
  subject: "Premier périmètre de décision — ACME",
  consent: true,
  website: "",
  captchaAnswer: 7,
  challengeToken: "token",
};

describe("persistContactRequest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires an explicit outbound host allowlist in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONTACT_API_BASE_URL", "https://api.example.com");
    vi.stubEnv("CONTACT_API_INGEST_TOKEN", "secret");
    vi.stubEnv("CONTACT_API_ALLOWED_HOSTS", "");

    await expect(
      persistContactRequest(
        BASE_PAYLOAD,
        new Request("https://www.praedixa.com/api/contact"),
        "203.0.113.10",
        "req-1",
      ),
    ).rejects.toThrow("CONTACT_API_ALLOWED_HOSTS must be configured");
  });

  it("drops spoofable proxy metadata and strips referer query strings", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CONTACT_API_BASE_URL", "https://api.example.com");
    vi.stubEnv("CONTACT_API_INGEST_TOKEN", "secret");
    vi.stubEnv("CONTACT_API_ALLOWED_HOSTS", "api.example.com");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "received" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    await persistContactRequest(
      BASE_PAYLOAD,
      new Request("https://www.praedixa.com/api/contact", {
        headers: {
          "user-agent": "Mozilla/5.0 Test Browser",
          referer: "https://www.praedixa.com/fr/contact?utm_source=test",
          "x-forwarded-for": "198.51.100.44",
        },
      }),
      "203.0.113.10",
      "req-2",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as {
      metadataJson: Record<string, unknown>;
    };

    expect(body.metadataJson["referer"]).toBe(
      "https://www.praedixa.com/fr/contact",
    );
    expect(body.metadataJson).not.toHaveProperty("forwardedFor");
  });
});
