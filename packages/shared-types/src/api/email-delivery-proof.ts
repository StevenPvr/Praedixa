import type { ISODateTimeString } from "../utils/common.js";

export type EmailDeliveryProofProvider = "resend";

export type EmailDeliveryProofStatus =
  | "pending"
  | "provider_accepted"
  | "delivery_delayed"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed";

export interface EmailDeliveryProof {
  provider: EmailDeliveryProofProvider;
  channel: "keycloak_execute_actions_email";
  delivery: "activation_link";
  status: EmailDeliveryProofStatus;
  initiatedAt: ISODateTimeString;
  eventType?: string | null;
  occurredAt?: ISODateTimeString | null;
  observedAt?: ISODateTimeString | null;
  summary?: string | null;
}
