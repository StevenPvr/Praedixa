import { afterEach, describe, expect, it, vi } from "vitest";
import { Webhook } from "svix";

import {
  InvitationDeliveryProofService,
  KEYCLOAK_INVITE_EMAIL_SUBJECT,
} from "../services/invitation-delivery-proof.js";

function buildSignedWebhookPayload(payload: Record<string, unknown>) {
  const secret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
  const rawBody = JSON.stringify(payload);
  const signer = new Webhook(secret);
  const timestamp = new Date();
  const messageId = "msg_invite_delivery_1";

  return {
    secret,
    rawBody,
    headers: {
      "svix-id": messageId,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": signer.sign(messageId, timestamp, rawBody),
    },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("invitation delivery proof service", () => {
  it("verifies signed Resend webhooks and matches a delivered invite attempt", async () => {
    vi.stubEnv(
      "RESEND_WEBHOOK_SECRET",
      "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
    );
    vi.stubEnv("KEYCLOAK_SMTP_FROM", "Praedixa <hello@praedixa.com>");

    const poolQuery = vi.fn(async () => ({ rows: [] }));
    const clientQuery = vi.fn(async (sql: string) => {
      if (
        sql === "BEGIN" ||
        sql === "COMMIT" ||
        sql === "ROLLBACK" ||
        sql.includes("UPDATE identity_invitation_delivery_attempts") ||
        sql.includes("UPDATE identity_invitation_delivery_events")
      ) {
        return { rows: [] };
      }

      if (sql.includes("INSERT INTO identity_invitation_delivery_events")) {
        return {
          rows: [{ id: "event-1", matched_attempt_id: null }],
        };
      }

      if (sql.includes("FROM identity_invitation_delivery_attempts")) {
        return {
          rows: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              user_id: "22222222-2222-4222-8222-222222222222",
              email: "invitee@praedixa.com",
              proof_status: "pending",
              initiated_at: new Date("2026-03-22T09:58:00.000Z"),
              matched_event_type: null,
              occurred_at: null,
              observed_at: null,
              matched_event_summary: null,
              matched_event_id: null,
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    });
    const pool = {
      query: poolQuery,
      connect: vi.fn(async () => ({
        query: clientQuery,
        release: vi.fn(),
      })),
    };

    const service = new InvitationDeliveryProofService(pool as never);
    const signed = buildSignedWebhookPayload({
      type: "email.delivered",
      created_at: "2026-03-22T10:00:00.000Z",
      data: {
        created_at: "2026-03-22T09:59:59.000Z",
        email_id: "email-123",
        from: "Praedixa <hello@praedixa.com>",
        to: ["invitee@praedixa.com"],
        subject: KEYCLOAK_INVITE_EMAIL_SUBJECT,
      },
    });

    const result = await service.ingestResendWebhook({
      rawBody: signed.rawBody,
      headers: signed.headers,
    });

    expect(result).toEqual({
      eventType: "email.delivered",
      storedEvents: 1,
      matchedAttempts: 1,
    });
    expect(poolQuery).toHaveBeenCalled();
    expect(clientQuery).toHaveBeenCalledWith("BEGIN");
    expect(clientQuery).toHaveBeenCalledWith("COMMIT");
  });

  it("fails closed on invalid Resend webhook signatures", async () => {
    vi.stubEnv(
      "RESEND_WEBHOOK_SECRET",
      "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
    );

    const pool = {
      query: vi.fn(async () => ({ rows: [] })),
      connect: vi.fn(),
    };
    const service = new InvitationDeliveryProofService(pool as never);

    await expect(
      service.ingestResendWebhook({
        rawBody: JSON.stringify({
          type: "email.delivered",
          created_at: "2026-03-22T10:00:00.000Z",
          data: {
            to: ["invitee@praedixa.com"],
            subject: KEYCLOAK_INVITE_EMAIL_SUBJECT,
          },
        }),
        headers: {
          "svix-id": "msg-invalid",
          "svix-timestamp": "1711101600",
          "svix-signature": "v1,invalid-signature",
        },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_WEBHOOK_SIGNATURE",
      statusCode: 401,
    });
  });
});
