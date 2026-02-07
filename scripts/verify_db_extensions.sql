-- verify_db_extensions.sql
-- P0-09: Verify required and optional PostgreSQL extensions.
--
-- Usage:
--   psql -h <host> -U <user> -d <db> -f scripts/verify_db_extensions.sql
--
-- Exit behavior:
--   RAISES EXCEPTION if pgcrypto is missing (mandatory).
--   Prints advisory messages for optional extensions.

\echo '=== DB Extensions Verification (P0-09) ==='
\echo ''

-- 1. pgcrypto — MANDATORY for AES-256-GCM encryption of PII columns
\echo '--- pgcrypto (MANDATORY) ---'
SELECT extname, extversion
  FROM pg_extension
 WHERE extname = 'pgcrypto';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    RAISE EXCEPTION
      'MANDATORY extension pgcrypto is NOT installed. '
      'Install with: CREATE EXTENSION IF NOT EXISTS pgcrypto;';
  ELSE
    RAISE NOTICE 'pgcrypto: OK (installed)';
  END IF;
END $$;

\echo ''

-- 2. pg_cron — OPTIONAL for scheduled refit/retention jobs
--    Fallback: external scheduler (CI runner, Scaleway Jobs, K8s CronJob)
\echo '--- pg_cron (OPTIONAL) ---'
SELECT extname, extversion
  FROM pg_extension
 WHERE extname = 'pg_cron';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron: NOT available — use external scheduler for refit/retention jobs';
  ELSE
    RAISE NOTICE 'pg_cron: OK (installed)';
  END IF;
END $$;

\echo ''

-- 3. pgaudit — OPTIONAL for statement-level audit logging
--    Fallback: application-level audit (audit.events table) + DB server logs
\echo '--- pgaudit (OPTIONAL) ---'
SELECT extname, extversion
  FROM pg_extension
 WHERE extname = 'pgaudit';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgaudit'
  ) THEN
    RAISE NOTICE 'pgaudit: NOT available — rely on application audit trail + DB logs';
  ELSE
    RAISE NOTICE 'pgaudit: OK (installed)';
  END IF;
END $$;

\echo ''

-- 4. Summary: list ALL installed extensions for reference
\echo '--- All installed extensions ---'
SELECT extname, extversion, extnamespace::regnamespace AS schema
  FROM pg_extension
 ORDER BY extname;

\echo ''
\echo '=== Verification complete ==='
