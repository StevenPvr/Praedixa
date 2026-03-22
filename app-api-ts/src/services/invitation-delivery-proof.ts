import { randomUUID } from "node:crypto";

import type {
  EmailDeliveryProof,
  EmailDeliveryProofStatus,
  OnboardingAccessInviteRecipient,
} from "@praedixa/shared-types/api";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { Webhook, WebhookVerificationError } from "svix";

import {
  getPersistencePool,
  mapPersistenceError,
  PersistenceError,
  toIsoDateTime,
} from "./persistence.js";

type DbQueryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

type DbInvitationDeliveryProofRow = {
  id: string;
  user_id: string;
  email: string;
  proof_status: EmailDeliveryProofStatus;
  initiated_at: string | Date;
  matched_event_type: string | null;
  occurred_at: string | Date | null;
  observed_at: string | Date | null;
  matched_event_summary: string | null;
};

type DbInvitationDeliveryEventRow = {
  id: string;
  matched_attempt_id: string | null;
};

type ResendWebhookPayload = z.infer<typeof resendWebhookPayloadSchema>;

const INVITATION_DELIVERY_PROVIDER = "resend" as const;
const INVITATION_DELIVERY_CHANNEL = "keycloak_execute_actions_email" as const;
const INVITATION_DELIVERY_MODE = "activation_link" as const;
export const KEYCLOAK_INVITE_EMAIL_SUBJECT = "Your Praedixa workspace is ready";

const PROOF_STATUS_PRIORITY: Record<EmailDeliveryProofStatus, number> = {
  pending: 0,
  provider_accepted: 1,
  delivery_delayed: 2,
  bounced: 3,
  complained: 3,
  failed: 3,
  delivered: 4,
};

const resendWebhookPayloadSchema = z
  .object({
    type: z.string().trim().min(1),
    created_at: z.string().trim().min(1),
    data: z
      .object({
        created_at: z.string().trim().min(1).optional(),
        email_id: z.string().trim().min(1).optional(),
        from: z.string().trim().min(1).optional().default(""),
        subject: z.string().trim().min(1).optional().default(""),
        to: z.array(z.string().trim().min(1)).optional().default([]),
        bounce: z
          .object({
            message: z.string().trim().min(1).optional(),
            type: z.string().trim().min(1).optional(),
            subType: z.string().trim().min(1).optional(),
          })
          .partial()
          .optional(),
        last_error: z
          .object({
            message: z.string().trim().min(1).optional(),
          })
          .partial()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

const CREATE_ATTEMPTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS identity_invitation_delivery_attempts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auth_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider = 'resend'),
  channel TEXT NOT NULL CHECK (channel = 'keycloak_execute_actions_email'),
  delivery TEXT NOT NULL CHECK (delivery = 'activation_link'),
  expected_subject TEXT NOT NULL,
  expected_from_email TEXT NULL,
  proof_status TEXT NOT NULL CHECK (
    proof_status IN (
      'pending',
      'provider_accepted',
      'delivery_delayed',
      'delivered',
      'bounced',
      'complained',
      'failed'
    )
  ),
  matched_event_type TEXT NULL,
  matched_event_id TEXT NULL,
  matched_email_id TEXT NULL,
  matched_event_summary TEXT NULL,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurred_at TIMESTAMPTZ NULL,
  observed_at TIMESTAMPTZ NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
`;

const CREATE_ATTEMPTS_USER_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_identity_invitation_delivery_attempts_user
  ON identity_invitation_delivery_attempts (user_id, initiated_at DESC)
`;

const CREATE_ATTEMPTS_EMAIL_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_identity_invitation_delivery_attempts_email
  ON identity_invitation_delivery_attempts ((lower(email)), initiated_at DESC)
`;

const CREATE_EVENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS identity_invitation_delivery_events (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider = 'resend'),
  webhook_id TEXT NOT NULL,
  email_id TEXT NULL,
  event_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NULL,
  from_email TEXT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  matched_attempt_id UUID NULL REFERENCES identity_invitation_delivery_attempts(id) ON DELETE SET NULL,
  payload_json JSONB NOT NULL,
  headers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, webhook_id, recipient_email)
)
`;

const CREATE_EVENTS_RECIPIENT_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_identity_invitation_delivery_events_recipient
  ON identity_invitation_delivery_events ((lower(recipient_email)), occurred_at DESC)
`;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function mailboxFromAddress(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return null;
  }

  const bracketMatch = raw.match(/<([^>]+)>/);
  const candidate = bracketMatch?.[1] ?? raw;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)
    ? candidate.toLowerCase()
    : null;
}

function eventOccurredAt(event: ResendWebhookPayload): string {
  return event.data.created_at || event.created_at;
}

function mapEventTypeToProofStatus(
  eventType: string,
): EmailDeliveryProofStatus | null {
  switch (eventType) {
    case "email.sent":
      return "provider_accepted";
    case "email.delivery_delayed":
      return "delivery_delayed";
    case "email.delivered":
      return "delivered";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.failed":
      return "failed";
    default:
      return null;
  }
}

function shouldPromoteProofStatus(
  currentStatus: EmailDeliveryProofStatus,
  nextStatus: EmailDeliveryProofStatus,
): boolean {
  return (
    (PROOF_STATUS_PRIORITY[nextStatus] ?? 0) >
    (PROOF_STATUS_PRIORITY[currentStatus] ?? 0)
  );
}

function buildProofSummary(event: ResendWebhookPayload): string | null {
  if (event.type === "email.bounced") {
    return (
      normalizeOptionalText(event.data.bounce?.message) ??
      normalizeOptionalText(event.data.bounce?.subType) ??
      normalizeOptionalText(event.data.bounce?.type)
    );
  }

  if (event.type === "email.failed") {
    return normalizeOptionalText(event.data.last_error?.message);
  }

  if (event.type === "email.delivery_delayed") {
    return "Le provider signale un retard de livraison.";
  }

  if (event.type === "email.delivered") {
    return "Le provider confirme la livraison en boite de reception.";
  }

  if (event.type === "email.sent") {
    return "Le provider a accepte le message et l'a pris en charge.";
  }

  if (event.type === "email.complained") {
    return "Le provider signale une plainte destinataire sur ce message.";
  }

  return null;
}

function mapProofRow(row: DbInvitationDeliveryProofRow): EmailDeliveryProof {
  return {
    provider: INVITATION_DELIVERY_PROVIDER,
    channel: INVITATION_DELIVERY_CHANNEL,
    delivery: INVITATION_DELIVERY_MODE,
    status: row.proof_status,
    initiatedAt: toIsoDateTime(row.initiated_at) ?? new Date().toISOString(),
    eventType: normalizeOptionalText(row.matched_event_type),
    occurredAt: toIsoDateTime(row.occurred_at),
    observedAt: toIsoDateTime(row.observed_at),
    summary: normalizeOptionalText(row.matched_event_summary),
  };
}

function normalizedHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).flatMap(([key, value]) => {
      const headerValue = Array.isArray(value) ? value[0] : value;
      if (typeof headerValue !== "string" || headerValue.trim().length === 0) {
        return [];
      }
      return [[key.toLowerCase(), headerValue]];
    }),
  );
}

function validateWebhookPayload(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): ResendWebhookPayload {
  const signer = new Webhook(secret);
  const safeHeaders = normalizedHeaders(headers);
  try {
    signer.verify(rawBody, safeHeaders);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      throw new PersistenceError(
        "Invalid Resend webhook signature.",
        401,
        "INVALID_WEBHOOK_SIGNATURE",
      );
    }
    throw error;
  }

  try {
    return resendWebhookPayloadSchema.parse(JSON.parse(rawBody));
  } catch {
    throw new PersistenceError(
      "Webhook body does not match the expected Resend payload.",
      400,
      "INVALID_WEBHOOK_PAYLOAD",
    );
  }
}

export function attachDeliveryProofToInviteRecipients(
  recipients: readonly OnboardingAccessInviteRecipient[],
  proofByUserId: ReadonlyMap<string, EmailDeliveryProof>,
  proofByEmail: ReadonlyMap<string, EmailDeliveryProof>,
): OnboardingAccessInviteRecipient[] {
  return recipients.map((recipient) => {
    const proof =
      (recipient.invitedUserId
        ? proofByUserId.get(recipient.invitedUserId)
        : undefined) ??
      proofByEmail.get(recipient.email.toLowerCase()) ??
      null;

    return {
      ...recipient,
      deliveryProof: proof,
    };
  });
}

export class InvitationDeliveryProofService {
  private schemaReady: Promise<void> | null = null;

  constructor(private readonly pool: Pool | null) {}

  hasDatabase(): boolean {
    return this.pool != null;
  }

  async ensureReady(): Promise<void> {
    await this.ensureSchema();
  }

  private getConfiguredWebhookSecret(): string {
    const secret = process.env["RESEND_WEBHOOK_SECRET"]?.trim() ?? "";
    if (!secret) {
      throw new PersistenceError(
        "RESEND_WEBHOOK_SECRET is required to verify delivery proof webhooks.",
        503,
        "DELIVERY_PROOF_NOT_CONFIGURED",
      );
    }
    return secret;
  }

  private getConfiguredSenderMailbox(): string | null {
    return (
      mailboxFromAddress(process.env["KEYCLOAK_SMTP_FROM"]) ??
      mailboxFromAddress(process.env["RESEND_FROM_EMAIL"])
    );
  }

  private async ensureSchema(): Promise<void> {
    if (!this.pool) {
      throw new PersistenceError(
        "Persistent database is not configured.",
        503,
        "PERSISTENCE_UNAVAILABLE",
      );
    }
    if (this.schemaReady) {
      await this.schemaReady;
      return;
    }
    this.schemaReady = (async () => {
      await this.pool?.query(CREATE_ATTEMPTS_TABLE_SQL);
      await this.pool?.query(CREATE_ATTEMPTS_USER_INDEX_SQL);
      await this.pool?.query(CREATE_ATTEMPTS_EMAIL_INDEX_SQL);
      await this.pool?.query(CREATE_EVENTS_TABLE_SQL);
      await this.pool?.query(CREATE_EVENTS_RECIPIENT_INDEX_SQL);
    })();
    await this.schemaReady;
  }

  async recordInvitationAttempt(
    queryable: DbQueryable,
    input: {
      organizationId: string;
      userId: string;
      authUserId: string;
      email: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<EmailDeliveryProof> {
    await this.ensureSchema();
    const result = await queryable.query<DbInvitationDeliveryProofRow>(
      `
      INSERT INTO identity_invitation_delivery_attempts (
        id,
        organization_id,
        user_id,
        auth_user_id,
        email,
        provider,
        channel,
        delivery,
        expected_subject,
        expected_from_email,
        proof_status,
        payload_json
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4,
        $5,
        'resend',
        'keycloak_execute_actions_email',
        'activation_link',
        $6,
        $7,
        'pending',
        $8::jsonb
      )
      RETURNING
        id::text,
        user_id::text,
        email,
        proof_status,
        initiated_at,
        matched_event_type,
        occurred_at,
        observed_at,
        matched_event_summary
      `,
      [
        randomUUID(),
        input.organizationId,
        input.userId,
        input.authUserId,
        normalizeEmail(input.email),
        KEYCLOAK_INVITE_EMAIL_SUBJECT,
        this.getConfiguredSenderMailbox(),
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new PersistenceError(
        "Unable to persist invitation delivery attempt.",
        500,
        "DELIVERY_PROOF_PERSISTENCE_FAILED",
      );
    }
    return mapProofRow(row);
  }

  async listLatestProofsByUserIds(
    queryable: DbQueryable,
    userIds: readonly string[],
  ): Promise<Map<string, EmailDeliveryProof>> {
    if (userIds.length === 0) {
      return new Map();
    }
    await this.ensureSchema();
    const result = await queryable.query<DbInvitationDeliveryProofRow>(
      `
      SELECT DISTINCT ON (user_id)
        id::text,
        user_id::text,
        email,
        proof_status,
        initiated_at,
        matched_event_type,
        occurred_at,
        observed_at,
        matched_event_summary
      FROM identity_invitation_delivery_attempts
      WHERE user_id = ANY($1::uuid[])
      ORDER BY user_id, initiated_at DESC
      `,
      [userIds],
    );

    return new Map(
      result.rows.map((row) => [row.user_id, mapProofRow(row)] as const),
    );
  }

  async listLatestProofsByEmails(
    queryable: DbQueryable,
    organizationId: string,
    emails: readonly string[],
  ): Promise<Map<string, EmailDeliveryProof>> {
    const normalizedEmails = Array.from(
      new Set(emails.map((email) => normalizeEmail(email)).filter(Boolean)),
    );
    if (normalizedEmails.length === 0) {
      return new Map();
    }
    await this.ensureSchema();
    const result = await queryable.query<DbInvitationDeliveryProofRow>(
      `
      SELECT DISTINCT ON (lower(email))
        id::text,
        user_id::text,
        email,
        proof_status,
        initiated_at,
        matched_event_type,
        occurred_at,
        observed_at,
        matched_event_summary
      FROM identity_invitation_delivery_attempts
      WHERE organization_id = $1::uuid
        AND lower(email) = ANY($2::text[])
      ORDER BY lower(email), initiated_at DESC
      `,
      [organizationId, normalizedEmails],
    );

    return new Map(
      result.rows.map(
        (row) => [row.email.toLowerCase(), mapProofRow(row)] as const,
      ),
    );
  }

  async ingestResendWebhook(input: {
    rawBody: string;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<{
    eventType: string;
    storedEvents: number;
    matchedAttempts: number;
  }> {
    await this.ensureSchema();
    const secret = this.getConfiguredWebhookSecret();
    const payload = validateWebhookPayload(
      input.rawBody,
      input.headers,
      secret,
    );
    const providerStatus = mapEventTypeToProofStatus(payload.type);
    const fromEmail = mailboxFromAddress(payload.data.from);
    const subject = normalizeOptionalText(payload.data.subject);
    const occurredAt = eventOccurredAt(payload);
    const headersJson = normalizedHeaders(input.headers);
    const uniqueRecipients = Array.from(
      new Set(payload.data.to.map((entry) => normalizeEmail(entry))),
    );

    if (!this.pool) {
      throw new PersistenceError(
        "Persistent database is not configured.",
        503,
        "PERSISTENCE_UNAVAILABLE",
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      let storedEvents = 0;
      let matchedAttempts = 0;

      for (const recipientEmail of uniqueRecipients) {
        const eventInsert = await client.query<DbInvitationDeliveryEventRow>(
          `
          INSERT INTO identity_invitation_delivery_events (
            id,
            provider,
            webhook_id,
            email_id,
            event_type,
            recipient_email,
            subject,
            from_email,
            occurred_at,
            payload_json,
            headers_json
          )
          VALUES (
            $1::uuid,
            'resend',
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8::timestamptz,
            $9::jsonb,
            $10::jsonb
          )
          ON CONFLICT (provider, webhook_id, recipient_email)
          DO UPDATE SET
            payload_json = EXCLUDED.payload_json,
            headers_json = EXCLUDED.headers_json
          RETURNING id::text, matched_attempt_id::text
          `,
          [
            randomUUID(),
            headersJson["svix-id"] ?? "",
            normalizeOptionalText(payload.data.email_id),
            payload.type,
            recipientEmail,
            subject,
            fromEmail,
            occurredAt,
            JSON.stringify(payload),
            JSON.stringify(headersJson),
          ],
        );
        const eventRow = eventInsert.rows[0];
        if (!eventRow) {
          continue;
        }
        storedEvents += 1;

        if (
          providerStatus == null ||
          subject !== KEYCLOAK_INVITE_EMAIL_SUBJECT ||
          uniqueRecipients.length === 0
        ) {
          continue;
        }

        const attemptResult = await client.query<
          DbInvitationDeliveryProofRow & { matched_event_id: string | null }
        >(
          `
          SELECT
            id::text,
            user_id::text,
            email,
            proof_status,
            initiated_at,
            matched_event_type,
            occurred_at,
            observed_at,
            matched_event_summary,
            matched_event_id
          FROM identity_invitation_delivery_attempts
          WHERE lower(email) = $1
            AND channel = 'keycloak_execute_actions_email'
            AND delivery = 'activation_link'
            AND expected_subject = $2
            AND ($3::text IS NULL OR expected_from_email IS NULL OR expected_from_email = $3)
            AND initiated_at <= $4::timestamptz + INTERVAL '5 minutes'
          ORDER BY initiated_at DESC
          LIMIT 1
          `,
          [
            recipientEmail,
            KEYCLOAK_INVITE_EMAIL_SUBJECT,
            fromEmail,
            occurredAt,
          ],
        );
        const attempt = attemptResult.rows[0];
        if (!attempt) {
          continue;
        }

        if (
          attempt.matched_event_id !== eventRow.id &&
          !shouldPromoteProofStatus(attempt.proof_status, providerStatus)
        ) {
          continue;
        }

        const summary = buildProofSummary(payload);
        await client.query(
          `
          UPDATE identity_invitation_delivery_attempts
          SET
            proof_status = $2,
            matched_event_type = $3,
            matched_event_id = $4,
            matched_email_id = $5,
            matched_event_summary = $6,
            occurred_at = $7::timestamptz,
            observed_at = NOW(),
            updated_at = NOW()
          WHERE id = $1::uuid
          `,
          [
            attempt.id,
            providerStatus,
            payload.type,
            eventRow.id,
            normalizeOptionalText(payload.data.email_id),
            summary,
            occurredAt,
          ],
        );
        await client.query(
          `
          UPDATE identity_invitation_delivery_events
          SET matched_attempt_id = $2::uuid
          WHERE id = $1::uuid
          `,
          [eventRow.id, attempt.id],
        );
        matchedAttempts += 1;
      }

      await client.query("COMMIT");
      return {
        eventType: payload.type,
        storedEvents,
        matchedAttempts,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw mapPersistenceError(
        error,
        "DELIVERY_PROOF_INGEST_FAILED",
        "Unable to persist invitation delivery proof.",
      );
    } finally {
      client.release();
    }
  }
}

let singleton: InvitationDeliveryProofService | null = null;

export function getInvitationDeliveryProofService(
  pool: Pool | null = null,
): InvitationDeliveryProofService {
  if (pool) {
    return new InvitationDeliveryProofService(pool);
  }
  if (!singleton) {
    singleton = new InvitationDeliveryProofService(getPersistencePool());
  }
  return singleton;
}
