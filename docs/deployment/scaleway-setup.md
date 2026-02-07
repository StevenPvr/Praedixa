# Scaleway PostgreSQL Setup Guide

Production database for the Praedixa API, hosted on Scaleway Managed Database.

## Prerequisites

- Scaleway account with billing enabled
- `scw` CLI installed and configured (`scw init`)
- Access to the Praedixa Scaleway Organization / Project

## 1. Provision the Database Instance

Create a DB-GP-XS instance in the Paris region (fr-par):

```bash
scw rdb instance create \
  name=praedixa-db \
  node-type=DB-GP-XS \
  engine=PostgreSQL-16 \
  region=fr-par \
  is-ha-cluster=false \
  disable-backup=false \
  backup-schedule-frequency=24 \
  backup-schedule-retention=30 \
  volume-type=bssd \
  volume-size=10GB \
  tags.0=project:praedixa \
  tags.1=env:production
```

**Instance specs (DB-GP-XS):**

- 2 vCPU, 2 GB RAM
- Block SSD storage (expandable)
- Automatic daily backups (30-day retention)
- Suitable for early production workloads

> For higher availability, set `is-ha-cluster=true` when traffic justifies it.

## 2. VPC & Private Network Configuration

The database must not be reachable from the public internet. Attach it to a Private Network within a Scaleway VPC.

### 2.1 Create a VPC (if none exists)

```bash
scw vpc vpc create \
  name=praedixa-vpc \
  region=fr-par \
  tags.0=project:praedixa
```

### 2.2 Create a Private Network

```bash
scw vpc private-network create \
  name=praedixa-private \
  region=fr-par \
  vpc-id=<VPC_ID> \
  tags.0=project:praedixa
```

### 2.3 Attach Database to Private Network

```bash
scw rdb endpoint create \
  instance-id=<INSTANCE_ID> \
  region=fr-par \
  private-network.private-network-id=<PN_ID> \
  private-network.service-ip=10.0.1.10/24
```

Then **remove the public endpoint** to ensure no internet exposure:

```bash
scw rdb endpoint delete <PUBLIC_ENDPOINT_ID> \
  instance-id=<INSTANCE_ID> \
  region=fr-par
```

### 2.4 Attach API Container to Same Private Network

The Scaleway Serverless Container running the API must be attached to the same Private Network so it can reach the database at `10.0.1.10:5432`.

## 3. TLS Configuration

Scaleway Managed Database enforces TLS by default. Verify it:

```bash
scw rdb instance get <INSTANCE_ID> region=fr-par
# Check: tls-certificate is present
```

The connection string **must** use `sslmode=require`:

```
postgresql+asyncpg://praedixa_api:<PASSWORD>@10.0.1.10:5432/praedixa?sslmode=require
```

> The asyncpg driver supports TLS natively. No additional CA bundle is needed for Scaleway-managed certificates.

## 4. Database & User Setup

Connect to the instance using the admin credentials provided at creation, then create the application database and least-privilege user.

```sql
-- Create the application database
CREATE DATABASE praedixa
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE 'en_US.UTF-8';

-- Create the application user (no superuser, no createdb, no createrole)
CREATE USER praedixa_api WITH PASSWORD '<STRONG_PASSWORD>';

-- Grant only what the API needs
GRANT CONNECT ON DATABASE praedixa TO praedixa_api;

-- Switch to praedixa database
\c praedixa

-- Grant schema usage and table permissions
GRANT USAGE ON SCHEMA public TO praedixa_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO praedixa_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO praedixa_api;

-- Ensure future tables/sequences inherit permissions (for Alembic migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO praedixa_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO praedixa_api;
```

> **Alembic migrations** need DDL privileges. Options:
>
> 1. Run migrations with the admin user (recommended for production)
> 2. Grant `CREATE` on schema public to `praedixa_api` (less secure)
>
> Recommended approach: use the admin user in the `DATABASE_URL` for migration commands only, and `praedixa_api` for the running application.

## 5. Backup Configuration

Backups are configured at instance creation (see step 1). Verify:

```bash
scw rdb instance get <INSTANCE_ID> region=fr-par \
  | grep -A3 backup
```

Expected configuration:

- **Frequency**: Every 24 hours
- **Retention**: 30 days
- **Type**: Automated logical backups

### Manual Backup (before major changes)

```bash
scw rdb backup create \
  instance-id=<INSTANCE_ID> \
  database-name=praedixa \
  name=pre-migration-$(date +%Y%m%d) \
  region=fr-par
```

### Restore from Backup

```bash
scw rdb backup restore <BACKUP_ID> \
  instance-id=<INSTANCE_ID> \
  database-name=praedixa_restored \
  region=fr-par
```

## 6. Connection String Format

The API uses `DATABASE_URL` as its connection string. Format for production:

```
postgresql+asyncpg://praedixa_api:<PASSWORD>@<PRIVATE_IP>:5432/praedixa?sslmode=require
```

Where:

- `praedixa_api` — application user (least-privilege)
- `<PASSWORD>` — strong password (min 24 chars, alphanumeric + symbols)
- `<PRIVATE_IP>` — Private Network IP (e.g., `10.0.1.10`)
- `sslmode=require` — enforces TLS encryption

This value must be set as an environment variable on the Scaleway Serverless Container, **never** in source code or Docker images.

## 7. IP Allowlist

Since the database is on a Private Network with no public endpoint, IP allowlisting is handled at the network level:

- Only resources within the same Private Network can reach the database
- No public IP means no internet-facing attack surface
- The Scaleway Serverless Container is the only client

If you temporarily need direct access for debugging:

```bash
# Add a temporary public endpoint (remove after use)
scw rdb endpoint create \
  instance-id=<INSTANCE_ID> \
  region=fr-par \
  load-balancer=true

# Then add your IP to the ACL
scw rdb acl add \
  instance-id=<INSTANCE_ID> \
  region=fr-par \
  rules.0.ip=<YOUR_IP>/32 \
  rules.0.description="Temporary debug access"
```

> **Always remove temporary public endpoints and ACL rules after use.**

## 8. Security Best Practices

### Access Control

- No public endpoint — database is reachable only via Private Network
- Application user (`praedixa_api`) has least-privilege (SELECT/INSERT/UPDATE/DELETE only)
- Admin user is used only for migrations and emergency access
- Passwords are min 24 characters with mixed character types

### Credential Rotation

- Rotate `praedixa_api` password quarterly
- Rotation procedure:
  1. Generate new password
  2. `ALTER USER praedixa_api WITH PASSWORD '<NEW_PASSWORD>';`
  3. Update `DATABASE_URL` in Scaleway Container environment
  4. Redeploy the container
  5. Verify connectivity via `/health` endpoint
  6. Invalidate old password (already done by ALTER USER)

### Monitoring

- Enable Scaleway Cockpit for database metrics (CPU, memory, connections, IOPS)
- Set alerts for:
  - Connection count > 80% of max
  - Storage usage > 80%
  - Replication lag (if HA is enabled)
  - Failed authentication attempts

### Audit

- Enable `pgaudit` extension for SQL-level audit logging:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pgaudit;
  ALTER SYSTEM SET pgaudit.log = 'write, ddl';
  SELECT pg_reload_conf();
  ```
- Review audit logs via Scaleway Cockpit

## 9. Cost Estimate

| Resource  | Spec              | Monthly Cost (approx.) |
| --------- | ----------------- | ---------------------- |
| DB-GP-XS  | 2 vCPU, 2 GB RAM  | ~15 EUR                |
| Block SSD | 10 GB             | ~2 EUR                 |
| Backups   | 30 days retention | Included               |
| **Total** |                   | **~17 EUR/month**      |

> Prices as of early 2026, fr-par region. Check [Scaleway pricing](https://www.scaleway.com/en/pricing/?tags=databases) for current rates.

## 10. Quick Reference

```bash
# List instances
scw rdb instance list region=fr-par

# Get instance details
scw rdb instance get <INSTANCE_ID> region=fr-par

# List backups
scw rdb backup list instance-id=<INSTANCE_ID> region=fr-par

# Check logs
scw rdb log list instance-id=<INSTANCE_ID> region=fr-par

# Scale up (zero downtime for storage, brief restart for node type)
scw rdb instance upgrade <INSTANCE_ID> node-type=DB-GP-S region=fr-par
```
