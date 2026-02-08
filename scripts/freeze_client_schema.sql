-- freeze_client_schema.sql
-- P0-07: Emergency freeze of a client schema during an incident.
--
-- Usage:
--   psql -h <host> -U <superuser> -d <db> \
--     -v client_slug='acme' \
--     -f scripts/freeze_client_schema.sql
--
-- Security:
-- - Identifiers are built with format('%I', ...) to prevent SQL injection.
-- - This script is intended for privileged operators only.

\set ON_ERROR_STOP on

\echo '=== INCIDENT FREEZE: Schema :client_slug ==='
\echo 'Timestamp:'
SELECT now() AS freeze_started_at;

SELECT
  format('%I', :'client_slug' || '_raw') AS raw_schema,
  format('%I', :'client_slug' || '_transformed') AS transformed_schema
\gset

DO $$
DECLARE
  raw_schema text := :'raw_schema';
  transformed_schema text := :'transformed_schema';
BEGIN
  -- 1) Revoke schema-level privileges.
  EXECUTE format(
    'REVOKE ALL ON SCHEMA %s FROM praedixa_client_raw_reader',
    raw_schema
  );
  EXECUTE format(
    'REVOKE ALL ON SCHEMA %s FROM praedixa_transform_engine',
    raw_schema
  );
  EXECUTE format(
    'REVOKE ALL ON SCHEMA %s FROM praedixa_ingestion',
    raw_schema
  );

  EXECUTE format(
    'REVOKE ALL ON SCHEMA %s FROM praedixa_client_transformed_reader',
    transformed_schema
  );
  EXECUTE format(
    'REVOKE ALL ON SCHEMA %s FROM praedixa_transform_engine',
    transformed_schema
  );

  -- 2) Revoke table-level privileges defensively.
  EXECUTE format(
    'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA %s ' ||
    'FROM praedixa_client_raw_reader, praedixa_transform_engine, praedixa_ingestion',
    raw_schema
  );
  EXECUTE format(
    'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA %s ' ||
    'FROM praedixa_client_transformed_reader, praedixa_transform_engine',
    transformed_schema
  );
END
$$;

-- 3) Best-effort active session termination on target schemas.
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
