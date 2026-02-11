"""Shared naming helpers for dataset raw/transformed physical tables."""

from __future__ import annotations

from app.core.ddl_validation import validate_identifier

_TRANSFORMED_SUFFIX = "_transformed"


def get_transformed_table_name(table_name: str) -> str:
    """Return canonical transformed table name for a dataset raw table."""
    validated_table = validate_identifier(table_name, field="table_name")
    transformed = f"{validated_table}{_TRANSFORMED_SUFFIX}"
    return validate_identifier(transformed, field="transformed_table_name")
