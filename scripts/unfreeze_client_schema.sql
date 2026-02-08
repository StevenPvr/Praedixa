-- unfreeze_client_schema.sql
-- P0-07: Restore standard grants after an incident freeze.
--
-- Usage:
--   psql -h <host> -U <superuser> -d <db> \
--     -v client_slug='acme' \
--     -f scripts/unfreeze_client_schema.sql
--
-- Security:
-- - Identifiers are built with format('%I', ...) to prevent SQL injection.
-- - This script is intended for privileged operators only.

\set ON_ERROR_STOP on

\echo '=== INCIDENT UNFREEZE: Schema :client_slug ==='
\echo 'Timestamp:'
SELECT now() AS unfreeze_started_at;

SELECT
  format('%I', :'client_slug' || '_raw') AS raw_schema,
  format('%I', :'client_slug' || '_transformed') AS transformed_schema
\gset

DO $$
DECLARE
  raw_schema text := :'raw_schema';
  transformed_schema text := :'transformed_schema';
BEGIN
  -- 1) Defensive public revocation.
  EXECUTE format('REVOKE ALL ON SCHEMA %s FROM PUBLIC', raw_schema);
  EXECUTE format('REVOKE ALL ON SCHEMA %s FROM PUBLIC', transformed_schema);

  -- 2) Ensure ownership.
  EXECUTE format('ALTER SCHEMA %s OWNER TO praedixa_owner', raw_schema);
  EXECUTE format('ALTER SCHEMA %s OWNER TO praedixa_owner', transformed_schema);

  -- 3) Schema usage grants.
  EXECUTE format(
    'GRANT USAGE ON SCHEMA %s TO praedixa_ingestion, praedixa_transform_engine, praedixa_client_raw_reader',
    raw_schema
  );
  EXECUTE format(
    'GRANT USAGE ON SCHEMA %s TO praedixa_transform_engine, praedixa_client_transformed_reader',
    transformed_schema
  );

  -- 4) Default privileges for future tables.
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA %s ' ||
    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO praedixa_ingestion',
    raw_schema
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA %s ' ||
    'GRANT SELECT ON TABLES TO praedixa_transform_engine',
    raw_schema
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA %s ' ||
    'GRANT SELECT ON TABLES TO praedixa_client_raw_reader',
    raw_schema
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA %s ' ||
    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO praedixa_transform_engine',
    transformed_schema
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA %s ' ||
    'GRANT SELECT ON TABLES TO praedixa_client_transformed_reader',
    transformed_schema
  );

  -- 5) Grants on existing tables.
  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %s TO praedixa_ingestion',
    raw_schema
  );
  EXECUTE format(
    'GRANT SELECT ON ALL TABLES IN SCHEMA %s TO praedixa_transform_engine',
    raw_schema
  );
  EXECUTE format(
    'GRANT SELECT ON ALL TABLES IN SCHEMA %s TO praedixa_client_raw_reader',
    raw_schema
  );
  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %s TO praedixa_transform_engine',
    transformed_schema
  );
  EXECUTE format(
    'GRANT SELECT ON ALL TABLES IN SCHEMA %s TO praedixa_client_transformed_reader',
    transformed_schema
  );
END
$$;

\echo ''
\echo '=== UNFREEZE COMPLETE for :client_slug ==='
\echo 'Verify with: \dn+ :client_slug_raw ; \dn+ :client_slug_transformed'
SELECT now() AS unfreeze_completed_at;
