CREATE TABLE decision_contract_versions (
  organization_id TEXT NOT NULL,
  contract_id TEXT NOT NULL,
  contract_version INTEGER NOT NULL CHECK (contract_version >= 1),
  id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'testing', 'approved', 'published', 'archived')
  ),
  pack TEXT NOT NULL CHECK (pack IN ('coverage', 'flow', 'allocation', 'core')),
  workspace_id TEXT NULL,
  payload JSONB NOT NULL,
  created_by TEXT NULL,
  updated_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, contract_id, contract_version)
);

CREATE UNIQUE INDEX idx_decision_contract_versions_id
  ON decision_contract_versions (id);

CREATE INDEX idx_decision_contract_versions_scope
  ON decision_contract_versions (
    organization_id,
    workspace_id,
    status,
    pack,
    updated_at DESC
  );

CREATE TABLE decision_contract_audit (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  workspace_id TEXT NULL,
  contract_id TEXT NOT NULL,
  contract_version INTEGER NULL,
  action TEXT NOT NULL,
  actor_user_id TEXT NULL,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT CAST('{}' AS JSONB),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_decision_contract_audit_scope
  ON decision_contract_audit (
    organization_id,
    contract_id,
    contract_version,
    created_at DESC
  );
