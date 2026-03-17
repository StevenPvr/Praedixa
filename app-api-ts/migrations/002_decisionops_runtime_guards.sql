DO $$
BEGIN
  IF to_regclass('public.action_dispatches') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_action_dispatches_org_idempotency
      ON action_dispatches (organization_id, idempotency_key);
  END IF;
END $$;
