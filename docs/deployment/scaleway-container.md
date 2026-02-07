# Scaleway Container Deployment Guide

Production deployment of the Praedixa API using Scaleway Serverless Containers.

## Architecture Overview

```
                 +-----------------+
                 |   Cloudflare    |
                 |  app.praedixa   |
                 +--------+--------+
                          |
                          | HTTPS (CORS)
                          v
+---------------------------------------------------+
|  Scaleway fr-par                                  |
|                                                   |
|  +--------------------+    +------------------+   |
|  | Serverless         |    | Managed DB       |   |
|  | Container          +--->+ PostgreSQL 16    |   |
|  | (API)              |    | (DB-GP-XS)      |   |
|  | api.praedixa.com   |    |                  |   |
|  +--------------------+    +------------------+   |
|         Private Network (10.0.1.0/24)             |
+---------------------------------------------------+
```

## Prerequisites

- Scaleway account with the project set up
- Docker image pushed to `ghcr.io` (handled by CD pipeline)
- PostgreSQL instance provisioned (see `scaleway-setup.md`)
- DNS access for `api.praedixa.com`

## 1. Create the Serverless Container

### Via Scaleway Console

1. Go to **Serverless > Containers** in the fr-par region
2. Create a new container namespace: `praedixa`
3. Create a container:
   - **Name**: `praedixa-api`
   - **Registry**: External registry (ghcr.io)
   - **Image URL**: `ghcr.io/<GITHUB_ORG>/praedixa/api:latest`
   - **Port**: `8000`
   - **Resources**: 512 MB RAM, 560 mVCPU
   - **Scaling**: Min 1, Max 3 instances
   - **Privacy**: Public (API handles its own auth)

### Via CLI

```bash
# Create namespace
scw container namespace create \
  name=praedixa \
  region=fr-par

# Create container
scw container container create \
  namespace-id=<NAMESPACE_ID> \
  name=praedixa-api \
  registry-image=ghcr.io/<GITHUB_ORG>/praedixa/api:latest \
  port=8000 \
  min-scale=1 \
  max-scale=3 \
  memory-limit=512 \
  cpu-limit=560 \
  timeout=60s \
  region=fr-par \
  privacy=public \
  http-option=redirected \
  deploy=true
```

## 2. Environment Variables

Set these on the Scaleway Container (via Console or CLI):

| Variable              | Value                                                                             | Secret |
| --------------------- | --------------------------------------------------------------------------------- | ------ |
| `DATABASE_URL`        | `postgresql+asyncpg://praedixa_api:<PWD>@10.0.1.10:5432/praedixa?sslmode=require` | Yes    |
| `SUPABASE_JWT_SECRET` | `<from Supabase dashboard>`                                                       | Yes    |
| `SUPABASE_URL`        | `https://<project>.supabase.co`                                                   | No     |
| `CORS_ORIGINS`        | `["https://app.praedixa.com"]`                                                    | No     |
| `ENVIRONMENT`         | `production`                                                                      | No     |
| `DEBUG`               | `false`                                                                           | No     |
| `LOG_LEVEL`           | `info`                                                                            | No     |

### Via CLI

```bash
scw container container update <CONTAINER_ID> \
  region=fr-par \
  environment-variables.ENVIRONMENT=production \
  environment-variables.DEBUG=false \
  environment-variables.LOG_LEVEL=info \
  environment-variables.CORS_ORIGINS='["https://app.praedixa.com"]' \
  environment-variables.SUPABASE_URL=https://<project>.supabase.co \
  secret-environment-variables.0.key=DATABASE_URL \
  secret-environment-variables.0.value='postgresql+asyncpg://praedixa_api:<PWD>@10.0.1.10:5432/praedixa?sslmode=require' \
  secret-environment-variables.1.key=SUPABASE_JWT_SECRET \
  secret-environment-variables.1.value='<JWT_SECRET>'
```

> **Secrets** (`DATABASE_URL`, `SUPABASE_JWT_SECRET`) are stored encrypted by Scaleway and not visible in plain text after creation.

## 3. Private Network Attachment

The container must be on the same Private Network as the database:

```bash
scw container container update <CONTAINER_ID> \
  region=fr-par \
  sandbox=v2 \
  scaling-option.concurrent-requests-threshold=50
```

> Private Network support for Serverless Containers requires the v2 sandbox. Check Scaleway documentation for current availability and configuration steps.

## 4. Healthcheck

The API exposes `GET /health` which checks database connectivity:

```bash
curl -s https://api.praedixa.com/health | jq .
# Expected: {"status": "healthy", "database": "connected"}
```

Scaleway Serverless Containers use the HTTP port (8000) for health detection. The platform automatically routes traffic away from unhealthy instances.

## 5. Custom Domain (api.praedixa.com)

### 5.1 Get the Container Endpoint

After deployment, Scaleway assigns an endpoint like:

```
praedixa-api-<hash>.functions.fnc.fr-par.scw.cloud
```

### 5.2 Configure DNS

Add a CNAME record in your DNS provider:

| Type  | Name             | Target                                             | TTL |
| ----- | ---------------- | -------------------------------------------------- | --- |
| CNAME | api.praedixa.com | praedixa-api-<hash>.functions.fnc.fr-par.scw.cloud | 300 |

### 5.3 Add Custom Domain in Scaleway

```bash
scw container domain create \
  container-id=<CONTAINER_ID> \
  hostname=api.praedixa.com \
  region=fr-par
```

### 5.4 TLS

Scaleway automatically provisions and renews TLS certificates via Let's Encrypt for custom domains. No additional configuration is needed.

## 6. Scaling Configuration

| Parameter     | Value     | Rationale                                        |
| ------------- | --------- | ------------------------------------------------ |
| Min instances | 1         | Avoids cold starts; always-on for production     |
| Max instances | 3         | Handles traffic spikes without over-provisioning |
| Memory        | 512 MB    | Sufficient for FastAPI + SQLAlchemy async        |
| CPU           | 560 mVCPU | ~0.5 vCPU, adequate for API workloads            |
| Timeout       | 60s       | Max request duration (most respond in <1s)       |
| Concurrency   | 50        | Requests per instance before scaling out         |

### Scaling Up

If response times degrade under load:

1. Increase `max-scale` (e.g., to 5)
2. Increase memory to 1024 MB (gets proportionally more CPU)
3. Consider upgrading to dedicated containers if sustained high traffic

## 7. Deployment Procedure

Deployments are automated via the CD pipeline (`.github/workflows/cd-api.yml`):

1. CI passes on `main` branch
2. CD builds Docker image and pushes to `ghcr.io`
3. CD triggers Scaleway container redeployment with the new image
4. Scaleway performs a rolling update (zero-downtime)
5. Smoke test verifies `/health` returns 200

### Manual Deployment (emergency)

```bash
# Deploy a specific image tag
scw container container deploy <CONTAINER_ID> \
  region=fr-par

# Or update the image and redeploy
scw container container update <CONTAINER_ID> \
  registry-image=ghcr.io/<GITHUB_ORG>/praedixa/api:sha-<COMMIT> \
  region=fr-par \
  redeploy=true
```

### Rollback

```bash
# Deploy the previous known-good image tag
scw container container update <CONTAINER_ID> \
  registry-image=ghcr.io/<GITHUB_ORG>/praedixa/api:sha-<PREVIOUS_COMMIT> \
  region=fr-par \
  redeploy=true
```

## 8. Logging & Monitoring

### Logs

View container logs via Scaleway Cockpit (Grafana):

```bash
# Or via CLI
scw container container get <CONTAINER_ID> region=fr-par
# Then check Cockpit dashboard for logs
```

The API outputs structured JSON logs (via Python `logging` module). Key fields:

- `timestamp`, `level`, `message`, `request_id`, `path`, `status_code`, `duration_ms`

### Metrics to Monitor

| Metric              | Warning | Critical         |
| ------------------- | ------- | ---------------- |
| Response time (p95) | > 1s    | > 3s             |
| Error rate (5xx)    | > 1%    | > 5%             |
| Instance count      | At max  | Sustained at max |
| Memory usage        | > 80%   | > 95%            |

### Recommended Alerts

Set up in Scaleway Cockpit or external monitoring:

1. **Health check failure**: `GET /health` returns non-200 for > 1 minute
2. **High error rate**: 5xx rate exceeds 5% over 5 minutes
3. **Scaling saturation**: All instances at max for > 10 minutes

## 9. Webapp Configuration

The Next.js webapp (`apps/webapp`) needs to know the API URL. Set this in the Cloudflare Workers environment:

| Variable              | Value                      |
| --------------------- | -------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://api.praedixa.com` |

This is a build-time variable for Next.js. Set it in the Cloudflare dashboard under Workers > Settings > Environment Variables, or in `wrangler.toml`:

```toml
[vars]
NEXT_PUBLIC_API_URL = "https://api.praedixa.com"
```

## 10. Security Checklist

- [ ] Database accessible only via Private Network (no public endpoint)
- [ ] `DATABASE_URL` and `SUPABASE_JWT_SECRET` stored as Scaleway secrets
- [ ] `ENVIRONMENT=production` and `DEBUG=false`
- [ ] `CORS_ORIGINS` allows only `https://app.praedixa.com`
- [ ] TLS enforced on all connections (API and database)
- [ ] Container runs as non-root user (configured in Dockerfile)
- [ ] Alembic migrations run with admin user, API runs with least-privilege user
- [ ] Logs do not contain secrets or PII
- [ ] Health endpoint is unauthenticated but reveals minimal information
