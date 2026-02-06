-- freeze_client_schema.sql
-- P0-07: Emergency freeze of a client schema during an incident.
--
-- Revokes ALL access from GROUP roles (not login roles) to ensure
-- inherited permissions are fully cut off.
--
-- Usage:
--   psql -h <host> -U <superuser> -d <db> \
--     -v client_slug='acme' \
--     -f scripts/freeze_client_schema.sql
--
-- Parameters:
--   :client_slug — The client slug (e.g., 'acme'). Schemas are
--                  {slug}_raw and {slug}_transformed.
--
-- IMPORTANT: This script must be run by a superuser or the schema owner.
-- After execution, verify with: \dn+ {slug}_raw ; \dn+ {slug}_transformed

\echo '=== INCIDENT FREEZE: Schema :client_slug ==='
\echo 'Timestamp:'
SELECT now() AS freeze_started_at;

-- ──────────────────────────────────────────────
-- 1. Revoke SCHEMA-level USAGE from group roles
-- ──────────────────────────────────────────────
\echo '--- Revoking schema-level privileges ---'

-- _raw schema: revoke from all readers + writers
REVOKE ALL ON SCHEMA :client_slug _raw FROM praedixa_client_raw_reader;
REVOKE ALL ON SCHEMA :client_slug _raw FROM praedixa_transform_engine;
REVOKE ALL ON SCHEMA :client_slug _raw FROM praedixa_ingestion;

-- _transformed schema: revoke from all readers + writers
REVOKE ALL ON SCHEMA :client_slug _transformed FROM praedixa_client_transformed_reader;
REVOKE ALL ON SCHEMA :client_slug _transformed FROM praedixa_transform_engine;

-- ──────────────────────────────────────────────
-- 2. Revoke TABLE-level privileges defensively
--    (in case tables had direct grants)
-- ──────────────────────────────────────────────
\echo '--- Revoking table-level privileges ---'

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA :client_slug _raw
  FROM praedixa_client_raw_reader, praedixa_transform_engine, praedixa_ingestion;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA :client_slug _transformed
  FROM praedixa_client_transformed_reader, praedixa_transform_engine;

-- ──────────────────────────────────────────────
-- 3. Terminate active sessions querying target schemas
--    (best-effort — only kills currently running queries)
-- ──────────────────────────────────────────────
\echo '--- Terminating active sessions on target schemas ---'

SELECT pg_terminate_backend(pid), pid, usename, state, query
  FROM pg_stat_activity
 WHERE datname = current_database()
   AND pid <> pg_backend_pid()
   AND (
     query ILIKE '%' || :'client_slug' || '_raw.%'
     OR query ILIKE '%' || :'client_slug' || '_transformed.%'
   );

\echo ''
\echo '=== FREEZE COMPLETE for :client_slug ==='
\echo 'Verify with: \dn+ :client_slug_raw ; \dn+ :client_slug_transformed'
SELECT now() AS freeze_completed_at;
