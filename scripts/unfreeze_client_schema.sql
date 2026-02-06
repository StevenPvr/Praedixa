-- unfreeze_client_schema.sql
-- P0-07: Restore standard grants after an incident freeze.
--
-- Re-applies the exact grant template from design doc Section 7.2.
-- This MUST match the provisioning template used by Schema Manager.
--
-- Usage:
--   psql -h <host> -U <superuser> -d <db> \
--     -v client_slug='acme' \
--     -f scripts/unfreeze_client_schema.sql
--
-- Parameters:
--   :client_slug — The client slug (e.g., 'acme'). Schemas are
--                  {slug}_raw and {slug}_transformed.
--
-- IMPORTANT: This script must be run by a superuser or praedixa_owner.

\echo '=== INCIDENT UNFREEZE: Schema :client_slug ==='
\echo 'Timestamp:'
SELECT now() AS unfreeze_started_at;

-- ──────────────────────────────────────────────
-- 1. Revoke public access (defensive)
-- ──────────────────────────────────────────────
REVOKE ALL ON SCHEMA :client_slug _raw FROM PUBLIC;
REVOKE ALL ON SCHEMA :client_slug _transformed FROM PUBLIC;

-- ──────────────────────────────────────────────
-- 2. Ensure ownership
-- ──────────────────────────────────────────────
ALTER SCHEMA :client_slug _raw OWNER TO praedixa_owner;
ALTER SCHEMA :client_slug _transformed OWNER TO praedixa_owner;

-- ──────────────────────────────────────────────
-- 3. Schema USAGE grants
-- ──────────────────────────────────────────────
\echo '--- Restoring schema USAGE grants ---'

GRANT USAGE ON SCHEMA :client_slug _raw
  TO praedixa_ingestion, praedixa_transform_engine, praedixa_client_raw_reader;

GRANT USAGE ON SCHEMA :client_slug _transformed
  TO praedixa_transform_engine, praedixa_client_transformed_reader;

-- ──────────────────────────────────────────────
-- 4. ALTER DEFAULT PRIVILEGES for praedixa_owner
--    (ensures future tables created by owner inherit grants)
-- ──────────────────────────────────────────────
\echo '--- Restoring default privileges ---'

-- _raw: ingestion gets full CRUD
ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA :client_slug _raw
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO praedixa_ingestion;

-- _raw: transform engine gets read-only
ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA :client_slug _raw
  GRANT SELECT ON TABLES TO praedixa_transform_engine;

-- _raw: client raw reader gets read-only
ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA :client_slug _raw
  GRANT SELECT ON TABLES TO praedixa_client_raw_reader;

-- _transformed: transform engine gets full CRUD
ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA :client_slug _transformed
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO praedixa_transform_engine;

-- _transformed: client transformed reader gets read-only
ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA :client_slug _transformed
  GRANT SELECT ON TABLES TO praedixa_client_transformed_reader;

-- ──────────────────────────────────────────────
-- 5. Grant on EXISTING tables (default privileges only cover future tables)
-- ──────────────────────────────────────────────
\echo '--- Granting on existing tables ---'

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA :client_slug _raw
  TO praedixa_ingestion;
GRANT SELECT ON ALL TABLES IN SCHEMA :client_slug _raw
  TO praedixa_transform_engine;
GRANT SELECT ON ALL TABLES IN SCHEMA :client_slug _raw
  TO praedixa_client_raw_reader;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA :client_slug _transformed
  TO praedixa_transform_engine;
GRANT SELECT ON ALL TABLES IN SCHEMA :client_slug _transformed
  TO praedixa_client_transformed_reader;

\echo ''
\echo '=== UNFREEZE COMPLETE for :client_slug ==='
\echo 'Verify with: \dn+ :client_slug_raw ; \dn+ :client_slug_transformed'
SELECT now() AS unfreeze_completed_at;
