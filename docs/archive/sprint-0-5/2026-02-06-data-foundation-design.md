# Document 1 — Data Foundation Design Document (UPDATED)

**Date:** 6 February 2026
**Revision:** 1.1 (design hardening + dev-start completeness pass)
**Status:** ACTIVE — implementation kickoff approved (Phase 0 hardening + scaffolding)
**Security Review:** GO for controlled development start with synthetic data only. NO-GO for real client HR data until Gate P0 closure.
**Author:** Praedixa Engineering
**Classification:** Internal / Confidential

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Catalog (Platform Schema)](#3-data-catalog-platform-schema)
4. [Dynamic Tables (Raw + Transformed)](#4-dynamic-tables-raw--transformed)
5. [Transform Engine](#5-transform-engine)
6. [Metadata Configuration](#6-metadata-configuration)
7. [Security](#7-security)
8. [RGPD Compliance](#8-rgpd-compliance)
9. [Threat Model (STRIDE)](#9-threat-model-stride)
10. [Incident Response](#10-incident-response)
11. [Infrastructure](#11-infrastructure)
12. [Files to Create](#12-files-to-create)
13. [Implementation Readiness Gate](#13-implementation-readiness-gate)

---

## 1. Overview

### What

The Data Foundation is the transformation and storage layer that sits between clean client data and the forecasting pipeline + webapp.

### Why

Praedixa provides capacity forecasting (human + merchandise) for logistics companies. Client data must be:

- Stored securely (RGPD-compliant, HR data classified as sensitive by CNIL)
- Transformed into ML-ready features (normalization, lags, rolling windows)
- Served to two audiences with strict access separation:
  - **Client webapp**: sees original data (`_raw`) with PII masked at API level. Cannot see transformed data (Praedixa IP).
  - **Admin webapp + ML pipeline**: sees transformed data (`_transformed`). Admin can also see raw.

### Scope

- Schema-per-client isolation in PostgreSQL 16
- Configurable transformation pipeline (toggleable per dataset and per column)
- Incremental transforms (per shift, up to 3x/day) + weekly full refit
- RGPD compliance: encryption, pseudonymization, audit, erasure, export

### Out of Scope

- Upstream data filtering/ingestion (handled by separate system)
- ML model training and inference (separate pipeline, consumes `_transformed`)
- Admin UI for metadata management (future work)

### Key Decisions

| Decision                        | Choice                                                         | Rationale                                                                |
| ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Client sees raw or transformed? | **Raw only** (with PII masking)                                | Transformed data is Praedixa IP; client needs to verify their input data |
| Multi-org users?                | **No. 1 user = 1 org**                                         | Simplifies isolation, sufficient for B2B logistics                       |
| Backup erasure strategy         | **Crypto-shredding + 30-day expiration**                       | Immediate cryptographic erasure + physical cleanup                       |
| Refit access control            | **Admin Praedixa + cron only**                                 | Client cannot trigger recalculations                                     |
| DPIA status                     | **Must be filed with CNIL BEFORE any real HR data processing** | Legal blocker for production                                             |
| Per-org key management          | **External per-org DEKs (Secrets/KMS), not DB-stored**         | Crypto-shredding must work even if DB backups are restored               |

---

## 2. Architecture

```
                    metadata.yaml (schema client)
                          |
                          v
              +---------------------------+
              |      Schema Manager       |  <-- Creates/migrates tables dynamically
              +-------------+-------------+
                            |
         +------------------+------------------+
         v                  v                  v
   +----------+      +-----------+      +--------------+
   | platform |      | acme_raw  |      | acme_        |
   |  schema  |      |  schema   |      | transformed  |
   +----------+      +-----+-----+      |   schema     |
   |orgs      |            |            +--------------+
   |users     |            v            | tables       |
   |client_   |     +-------------+     | created from |
   |datasets  |     |  Transform  +---->| metadata     |
   |dataset_  |     |   Engine    |     | + features   |
   |columns   |     +------+------+
   |fit_params|            |
   |ingestion |            v
   |_log      |     fit_params saved
   |config_   |     + ingestion_log
   |history   |
   |audit.*   |
   +----------+
         |
         v
   Webapp:
     Client sees _raw (PII masked at API level)
     Client NEVER sees _transformed (Praedixa IP)
     Admin sees both _raw and _transformed
```

### Components

| Component              | Responsibility                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Schema Manager**     | Reads YAML metadata, creates/migrates PostgreSQL schemas and tables                                                                       |
| **Transform Engine**   | Applies configurable transformations (incremental + full refit)                                                                           |
| **Data Catalog**       | Platform schema tables that track datasets, columns, fit parameters, audit                                                                |
| **Raw Schema**         | Per-client schema with original structured data. PII encrypted at column level. Client webapp reads this (with PII masking at API layer). |
| **Transformed Schema** | Per-client schema with ML-ready features. PII pseudonymized. **Admin-only + ML pipeline.** Client NEVER sees this.                        |

### 2.1 Completeness / Ownership Model (NEW — required for correct privileges)

PostgreSQL privilege behavior depends on **object ownership** (especially `ALTER DEFAULT PRIVILEGES`). We therefore enforce a single ownership model:

- A dedicated **owner role** owns all schemas/tables: `praedixa_owner` (NOLOGIN).
- Provisioning / migration login roles (`praedixa_provision`, `praedixa_migrate`) **SET ROLE praedixa_owner** (or create objects as `praedixa_owner`) so that:
  - default privileges are predictable,
  - Schema Manager-created tables automatically get correct grants.

**Rule:** any DDL that creates tables in `{client}_raw` or `{client}_transformed` MUST run as `praedixa_owner`.

---

## 3. Data Catalog (Platform Schema)

> Important clarification: the **platform schema** contains (a) core tenancy tables (`organizations`, `users` minimal), and (b) the Data Foundation catalog tables (`client_datasets`, `dataset_columns`, `fit_parameters`, `ingestion_log`, `pipeline_config_history`).
> Other domain tables (forecasts, decisions, etc.) may exist, but are out-of-scope here; if they exist, they must follow the same RLS pattern (Section 7.3).

### 3.0 Required extensions (NEW)

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()
-- Optional but recommended (observability):
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### 3.0.1 Enumerated types (NEW — avoids “ENUM in doc only” drift)

```sql
-- dataset status
CREATE TYPE platform.dataset_status AS ENUM ('PENDING', 'ACTIVE', 'MIGRATING', 'ARCHIVED');

-- ingestion mode + status
CREATE TYPE platform.ingestion_mode AS ENUM ('INCREMENTAL', 'FULL_REFIT');
CREATE TYPE platform.run_status AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- column dtype + role
CREATE TYPE platform.column_dtype AS ENUM ('FLOAT', 'INTEGER', 'DATE', 'CATEGORY', 'BOOLEAN', 'TEXT');
CREATE TYPE platform.column_role AS ENUM ('TARGET', 'FEATURE', 'TEMPORAL_INDEX', 'GROUP_BY', 'ID', 'META');
```

### 3.1 organizations (NEW — referenced by FKs)

Registry of tenant organizations.

```sql
platform.organizations
  id                  UUID PK
  slug                TEXT UNIQUE      -- validated identifier-like slug (lowercase)
  name                TEXT
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ
  deleted_at          TIMESTAMPTZ NULL -- soft-delete for admin visibility (hard delete during RGPD erasure)
```

### 3.2 users (NEW — referenced by FKs)

Minimal mapping to Supabase (or other IdP). Stores role flags used for DB-backed authorization on sensitive ops.

```sql
platform.users
  id                  UUID PK
  organization_id     UUID FK -> platform.organizations(id)
  supabase_user_id    UUID UNIQUE      -- external identity
  email               TEXT             -- not necessarily PII-free, but this is Praedixa internal user, not client HR
  role                TEXT             -- 'client', 'admin', 'super_admin', 'support'
  is_active           BOOLEAN
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ
```

Indexes:

- `(organization_id)`
- `(supabase_user_id)`

### 3.3 client_datasets

Registry of all datasets per client.

```sql
platform.client_datasets
  id                  UUID PK
  organization_id     UUID FK -> platform.organizations(id)
  name                TEXT            -- validated identifier-like (e.g. "effectifs", "volumes")
  schema_raw          TEXT            -- e.g. "acme_raw"
  schema_transformed  TEXT            -- e.g. "acme_transformed"
  table_name          TEXT            -- e.g. "effectifs"
  temporal_index      TEXT            -- e.g. "date"
  group_by            TEXT[]          -- e.g. ["departement", "site"]
  pipeline_config     JSONB           -- toggles per dataset (see Section 6)
  status              platform.dataset_status
  metadata_hash       TEXT            -- SHA256 hex string (64 chars)
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ
```

Constraints / indexes (NEW):

- `UNIQUE (organization_id, name)`
- `CHECK (metadata_hash ~ '^[0-9a-f]{64}$')`
- Index: `(organization_id)`

### 3.4 dataset_columns

Column definitions with fine-grained rule overrides.

```sql
platform.dataset_columns
  id                  UUID PK
  dataset_id          UUID FK -> platform.client_datasets(id) ON DELETE CASCADE
  name                TEXT
  dtype               platform.column_dtype
  role                platform.column_role
  nullable            BOOLEAN
  rules_override      JSONB           -- null = inherit dataset defaults
  ordinal_position    INTEGER
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ
```

Constraints / indexes (NEW):

- `UNIQUE (dataset_id, name)`
- `UNIQUE (dataset_id, ordinal_position)`
- Index: `(dataset_id)`

### 3.5 fit_parameters

Saved transformation parameters for incremental mode.

```sql
platform.fit_parameters
  id                  UUID PK
  dataset_id          UUID FK -> platform.client_datasets(id) ON DELETE CASCADE
  column_name         TEXT
  transform_type      TEXT            -- "normalize", "standardize", "one_hot", ...
  parameters          JSONB           -- {"mean": 42.5, "std": 12.3}
  hmac_sha256         TEXT            -- integrity verification (hex or base64; must be consistent)
  fitted_at           TIMESTAMPTZ
  row_count           INTEGER
  version             INTEGER         -- incremented on each refit
  is_active           BOOLEAN
  created_at          TIMESTAMPTZ
```

Constraints / indexes (NEW):

- `CHECK (version >= 1)`
- Partial index: `(dataset_id) WHERE is_active`
- `UNIQUE (dataset_id, column_name, transform_type, version)`

**Immutability rule:** `fit_parameters` are **INSERT-only**. Updates are forbidden via trigger.

### 3.6 ingestion_log

Audit trail for all transformation runs.

```sql
platform.ingestion_log
  id                  UUID PK
  dataset_id          UUID FK -> platform.client_datasets(id) ON DELETE CASCADE
  mode                platform.ingestion_mode
  rows_received       INTEGER
  rows_transformed    INTEGER
  started_at          TIMESTAMPTZ
  completed_at        TIMESTAMPTZ
  status              platform.run_status
  error_message       TEXT
  triggered_by        TEXT            -- "shift_cron", "manual", "refit_weekly"
  request_id          TEXT            -- correlation id (NEW)
```

Indexes (NEW):

- `(dataset_id, started_at DESC)`
- `(status, started_at DESC)`

### 3.7 pipeline_config_history

RGPD Article 30 compliance: tracks every config change.

```sql
platform.pipeline_config_history
  id                  UUID PK
  dataset_id          UUID FK -> platform.client_datasets(id) ON DELETE CASCADE
  config_snapshot     JSONB           -- full pipeline_config copy
  columns_snapshot    JSONB           -- all rules_override values
  changed_by          UUID FK -> platform.users(id)
  change_reason       TEXT
  created_at          TIMESTAMPTZ
```

Index: `(dataset_id, created_at DESC)`

---

## 4. Dynamic Tables (Raw + Transformed)

### 4.1 Raw Schema

Mirror of the client's original structured data, created dynamically from YAML metadata.

```sql
CREATE SCHEMA IF NOT EXISTS acme_raw;

CREATE TABLE acme_raw.effectifs (
    _row_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    _ingested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    _batch_id       UUID,                 -- links to platform.ingestion_log.id (optional, may be null on ingest)

    -- Dynamic columns from YAML
    date            DATE,
    departement     TEXT,
    nb_employes     DOUBLE PRECISION,
    volume_colis    DOUBLE PRECISION,
    temperature_ext DOUBLE PRECISION

    -- Example PII columns (only if dataset requires it):
    -- first_name_enc  BYTEA,
    -- last_name_enc   BYTEA,
    -- email_enc       BYTEA
);
```

Automatic indexes:

```sql
CREATE INDEX ON acme_raw.effectifs (_ingested_at);
CREATE INDEX ON acme_raw.effectifs (date);          -- temporal_index
CREATE INDEX ON acme_raw.effectifs (departement);   -- group_by
```

System columns prefixed with `_` are invisible to the client in the webapp.

**Column encryption storage format:** encrypted columns are stored as `BYTEA` (ciphertext envelope) and never as plaintext.

### 4.2 Transformed Schema

Raw columns + generated features, created automatically by the Schema Manager based on resolved config.

```sql
CREATE SCHEMA IF NOT EXISTS acme_transformed;

CREATE TABLE acme_transformed.effectifs (
    _row_id                     UUID PRIMARY KEY,  -- same ID as raw
    _transformed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    _pipeline_version           INTEGER NOT NULL,   -- fit version used

    date                        DATE,
    departement                 TEXT,

    nb_employes_normalized      DOUBLE PRECISION,
    nb_employes_lag_1           DOUBLE PRECISION,
    nb_employes_lag_7           DOUBLE PRECISION,
    nb_employes_lag_30          DOUBLE PRECISION,
    nb_employes_rolling_mean_7  DOUBLE PRECISION,
    nb_employes_rolling_std_7   DOUBLE PRECISION,

    volume_colis_standardized   DOUBLE PRECISION,
    volume_colis_lag_1          DOUBLE PRECISION,
    volume_colis_lag_7          DOUBLE PRECISION,
    volume_colis_lag_30         DOUBLE PRECISION,
    volume_colis_rolling_mean_7 DOUBLE PRECISION,
    volume_colis_rolling_std_7  DOUBLE PRECISION,

    temperature_ext_minmax         DOUBLE PRECISION,
    temperature_ext_lag_1          DOUBLE PRECISION,
    temperature_ext_lag_7          DOUBLE PRECISION,
    temperature_ext_rolling_mean_7 DOUBLE PRECISION,
    temperature_ext_rolling_std_7  DOUBLE PRECISION

    -- Pseudonymized identifiers only if needed:
    -- employee_pseudo_id TEXT
);
```

### 4.3 Naming Convention

```
{original_column}_{transformation}_{parameter}
```

| Pattern              | Example                      | Meaning                             |
| -------------------- | ---------------------------- | ----------------------------------- |
| `*_normalized`       | `nb_employes_normalized`     | Z-score or configured normalization |
| `*_minmax`           | `temperature_ext_minmax`     | Min-max scaling                     |
| `*_lag_{N}`          | `volume_colis_lag_7`         | Value N days ago                    |
| `*_rolling_mean_{N}` | `nb_employes_rolling_mean_7` | Rolling mean over N days            |
| `*_rolling_std_{N}`  | `nb_employes_rolling_std_7`  | Rolling std over N days             |
| `*_encoded`          | `departement_encoded`        | One-hot or target encoding          |

---

## 5. Transform Engine

### 5.1 Pipeline Execution Order

```
Raw data (acme_raw)
    |
    v
Step 1: MISSING VALUES
Step 2: OUTLIERS
Step 3: DEDUPLICATION
Step 4: TEMPORAL FEATURES (lags/rolling)
Step 5: NORMALIZATION / STANDARDIZATION
Step 6: CATEGORICAL ENCODING
    |
    v
acme_transformed.* (ML-ready)
```

**Implementation note (NEW):** Lags/rolling require deterministic ordering:

- Use `(temporal_index, group_by..., _row_id)` as stable tie-breaker.
- Enforce a uniqueness rule if possible (dataset-specific), otherwise document expected duplicates behavior.

### 5.2 Two Execution Modes

#### Incremental (per shift, up to 3x/day)

1. Identify new rows in raw (`WHERE _ingested_at > last_successful_run.completed_at`)
2. Load config (`client_datasets` + `dataset_columns`) and active `fit_parameters`
3. Clean new rows (steps 1–3)
4. Temporal features with lookback context:
   - Lookback size = `max(lags) + max(rolling_windows)` (e.g., 60 days)
5. Apply transform-only steps using saved params (no fitting)
6. Insert transformed rows
7. Insert `platform.ingestion_log` entry

#### Full Refit (weekly, Sunday night)

1. Read ALL raw rows
2. Clean + temporal features
3. Recalculate fit params (version + 1)
4. Transform using new params
5. Atomic swap via rename
6. Write `fit_parameters`, `pipeline_config_history`, `ingestion_log`

### 5.3 Fit Parameter Lifecycle

Unchanged (versions monotonic).

### 5.4 Error Handling and Rollback

Unchanged (atomic swap + incremental safe failure).

### 5.5 Triggers

Unchanged, but **logging requirement strengthened (NEW)**:

- Every trigger writes an `audit.events` entry (`event_type` includes dataset_id and mode; never row values).

---

## 6. Metadata Configuration

Unchanged conceptually.

### 6.5 YAML schema validation (NEW — dev-start requirement)

- Use `strictyaml` with an explicit schema (Map/Seq with required/optional fields).
- Reject unknown keys (prevents silent typos).
- Enforce numeric bounds:
  - lags windows: `1..365`
  - rolling windows: `2..365`
  - max windows count per dataset: e.g. 10
- Enforce that `targets` and `features` reference declared columns (or explicitly declare columns section in YAML).

---

## 7. Security

### 7.1 PostgreSQL Role Hierarchy

> **Update:** Transform Engine MUST be able to read the **data catalog** (config + active fit params) and write `ingestion_log`. The previous statement “Cannot read platform tables” blocked the real implementation.

We keep 7+ roles, but clarify permissions.

```sql
-- Owner role (NEW)
CREATE ROLE praedixa_owner NOLOGIN;

-- Group roles (permission boundaries)
CREATE ROLE praedixa_platform_reader NOLOGIN;
CREATE ROLE praedixa_platform_writer NOLOGIN;

-- Data catalog sub-roles (NEW; optional but recommended)
CREATE ROLE praedixa_catalog_reader NOLOGIN;     -- SELECT on catalog tables
CREATE ROLE praedixa_catalog_writer NOLOGIN;     -- INSERT on ingestion_log, pipeline_config_history, fit_parameters

CREATE ROLE praedixa_client_raw_reader NOLOGIN;
CREATE ROLE praedixa_client_transformed_reader NOLOGIN;
CREATE ROLE praedixa_transform_engine NOLOGIN;
CREATE ROLE praedixa_ingestion NOLOGIN;
CREATE ROLE praedixa_provisioner NOLOGIN;
CREATE ROLE praedixa_migrator NOLOGIN;

-- Audit write role (NEW)
CREATE ROLE praedixa_audit_writer NOLOGIN;
```

Login roles mapping:

```sql
CREATE ROLE praedixa_api LOGIN;
GRANT praedixa_platform_reader TO praedixa_api;
GRANT praedixa_platform_writer TO praedixa_api;
GRANT praedixa_client_raw_reader TO praedixa_api;
GRANT praedixa_audit_writer TO praedixa_api;

CREATE ROLE praedixa_api_admin LOGIN;
GRANT praedixa_platform_reader TO praedixa_api_admin;
GRANT praedixa_platform_writer TO praedixa_api_admin;
GRANT praedixa_client_raw_reader TO praedixa_api_admin;
GRANT praedixa_client_transformed_reader TO praedixa_api_admin;
GRANT praedixa_audit_writer TO praedixa_api_admin;

CREATE ROLE praedixa_etl LOGIN;
GRANT praedixa_transform_engine TO praedixa_etl;
GRANT praedixa_catalog_reader TO praedixa_etl;
GRANT praedixa_catalog_writer TO praedixa_etl;
GRANT praedixa_audit_writer TO praedixa_etl;

CREATE ROLE praedixa_ingest LOGIN;
GRANT praedixa_ingestion TO praedixa_ingest;
GRANT praedixa_audit_writer TO praedixa_ingest;

CREATE ROLE praedixa_provision LOGIN;
GRANT praedixa_provisioner TO praedixa_provision;

CREATE ROLE praedixa_migrate LOGIN;
GRANT praedixa_migrator TO praedixa_migrate;

CREATE ROLE praedixa_support LOGIN;
GRANT praedixa_platform_reader TO praedixa_support;
GRANT praedixa_client_raw_reader TO praedixa_support;
GRANT praedixa_client_transformed_reader TO praedixa_support;
```

### 7.2 Client Schema Grants (correctness fixes)

**Key fix:** `ALTER DEFAULT PRIVILEGES` only applies to objects created by a specific owner role. Therefore, we must set default privileges **for the owner role** (here: `praedixa_owner`) and ensure Schema Manager creates tables owned by that role.

Template (generated):

```sql
-- Revoke public
REVOKE ALL ON SCHEMA acme_raw FROM PUBLIC;
REVOKE ALL ON SCHEMA acme_transformed FROM PUBLIC;

-- Ensure ownership (NEW)
ALTER SCHEMA acme_raw OWNER TO praedixa_owner;
ALTER SCHEMA acme_transformed OWNER TO praedixa_owner;

-- Usage grants
GRANT USAGE ON SCHEMA acme_raw TO praedixa_ingestion, praedixa_transform_engine, praedixa_client_raw_reader;
GRANT USAGE ON SCHEMA acme_transformed TO praedixa_transform_engine, praedixa_client_transformed_reader;

-- Default privileges MUST be set FOR ROLE praedixa_owner (NEW)
ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA acme_raw
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO praedixa_ingestion;

ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA acme_raw
  GRANT SELECT ON TABLES TO praedixa_transform_engine;

ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA acme_raw
  GRANT SELECT ON TABLES TO praedixa_client_raw_reader;

ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA acme_transformed
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO praedixa_transform_engine;

ALTER DEFAULT PRIVILEGES FOR ROLE praedixa_owner IN SCHEMA acme_transformed
  GRANT SELECT ON TABLES TO praedixa_client_transformed_reader;
```

### 7.3 Row-Level Security (RLS) (scope fix)

RLS applies to all **org-scoped tables** in `platform`, including the **Data Foundation catalog** tables.

Minimum RLS coverage list (UPDATED, includes catalog):

- `platform.organizations`
- `platform.users`
- `platform.client_datasets`
- `platform.dataset_columns`
- `platform.fit_parameters`
- `platform.ingestion_log`
- `platform.pipeline_config_history`

If additional domain tables exist (forecasts/decisions/etc.), they must follow the same pattern.

Helper function:

```sql
CREATE OR REPLACE FUNCTION platform.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::uuid;
$$;
```

Enable + FORCE RLS on all listed tables; add tenant isolation policies.

**Policy patterns:**

- For `organizations`: `USING (id = platform.current_org_id())`
- For all others: `USING (organization_id = platform.current_org_id())`, plus `WITH CHECK` for writes where applicable.

### 7.4 Encryption (3 Layers) — crypto-shredding fix

| Layer        | What                            | How                                  |
| ------------ | ------------------------------- | ------------------------------------ |
| Transit      | DB <-> API                      | TLS 1.3, `verify-full` in production |
| Rest (infra) | Managed DB disk                 | Provider encryption (AES-256 class)  |
| Rest (app)   | Sensitive PII columns in `_raw` | AES-256-GCM, versioned keys          |

**Critical requirement:** per-org keys MUST NOT be derivable deterministically from a single master key if we want per-org crypto-shredding. We therefore use **external per-org Data Encryption Keys (DEKs)** stored outside the DB.

**Key management (UPDATED):**

- For each organization, store a secret in **Scaleway Secrets Manager / KMS**:
  - `org/{org_id}/raw_pii_dek` (versioned)
  - `org/{org_id}/fit_params_hmac_key` (versioned)
  - `org/{org_id}/pseudonym_hmac_key` (versioned)
- Ciphertext format includes a 1-byte key version to select the correct secret version.

**Crypto-shredding:** delete/disable the org secrets in Secrets Manager/KMS. This immediately prevents decryption even if a DB backup is restored.

### 7.5 Pseudonymization in `_transformed`

Unchanged conceptually, but keys are now per-org secrets (above), not derived keys.

### 7.6 PII Masking for Client Raw Access

Unchanged, with added rule (NEW):

- Any API response that includes masked PII must also emit an `audit.events` entry with `metadata = {"masked_fields": [...], "row_count": N}`.

### 7.7 Audit Trail (append-only)

Add grants/ownership (NEW):

- `audit.events` owned by `praedixa_owner`
- Only `praedixa_audit_writer` can INSERT
- No UPDATE/DELETE for any role (enforced by trigger)

### 7.8 Connection Pooling Security

Unchanged, but add requirement (NEW):

- Always use fully qualified table names in SQLAlchemy for cross-schema access, or set `SET LOCAL search_path` explicitly per transaction (and reset on checkout).

### 7.9 Dynamic DDL Input Validation

Unchanged conceptually, but add (NEW):

- Enforce **identifier uniqueness** within a dataset at YAML validation time.
- Enforce **max datasets per client**, **max columns per table**, **max windows count** at YAML validation time (fail fast).

---

## 8. RGPD Compliance

### 8.3 Erasure Procedure (Article 17) — corrected for key storage

Update steps:

3. **Crypto-shredding (UPDATED):** Delete/disable per-org secrets in Scaleway Secrets Manager/KMS (**not stored in DB backups**).
4. `DROP SCHEMA {client}_raw CASCADE`
5. `DROP SCHEMA {client}_transformed CASCADE`
   (remaining steps unchanged)

Dual authorization remains mandatory.

---

## 9. Threat Model (STRIDE)

Add (NEW) top threat:

| Component | Threat                                        | Likelihood | Impact   | Mitigation                                                     |
| --------- | --------------------------------------------- | ---------- | -------- | -------------------------------------------------------------- |
| Key mgmt  | Per-org key accidentally stored in DB backups | Medium     | Critical | Secrets Manager/KMS only; denylist env dumping; CI secret scan |

---

## 10. Incident Response

### 10.3 Client Schema Freeze Procedure (FIX — role inheritance correctness)

Previous procedure revoked from login roles, which may not work if access is inherited via group roles. Freeze must revoke from the **group roles** that actually hold the grants.

```sql
-- Freeze access to ONE client schema only
REVOKE ALL ON SCHEMA acme_raw FROM praedixa_client_raw_reader;
REVOKE ALL ON SCHEMA acme_raw FROM praedixa_transform_engine;
REVOKE ALL ON SCHEMA acme_transformed FROM praedixa_client_transformed_reader;
REVOKE ALL ON SCHEMA acme_transformed FROM praedixa_transform_engine;

-- Also revoke table privileges defensively (optional)
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA acme_raw FROM praedixa_client_raw_reader, praedixa_transform_engine;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA acme_transformed FROM praedixa_client_transformed_reader, praedixa_transform_engine;

-- Kill active sessions that currently query those schemas (best-effort)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND (query ILIKE '%acme_raw.%' OR query ILIKE '%acme_transformed.%');
```

Unfreeze re-applies the standard grants (via the same provisioning template).

---

## 11. Infrastructure

### 11.2 Production (Scaleway) — extension availability risk (NEW)

Managed Postgres offerings may restrict extensions (notably `pg_cron`, `pgaudit`). Therefore:

- **P0 requirement:** verify availability of `pgcrypto` (required), and confirm whether `pg_cron` and `pgaudit` are supported.
- If `pg_cron` unsupported: use external scheduler (CI runner / Scaleway Jobs / Kubernetes CronJob) to trigger refits and retention.
- If `pgaudit` unsupported: rely on application audit + DB logs with strict PII-safe configuration.

---

## 12. Files to Create

Additions (NEW):

| File                                                 | Purpose                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| `apps/api/app/core/key_management.py`                | Fetch per-org DEKs/HMAC keys from Secrets Manager/KMS, handle versions |
| `scripts/verify_db_extensions.sql`                   | Assert required extensions exist (pgcrypto mandatory)                  |
| `scripts/verify_roles_and_grants.sql`                | Automated verification for DF-SEC-P0-04 evidence                       |
| `scripts/freeze_client_schema.sql`                   | Parameterized freeze/unfreeze script for incident drills               |
| `apps/api/tests/security/test_default_privileges.py` | Ensures new Schema Manager tables inherit grants correctly             |

Existing lists remain.

### SQL Migrations (additions)

Add:

| Migration                             | Purpose                                    |
| ------------------------------------- | ------------------------------------------ |
| `001_extensions.sql`                  | `pgcrypto` enablement                      |
| `00x_platform_core.sql`               | `platform.organizations`, `platform.users` |
| `00x_enum_types.sql`                  | enums used by catalog tables               |
| `00x_fit_parameters_immutability.sql` | triggers preventing UPDATE/DELETE          |

---

## 13. Implementation Readiness Gate

Unchanged: dev starts now with synthetic data only, real data blocked until P0 closure.
