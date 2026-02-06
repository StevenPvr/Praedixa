# Multi-stage Dockerfile for Praedixa API
# Uses uv for fast dependency resolution + slim Python image
#
# Security notes:
# - Runs as non-root user (appuser) to minimize container escape impact.
# - Only production dependencies are installed in the final image.
# - No dev tools, no shell access beyond what's needed for debugging.
# - COPY uses specific paths (not COPY .) to avoid leaking .env / secrets.

# ---------- Stage 1: Build dependencies ----------
FROM python:3.12-slim AS builder

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /build

# Copy dependency specification and source (hatchling needs app/ to build the wheel)
COPY pyproject.toml ./
COPY app/ ./app/

# Install production dependencies into a virtual environment
RUN uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv pip install --no-cache .

# ---------- Stage 2: Production image ----------
FROM python:3.12-slim AS production

# Security: create non-root user
RUN groupadd --system appgroup && \
    useradd --system --gid appgroup --create-home appuser

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Copy application code (explicit paths — no .env, no tests, no dev files)
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY scripts/ ./scripts/
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Switch to non-root user
USER appuser

# Expose the API port
EXPOSE 8000

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "from urllib.request import urlopen; exit(0 if urlopen('http://localhost:8000/health').status == 200 else 1)"

# Run with uvicorn — bind to 0.0.0.0, no reload in production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
