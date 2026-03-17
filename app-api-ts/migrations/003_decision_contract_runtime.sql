CREATE TABLE IF NOT EXISTS decision_contract_versions (
  organization_id UUID NOT NULL,
  contract_id TEXT NOT NULL,
  contract_version INTEGER NOT NULL CHECK (contract_version >= 1),
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'testing', 'approved', 'published', 'archived')
  ),
  pack TEXT NOT NULL CHECK (pack IN ('coverage', 'flow', 'allocation', 'core')),
  workspace_id TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contract_json JSONB NOT NULL,
  PRIMARY KEY (organization_id, contract_id, contract_version)
);

CREATE INDEX IF NOT EXISTS idx_decision_contract_versions_scope
ON decision_contract_versions (
  organization_id,
  status,
  pack,
  updated_at DESC
);

CREATE TABLE IF NOT EXISTS decision_contract_audit (
  audit_id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  contract_id TEXT NOT NULL,
  contract_version INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'contract_saved',
      'contract_transitioned',
      'contract_forked',
      'contract_rolled_back'
    )
  ),
  actor_user_id TEXT NOT NULL,
  request_id TEXT NULL,
  before_contract_json JSONB NULL,
  after_contract_json JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_contract_audit_scope
ON decision_contract_audit (
  organization_id,
  contract_id,
  contract_version,
  created_at DESC
);
