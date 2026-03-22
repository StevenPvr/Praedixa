import type { RouteDefinition } from "../types.js";
import { failure, success } from "../response.js";
import { route } from "../router.js";
import { PersistenceError } from "../services/persistence.js";
import { getInvitationDeliveryProofService } from "../services/invitation-delivery-proof.js";

const resendWebhookRateLimit = {
  maxRequests: 600,
  scope: "ip" as const,
  windowMs: 60_000,
};

export const EMAIL_DELIVERY_WEBHOOK_ROUTES: RouteDefinition[] = [
  route(
    "POST",
    "/api/v1/webhooks/resend/email-delivery",
    async (ctx) => {
      if (!ctx.rawBody) {
        return failure(
          "INVALID_WEBHOOK_BODY",
          "Webhook body must be valid JSON.",
          ctx.requestId,
          400,
        );
      }

      try {
        const result =
          await getInvitationDeliveryProofService().ingestResendWebhook({
            rawBody: ctx.rawBody,
            headers: ctx.headers,
          });

        return success(
          {
            accepted: true,
            eventType: result.eventType,
            storedEvents: result.storedEvents,
            matchedAttempts: result.matchedAttempts,
          },
          ctx.requestId,
          "Delivery webhook accepted",
          202,
        );
      } catch (error) {
        if (error instanceof PersistenceError) {
          return failure(
            error.code,
            error.message,
            ctx.requestId,
            error.statusCode,
            error.details,
          );
        }

        return failure(
          "DELIVERY_PROOF_INGEST_FAILED",
          "Unable to process delivery webhook.",
          ctx.requestId,
          500,
        );
      }
    },
    {
      authRequired: false,
      rateLimit: resendWebhookRateLimit,
    },
  ),
];
