import { afterEach, describe, expect, it, vi } from "vitest";

const mockIngestResendWebhook = vi.fn();

vi.mock("../services/invitation-delivery-proof.js", async () => {
  const actual = await vi.importActual<
    typeof import("../services/invitation-delivery-proof.js")
  >("../services/invitation-delivery-proof.js");

  return {
    ...actual,
    getInvitationDeliveryProofService: () => ({
      ingestResendWebhook: (...args: unknown[]) =>
        mockIngestResendWebhook(...args),
    }),
  };
});

import { routes } from "../routes.js";
import type { RouteContext, RouteDefinition } from "../types.js";

function findRoute(method: "POST", template: string): RouteDefinition {
  const route = routes.find(
    (entry) => entry.method === method && entry.template === template,
  );
  if (!route) {
    throw new Error(`Route not found: ${method} ${template}`);
  }
  return route;
}

function makeContext(rawBody: string): RouteContext {
  return {
    method: "POST",
    path: "/api/v1/webhooks/resend/email-delivery",
    query: new URLSearchParams(),
    requestId: "req-delivery-webhook",
    telemetry: {
      requestId: "req-delivery-webhook",
      traceId: "trace-delivery-webhook",
      traceparent: null,
      tracestate: null,
      runId: null,
      connectorRunId: null,
      actionId: null,
      contractVersion: null,
      organizationId: null,
      siteId: null,
    },
    clientIp: "127.0.0.1",
    userAgent: "vitest",
    headers: {
      "svix-id": "msg-1",
      "svix-timestamp": "1711101600",
      "svix-signature": "v1,test",
    },
    params: {},
    body: JSON.parse(rawBody),
    rawBody,
    rawBodyBytes: Buffer.from(rawBody, "utf8"),
    user: null,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("email delivery webhook route", () => {
  it("accepts signed delivery events", async () => {
    mockIngestResendWebhook.mockResolvedValue({
      eventType: "email.delivered",
      storedEvents: 1,
      matchedAttempts: 1,
    });

    const route = findRoute("POST", "/api/v1/webhooks/resend/email-delivery");
    const result = await route.handler(
      makeContext(
        JSON.stringify({
          type: "email.delivered",
          created_at: "2026-03-22T10:00:00.000Z",
          data: {
            to: ["invitee@praedixa.com"],
            subject: "Your Praedixa workspace is ready",
          },
        }),
      ),
    );

    expect(result.statusCode).toBe(202);
    expect(mockIngestResendWebhook).toHaveBeenCalled();
    expect(result.payload.success).toBe(true);
  });
});
