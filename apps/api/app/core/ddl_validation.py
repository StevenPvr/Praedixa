"""DDL input validation for dynamic schema/table/column creation.

Security notes:
- ALL identifiers that will appear in DDL statements MUST pass through
  these validators BEFORE being used, even when also using
  psycopg.sql.Identifier (defense in depth).
- Allowlists are used everywhere — no denylists.
- PostgreSQL reserved words are rejected to prevent ambiguity.
- Length limits match PostgreSQL's 63-byte NAMEDATALEN limit.
"""

from __future__ import annotations

import re
from typing import Final

from app.core.exceptions import PraedixaError

# ── Constants ────────────────────────────────────────

# PostgreSQL NAMEDATALEN - 1 = 63 bytes max for identifiers.
_MAX_IDENTIFIER_LENGTH: Final[int] = 63

# Strict allowlist: lowercase alpha start, then lowercase alphanum + underscore.
# No uppercase (forces consistent casing), no hyphens (invalid unquoted PG ident).
IDENTIFIER_REGEX: Final[re.Pattern[str]] = re.compile(r"^[a-z][a-z0-9_]{0,62}$")

# Slug regex: same as identifier but slightly more restrictive min length (3+).
# Client slugs must be at least 3 chars to avoid collisions with PG internals.
SLUG_REGEX: Final[re.Pattern[str]] = re.compile(r"^[a-z][a-z0-9_]{2,34}$")

# Column types allowed in dynamic DDL. Mapped to exact PG type strings.
ALLOWED_COLUMN_TYPES: Final[dict[str, str]] = {
    "text": "TEXT",
    "integer": "INTEGER",
    "bigint": "BIGINT",
    "float": "DOUBLE PRECISION",
    "double_precision": "DOUBLE PRECISION",
    "boolean": "BOOLEAN",
    "date": "DATE",
    "timestamptz": "TIMESTAMPTZ",
    "uuid": "UUID",
    "bytea": "BYTEA",
    "jsonb": "JSONB",
}

# PostgreSQL reserved words that must never be used as identifiers.
# This is a subset of the most dangerous ones — not exhaustive, but
# the IDENTIFIER_REGEX already blocks most problematic patterns.
_PG_RESERVED_WORDS: Final[frozenset[str]] = frozenset(
    {
        "all",
        "analyse",
        "analyze",
        "and",
        "any",
        "array",
        "as",
        "asc",
        "asymmetric",
        "authorization",
        "between",
        "binary",
        "both",
        "case",
        "cast",
        "check",
        "collate",
        "column",
        "constraint",
        "create",
        "cross",
        "current_catalog",
        "current_date",
        "current_role",
        "current_schema",
        "current_time",
        "current_timestamp",
        "current_user",
        "default",
        "deferrable",
        "delete",
        "desc",
        "distinct",
        "do",
        "drop",
        "else",
        "end",
        "except",
        "false",
        "fetch",
        "for",
        "foreign",
        "from",
        "grant",
        "group",
        "having",
        "in",
        "initially",
        "insert",
        "intersect",
        "into",
        "lateral",
        "leading",
        "limit",
        "localtime",
        "localtimestamp",
        "not",
        "null",
        "offset",
        "on",
        "only",
        "or",
        "order",
        "placing",
        "primary",
        "references",
        "returning",
        "select",
        "session_user",
        "some",
        "symmetric",
        "table",
        "then",
        "to",
        "trailing",
        "true",
        "truncate",
        "union",
        "unique",
        "update",
        "user",
        "using",
        "variadic",
        "when",
        "where",
        "window",
        "with",
    }
)

# Prefixes reserved for system use — client identifiers must not start with these.
_RESERVED_PREFIXES: Final[tuple[str, ...]] = (
    "pg_",
    "sql_",
    "praedixa_",
    "platform",
    "audit",
    "public",
    "information_schema",
)


class DDLValidationError(PraedixaError):
    """Raised when a DDL identifier or type fails validation."""

    def __init__(self, message: str, *, field: str | None = None) -> None:
        details: dict[str, str] = {}
        if field:
            details["field"] = field
        super().__init__(
            message=message,
            code="DDL_VALIDATION_ERROR",
            status_code=422,
            details=details if details else None,
        )


def validate_identifier(value: str, *, field: str = "identifier") -> str:
    """Validate a PostgreSQL identifier (schema, table, or column name).

    Returns the validated identifier string (unchanged — already lowercase).
    Raises DDLValidationError on any violation.
    """
    if not isinstance(value, str):
        raise DDLValidationError(
            f"Identifier must be a string, got {type(value).__name__}",
            field=field,
        )

    if not IDENTIFIER_REGEX.fullmatch(value):
        raise DDLValidationError(
            "Identifier must start with a lowercase letter and contain "
            "only lowercase letters, digits, and underscores (max 63 chars)",
            field=field,
        )

    if value in _PG_RESERVED_WORDS:
        raise DDLValidationError(
            "Identifier is a PostgreSQL reserved word",
            field=field,
        )

    for prefix in _RESERVED_PREFIXES:
        if value.startswith(prefix):
            raise DDLValidationError(
                "Identifier uses a reserved prefix",
                field=field,
            )

    return value


def validate_client_slug(value: str) -> str:
    """Validate a client slug used in schema names (e.g. 'acme').

    Client slugs have stricter rules: 3-35 chars, no reserved prefixes.
    The slug is used to form schema names like '{slug}_raw' and '{slug}_transformed'.
    """
    if not isinstance(value, str):
        raise DDLValidationError(
            "Client slug must be a string",
            field="slug",
        )

    if not SLUG_REGEX.fullmatch(value):
        raise DDLValidationError(
            "Client slug must be 3-35 lowercase chars, start with a letter, "
            "contain only letters/digits/underscores",
            field="slug",
        )

    for prefix in _RESERVED_PREFIXES:
        if value.startswith(prefix):
            raise DDLValidationError(
                "Client slug uses a reserved prefix",
                field="slug",
            )

    if value in _PG_RESERVED_WORDS:
        raise DDLValidationError(
            "Client slug is a PostgreSQL reserved word",
            field="slug",
        )

    return value


def validate_schema_name(value: str) -> str:
    """Validate a full schema name (e.g. 'acme_raw', 'acme_transformed').

    Allows reserved suffixes (_raw, _transformed) that would normally
    be blocked by the identifier validator's reserved prefix check.
    """
    if not isinstance(value, str):
        raise DDLValidationError(
            "Schema name must be a string",
            field="schema_name",
        )

    if not IDENTIFIER_REGEX.fullmatch(value):
        raise DDLValidationError(
            "Schema name must start with a lowercase letter and contain "
            "only lowercase letters, digits, and underscores (max 63 chars)",
            field="schema_name",
        )

    if value in _PG_RESERVED_WORDS:
        raise DDLValidationError(
            "Schema name is a PostgreSQL reserved word",
            field="schema_name",
        )

    # Only block system prefixes, not application prefixes
    system_prefixes = ("pg_", "sql_", "information_schema")
    for prefix in system_prefixes:
        if value.startswith(prefix):
            raise DDLValidationError(
                "Schema name uses a system-reserved prefix",
                field="schema_name",
            )

    return value


def validate_column_type(value: str) -> str:
    """Validate and resolve a column type to a safe PostgreSQL type string.

    Returns the canonical PG type string from the allowlist.
    Raises DDLValidationError for unknown types.
    """
    if not isinstance(value, str):
        raise DDLValidationError(
            "Column type must be a string",
            field="column_type",
        )

    normalized = value.strip().lower().replace(" ", "_")
    pg_type = ALLOWED_COLUMN_TYPES.get(normalized)
    if pg_type is None:
        raise DDLValidationError(
            f"Unsupported column type. Allowed: {sorted(ALLOWED_COLUMN_TYPES.keys())}",
            field="column_type",
        )

    return pg_type


def validate_table_name(value: str) -> str:
    """Validate a table name (delegates to validate_identifier)."""
    return validate_identifier(value, field="table_name")


def validate_column_name(value: str) -> str:
    """Validate a column name (delegates to validate_identifier)."""
    return validate_identifier(value, field="column_name")
