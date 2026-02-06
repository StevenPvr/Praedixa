-- verify_roles_and_grants.sql
-- P0-09: Verify PostgreSQL role hierarchy and grant matrix.
--
-- Usage:
--   psql -h <host> -U <user> -d <db> -f scripts/verify_roles_and_grants.sql
--
-- Checks:
--   1. All 18 expected roles exist (12 group + 6 login)
--   2. Role membership (login -> group) is correct
--   3. Table grants match design doc Section 7.2
--   4. ALTER DEFAULT PRIVILEGES are set for praedixa_owner
--   5. praedixa_owner owns all platform tables

\echo '=== Roles & Grants Verification (P0-09) ==='
\echo ''

-- ──────────────────────────────────────────────
-- 1. Check all 18 expected roles exist
-- ──────────────────────────────────────────────
\echo '--- 1. Expected roles ---'

WITH expected_roles(name, should_login) AS (
  VALUES
    -- Group roles (NOLOGIN)
    ('praedixa_owner', false),
    ('praedixa_platform_reader', false),
    ('praedixa_platform_writer', false),
    ('praedixa_catalog_reader', false),
    ('praedixa_catalog_writer', false),
    ('praedixa_client_raw_reader', false),
    ('praedixa_client_transformed_reader', false),
    ('praedixa_transform_engine', false),
    ('praedixa_ingestion', false),
    ('praedixa_provisioner', false),
    ('praedixa_migrator', false),
    ('praedixa_audit_writer', false),
    -- Login roles
    ('praedixa_api', true),
    ('praedixa_api_admin', true),
    ('praedixa_etl', true),
    ('praedixa_ingest', true),
    ('praedixa_provision', true),
    ('praedixa_migrate', true),
    ('praedixa_support', true)
)
SELECT
  e.name AS expected_role,
  CASE WHEN r.rolname IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status,
  CASE
    WHEN r.rolname IS NULL THEN 'N/A'
    WHEN r.rolcanlogin = e.should_login THEN 'OK'
    ELSE 'MISMATCH (expected login=' || e.should_login::text || ')'
  END AS login_check
FROM expected_roles e
LEFT JOIN pg_roles r ON r.rolname = e.name
ORDER BY e.should_login, e.name;

\echo ''

-- ──────────────────────────────────────────────
-- 2. Role membership (who is granted to whom)
-- ──────────────────────────────────────────────
\echo '--- 2. Role memberships ---'

SELECT
  m.roleid::regrole AS group_role,
  m.member::regrole AS member_role,
  m.admin_option
FROM pg_auth_members m
WHERE m.roleid::regrole::text LIKE 'praedixa_%'
ORDER BY group_role, member_role;

\echo ''

-- ──────────────────────────────────────────────
-- 3. Table-level grants on platform tables
-- ──────────────────────────────────────────────
\echo '--- 3. Table grants (information_schema) ---'

SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee LIKE 'praedixa_%'
  AND table_schema IN ('public', 'platform', 'audit')
ORDER BY table_schema, table_name, grantee, privilege_type;

\echo ''

-- ──────────────────────────────────────────────
-- 4. ALTER DEFAULT PRIVILEGES for praedixa_owner
-- ──────────────────────────────────────────────
\echo '--- 4. Default ACLs (ALTER DEFAULT PRIVILEGES) ---'

SELECT
  pg_catalog.pg_get_userbyid(d.defaclrole) AS owner_role,
  d.defaclnamespace::regnamespace AS schema,
  CASE d.defaclobjtype
    WHEN 'r' THEN 'TABLE'
    WHEN 'S' THEN 'SEQUENCE'
    WHEN 'f' THEN 'FUNCTION'
    WHEN 'T' THEN 'TYPE'
    WHEN 'n' THEN 'SCHEMA'
  END AS object_type,
  pg_catalog.array_to_string(d.defaclacl, E'\n') AS default_acl
FROM pg_catalog.pg_default_acl d
WHERE pg_catalog.pg_get_userbyid(d.defaclrole) LIKE 'praedixa_%'
ORDER BY owner_role, schema, object_type;

\echo ''

-- ──────────────────────────────────────────────
-- 5. Verify praedixa_owner owns all tables
-- ──────────────────────────────────────────────
\echo '--- 5. Table ownership check ---'

SELECT
  schemaname,
  tablename,
  tableowner,
  CASE
    WHEN tableowner = 'praedixa_owner' THEN 'OK'
    ELSE 'NOT owned by praedixa_owner'
  END AS ownership_check
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;

\echo ''

-- ──────────────────────────────────────────────
-- 6. Schema-level grants (for client schemas)
-- ──────────────────────────────────────────────
\echo '--- 6. Schema-level USAGE grants ---'

SELECT
  nspname AS schema_name,
  pg_catalog.array_to_string(nspacl, E'\n') AS acl
FROM pg_catalog.pg_namespace
WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY nspname;

\echo ''
\echo '=== Verification complete ==='
