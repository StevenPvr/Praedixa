"""Alembic migration environment — async PostgreSQL support.

This uses the run_async_migrations pattern to support asyncpg
with Alembic's synchronous migration runner.
"""

import asyncio
from logging.config import fileConfig
from typing import Any
from urllib.parse import urlsplit

from sqlalchemy import pool
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context
from alembic.util.exc import CommandError
from app.core.config import settings

# Import all models so Alembic autogenerate detects them
from app.models import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url from environment variable
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = Base.metadata


def build_database_unavailable_message(database_url: str) -> str:
    """Return an actionable local-dev hint when PostgreSQL is unavailable."""
    parsed = urlsplit(database_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    database_name = parsed.path.lstrip("/") or "postgres"
    return (
        "Unable to connect to PostgreSQL at "
        f"{host}:{port}/{database_name}. "
        "Start the local database with "
        "`docker compose -f infra/docker-compose.yml up -d postgres` "
        "or export DATABASE_URL to a reachable instance, then retry "
        "`uv run --active alembic upgrade head`."
    )


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Generates SQL script without connecting to the database.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Any) -> None:  # type: ignore[no-untyped-def]
    """Run migrations with an active connection."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in async mode using asyncpg."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    try:
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
    except (OSError, OperationalError) as exc:
        raise CommandError(
            build_database_unavailable_message(settings.DATABASE_URL)
        ) from exc
    finally:
        await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
