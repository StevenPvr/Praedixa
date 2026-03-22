CREATE TABLE identity_invitation_delivery_attempts (
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
);

CREATE INDEX idx_identity_invitation_delivery_attempts_user
  ON identity_invitation_delivery_attempts (user_id, initiated_at DESC);

CREATE INDEX idx_identity_invitation_delivery_attempts_email
  ON identity_invitation_delivery_attempts ((lower(email)), initiated_at DESC);

CREATE TABLE identity_invitation_delivery_events (
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
);

CREATE INDEX idx_identity_invitation_delivery_events_recipient
  ON identity_invitation_delivery_events ((lower(recipient_email)), occurred_at DESC);
