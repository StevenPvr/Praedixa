-- Decision config versioning + audit

CREATE TABLE decision_engine_config_versions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  site_id TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'active', 'cancelled')),
  effective_at TIMESTAMPTZ NOT NULL,
  activated_at TIMESTAMPTZ NULL,
  payload JSONB NOT NULL,
  rollback_from_version_id TEXT NULL,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_decision_config_versions_scope
  ON decision_engine_config_versions (
    organization_id,
    site_id,
    status,
    effective_at
  );

CREATE INDEX idx_decision_config_versions_recent
  ON decision_engine_config_versions (
    organization_id,
    site_id,
    created_at DESC
  );

CREATE TABLE decision_engine_config_audit (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  site_id TEXT NULL,
  action TEXT NOT NULL,
  actor_user_id TEXT NULL,
  request_id TEXT NULL,
  target_version_id TEXT NULL,
  before_payload JSONB NULL,
  after_payload JSONB NULL,
  metadata JSONB NOT NULL DEFAULT CAST('{}' AS JSONB),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_decision_config_audit_scope
  ON decision_engine_config_audit (
    organization_id,
    site_id,
    created_at DESC
  );
