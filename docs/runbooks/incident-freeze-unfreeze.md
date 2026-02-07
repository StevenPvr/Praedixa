# Runbook: Client Schema Freeze / Unfreeze

**Owner:** SecOps
**P0 Ticket:** DF-SEC-P0-07
**Last Updated:** 2026-02-06
**SLA:** Freeze must complete within 5 minutes of incident declaration.

---

## Purpose

Immediately isolate a client's data schemas during a security incident (data breach, unauthorized access, compromised credentials) by revoking all PostgreSQL grants from group roles.

## Pre-conditions

- [ ] You have `superuser` or `praedixa_owner` access to the target database
- [ ] You know the **client slug** (e.g., `acme`)
- [ ] The schemas `{slug}_raw` and `{slug}_transformed` exist
- [ ] Incident has been declared in the incident channel (Slack/PagerDuty)
- [ ] At least one engineer is available to verify the freeze

## Freeze Procedure

### Step 1: Declare the incident

Notify the team in `#incidents`:

```
INCIDENT: Initiating schema freeze for client {slug}. Reason: {reason}.
```

### Step 2: Execute the freeze script

```bash
psql -h <DB_HOST> -U <SUPERUSER> -d praedixa \
  -v client_slug='acme' \
  -f scripts/freeze_client_schema.sql
```

The script performs 3 actions:

1. **REVOKE ALL** on schema from group roles (`praedixa_client_raw_reader`, `praedixa_transform_engine`, `praedixa_ingestion`, `praedixa_client_transformed_reader`)
2. **REVOKE ALL PRIVILEGES** on all tables in both schemas (defensive)
3. **pg_terminate_backend** for active sessions querying the target schemas

### Step 3: Verify the freeze

Run these verification queries:

```sql
-- Check schema grants are revoked
\dn+ acme_raw
\dn+ acme_transformed

-- Verify no active connections to target schemas
SELECT pid, usename, state, query
  FROM pg_stat_activity
 WHERE datname = current_database()
   AND (query ILIKE '%acme_raw.%' OR query ILIKE '%acme_transformed.%');

-- Attempt a read as praedixa_api (should fail)
SET ROLE praedixa_api;
SELECT * FROM acme_raw.effectifs LIMIT 1;
-- Expected: ERROR: permission denied for schema acme_raw
RESET ROLE;
```

### Step 4: Confirm in incident channel

```
CONFIRMED: Schema freeze complete for {slug} at {timestamp}.
- Schema USAGE: revoked
- Table privileges: revoked
- Active sessions: terminated ({N} sessions killed)
```

---

## Unfreeze Procedure

### Pre-conditions for unfreeze

- [ ] Root cause has been identified and resolved
- [ ] Security lead has approved the unfreeze
- [ ] Incident post-mortem is scheduled (can be after unfreeze)

### Step 1: Execute the unfreeze script

```bash
psql -h <DB_HOST> -U <SUPERUSER> -d praedixa \
  -v client_slug='acme' \
  -f scripts/unfreeze_client_schema.sql
```

The script restores the exact grant template from the design doc (Section 7.2):

1. Revokes PUBLIC access (defensive)
2. Ensures schema ownership by `praedixa_owner`
3. Restores USAGE grants to group roles
4. Re-applies ALTER DEFAULT PRIVILEGES for future tables
5. Grants on existing tables (default privileges only cover future objects)

### Step 2: Verify the unfreeze

```sql
-- Check grants are restored
\dn+ acme_raw
\dn+ acme_transformed

-- Test read as praedixa_api (should succeed)
SET ROLE praedixa_api;
SELECT count(*) FROM acme_raw.effectifs;
-- Expected: returns row count
RESET ROLE;

-- Test write as praedixa_ingest (should succeed)
SET ROLE praedixa_ingest;
INSERT INTO acme_raw.effectifs (id, date, value)
  VALUES (gen_random_uuid(), now(), 0);
DELETE FROM acme_raw.effectifs WHERE value = 0;
RESET ROLE;

-- Test transform engine read _raw + write _transformed
SET ROLE praedixa_etl;
SELECT count(*) FROM acme_raw.effectifs;
-- Expected: returns row count
RESET ROLE;
```

### Step 3: Confirm in incident channel

```
RESOLVED: Schema unfreeze complete for {slug} at {timestamp}.
- All standard grants restored per design doc Section 7.2.
- Verified: API read OK, ingestion write OK, ETL read/write OK.
- Post-mortem scheduled for {date}.
```

---

## Rollback

If the freeze script fails partway through:

- The partially revoked state is still safer than the pre-freeze state
- Re-run the freeze script (all REVOKE statements are idempotent)
- If schema names are wrong, verify with `\dn` and correct the `client_slug` variable

If the unfreeze script fails partway through:

- Re-run the unfreeze script (all GRANT statements are idempotent)
- If ownership is incorrect, fix manually: `ALTER SCHEMA {slug}_raw OWNER TO praedixa_owner;`

---

## Post-Incident Review

Within 48 hours of unfreeze:

1. **Timeline**: Document exact timestamps of detection, freeze, investigation, resolution, unfreeze
2. **Root cause**: What happened and why
3. **Impact**: Which data was potentially exposed, for how long
4. **Remediation**: What was done to fix the root cause
5. **Prevention**: What changes prevent recurrence (monitoring, access controls, code changes)
6. **RGPD notification**: If personal data was breached, assess whether CNIL notification is required (72h deadline from discovery)

Store the post-mortem in `docs/security-evidence/incident-{date}-{slug}.md`.
