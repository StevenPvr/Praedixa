import { afterEach, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const mockEmailsSend = vi.fn((_args: any) =>
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

export function validBody(overrides: Record<string, unknown> = {}) {
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

export function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  const json = typeof body === "string" ? body : JSON.stringify(body);

  return new Request("http://localhost:3000/api/pilot-application", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(new TextEncoder().encode(json).length),
      origin: "http://localhost:3000",
      ...headers,
    },
    body: json,
  });
}

export async function loadPostRoute() {
  vi.resetModules();
  vi.unstubAllEnvs();
  mockEmailsSend.mockClear();
  mockEmailsSend.mockResolvedValue({ data: { id: "mock-id" }, error: null });
  process.env.RESEND_API_KEY = "re_test_key";
  const mod = await import("../route");
  return mod.POST as (request: Request) => Promise<{ status: number; body: unknown }>;
}

afterEach(() => {
  delete process.env.RESEND_API_KEY;
  vi.unstubAllEnvs();
});
