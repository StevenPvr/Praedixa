CREATE UNIQUE INDEX idx_action_dispatches_org_idempotency
  ON action_dispatches (organization_id, idempotency_key);
