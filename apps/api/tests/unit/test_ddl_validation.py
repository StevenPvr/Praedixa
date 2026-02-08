"""Tests for DDL validation module.

Covers:
- validate_identifier: valid identifiers, invalid patterns,
  reserved words, reserved prefixes
- validate_client_slug: min/max length, slug-specific rules
- validate_schema_name: system prefix blocking, application prefix allowing
- validate_column_type: allowlist mapping, unknown types
- validate_table_name & validate_column_name: delegation to validate_identifier
"""

import pytest

from app.core.ddl_validation import (
    DDLValidationError,
    validate_client_slug,
    validate_column_name,
    validate_column_type,
    validate_identifier,
    validate_schema_name,
    validate_table_name,
)

# ── validate_identifier ──────────────────────────────────────


class TestValidateIdentifier:
    """Tests for the general identifier validator."""

    def test_valid_identifier(self) -> None:
        assert validate_identifier("revenue") == "revenue"

    def test_valid_identifier_with_underscore(self) -> None:
        assert validate_identifier("nb_employes") == "nb_employes"

    def test_valid_identifier_with_digits(self) -> None:
        assert validate_identifier("col1") == "col1"

    def test_valid_identifier_at_max_length(self) -> None:
        name = "a" + "b" * 62  # 63 chars
        assert validate_identifier(name) == name

    def test_rejects_non_string(self) -> None:
        with pytest.raises(DDLValidationError, match="must be a string"):
            validate_identifier(123)  # type: ignore[arg-type]

    def test_rejects_empty_string(self) -> None:
        with pytest.raises(DDLValidationError, match="lowercase letter"):
            validate_identifier("")

    def test_rejects_uppercase(self) -> None:
        with pytest.raises(DDLValidationError, match="lowercase letter"):
            validate_identifier("Revenue")

    def test_rejects_starting_with_digit(self) -> None:
        with pytest.raises(DDLValidationError, match="lowercase letter"):
            validate_identifier("1column")

    def test_rejects_hyphens(self) -> None:
        with pytest.raises(DDLValidationError, match="lowercase letter"):
            validate_identifier("my-column")

    def test_rejects_spaces(self) -> None:
        with pytest.raises(DDLValidationError, match="lowercase letter"):
            validate_identifier("my column")

    def test_rejects_over_63_chars(self) -> None:
        name = "a" * 64
        with pytest.raises(DDLValidationError, match="lowercase letter"):
            validate_identifier(name)

    def test_rejects_reserved_word_select(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved word"):
            validate_identifier("select")

    def test_rejects_reserved_word_table(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved word"):
            validate_identifier("table")

    def test_rejects_reserved_word_from(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved word"):
            validate_identifier("from")

    def test_rejects_pg_prefix(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved prefix"):
            validate_identifier("pg_catalog")

    def test_rejects_sql_prefix(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved prefix"):
            validate_identifier("sql_query")

    def test_rejects_praedixa_prefix(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved prefix"):
            validate_identifier("praedixa_internal")

    def test_rejects_platform_prefix(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved prefix"):
            validate_identifier("platform_config")

    def test_rejects_audit_prefix(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved prefix"):
            validate_identifier("audit_log")

    def test_rejects_public_prefix(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved prefix"):
            validate_identifier("public_data")

    def test_custom_field_name_in_error(self) -> None:
        with pytest.raises(DDLValidationError) as exc_info:
            validate_identifier("SELECT", field="my_field")
        assert exc_info.value.status_code == 422

    def test_rejects_sql_injection_attempt(self) -> None:
        with pytest.raises(DDLValidationError):
            validate_identifier("x; DROP TABLE users")

    def test_rejects_semicolon(self) -> None:
        with pytest.raises(DDLValidationError):
            validate_identifier("col;name")

    def test_rejects_single_quote(self) -> None:
        with pytest.raises(DDLValidationError):
            validate_identifier("col'name")


# ── validate_client_slug ──────────────────────────────────────


class TestValidateClientSlug:
    """Tests for the client slug validator (3-35 chars)."""

    def test_valid_slug(self) -> None:
        assert validate_client_slug("acme") == "acme"

    def test_valid_slug_with_digits(self) -> None:
        assert validate_client_slug("acme123") == "acme123"

    def test_valid_slug_with_underscore(self) -> None:
        assert validate_client_slug("acme_corp") == "acme_corp"

    def test_valid_slug_min_length_3(self) -> None:
        assert validate_client_slug("abc") == "abc"

    def test_rejects_non_string(self) -> None:
        with pytest.raises(DDLValidationError, match="must be a string"):
            validate_client_slug(42)  # type: ignore[arg-type]

    def test_rejects_too_short_2_chars(self) -> None:
        with pytest.raises(DDLValidationError, match="3-35"):
            validate_client_slug("ab")

    def test_rejects_too_long_36_chars(self) -> None:
        slug = "a" + "b" * 35  # 36 chars
        with pytest.raises(DDLValidationError, match="3-35"):
            validate_client_slug(slug)

    def test_rejects_reserved_word(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved word"):
            validate_client_slug("select")

    def test_rejects_pg_prefix(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved prefix"):
            validate_client_slug("pg_client")

    def test_rejects_praedixa_prefix(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved prefix"):
            validate_client_slug("praedixa_test")

    def test_rejects_uppercase(self) -> None:
        with pytest.raises(DDLValidationError):
            validate_client_slug("Acme")


# ── validate_schema_name ──────────────────────────────────────


class TestValidateSchemaName:
    """Tests for the schema name validator (allows application prefixes)."""

    def test_valid_schema_name(self) -> None:
        assert validate_schema_name("acme_raw") == "acme_raw"

    def test_valid_transformed_schema(self) -> None:
        assert validate_schema_name("acme_transformed") == "acme_transformed"

    def test_allows_praedixa_prefix(self) -> None:
        # Application prefixes should be allowed for schema names
        assert validate_schema_name("praedixa_raw") == "praedixa_raw"

    def test_rejects_non_string(self) -> None:
        with pytest.raises(DDLValidationError, match="must be a string"):
            validate_schema_name(42)  # type: ignore[arg-type]

    def test_rejects_invalid_pattern(self) -> None:
        with pytest.raises(DDLValidationError, match="lowercase letter"):
            validate_schema_name("1invalid")

    def test_rejects_reserved_word(self) -> None:
        with pytest.raises(DDLValidationError, match="reserved word"):
            validate_schema_name("select")

    def test_rejects_pg_prefix(self) -> None:
        with pytest.raises(DDLValidationError, match="system-reserved prefix"):
            validate_schema_name("pg_custom")

    def test_rejects_sql_prefix(self) -> None:
        with pytest.raises(DDLValidationError, match="system-reserved prefix"):
            validate_schema_name("sql_internal")

    def test_rejects_information_schema_prefix(self) -> None:
        with pytest.raises(DDLValidationError, match="system-reserved prefix"):
            validate_schema_name("information_schema_ext")


# ── validate_column_type ──────────────────────────────────────


class TestValidateColumnType:
    """Tests for the column type allowlist validator."""

    @pytest.mark.parametrize(
        ("input_type", "expected_pg"),
        [
            ("text", "TEXT"),
            ("integer", "INTEGER"),
            ("bigint", "BIGINT"),
            ("float", "DOUBLE PRECISION"),
            ("double_precision", "DOUBLE PRECISION"),
            ("boolean", "BOOLEAN"),
            ("date", "DATE"),
            ("timestamptz", "TIMESTAMPTZ"),
            ("uuid", "UUID"),
            ("bytea", "BYTEA"),
            ("jsonb", "JSONB"),
        ],
    )
    def test_all_allowed_types(self, input_type, expected_pg) -> None:
        assert validate_column_type(input_type) == expected_pg

    def test_strips_whitespace(self) -> None:
        assert validate_column_type("  text  ") == "TEXT"

    def test_case_insensitive(self) -> None:
        assert validate_column_type("TEXT") == "TEXT"

    def test_rejects_non_string(self) -> None:
        with pytest.raises(DDLValidationError, match="must be a string"):
            validate_column_type(123)  # type: ignore[arg-type]

    def test_rejects_unknown_type(self) -> None:
        with pytest.raises(DDLValidationError, match="Unsupported column type"):
            validate_column_type("varchar")

    def test_rejects_sql_injection_in_type(self) -> None:
        with pytest.raises(DDLValidationError, match="Unsupported"):
            validate_column_type("TEXT; DROP TABLE users")


# ── validate_table_name & validate_column_name ────────────────


class TestValidateTableName:
    """Verify delegation to validate_identifier with field='table_name'."""

    def test_valid_table(self) -> None:
        assert validate_table_name("effectifs") == "effectifs"

    def test_rejects_invalid_table(self) -> None:
        with pytest.raises(DDLValidationError) as exc_info:
            validate_table_name("SELECT")
        # Field should be table_name (not generic "identifier")
        assert exc_info.value.details is not None


class TestValidateColumnName:
    """Verify delegation to validate_identifier with field='column_name'."""

    def test_valid_column(self) -> None:
        assert validate_column_name("nb_employes") == "nb_employes"

    def test_rejects_invalid_column(self) -> None:
        with pytest.raises(DDLValidationError) as exc_info:
            validate_column_name("1bad")
        assert exc_info.value.details is not None


# ── DDLValidationError ────────────────────────────────────────


class TestDDLValidationError:
    """Tests for the custom error class."""

    def test_error_has_code(self) -> None:
        err = DDLValidationError("test error")
        assert err.code == "DDL_VALIDATION_ERROR"

    def test_error_has_422_status(self) -> None:
        err = DDLValidationError("test error")
        assert err.status_code == 422

    def test_error_with_field(self) -> None:
        err = DDLValidationError("bad column", field="col_name")
        assert err.details == {"field": "col_name"}

    def test_error_without_field(self) -> None:
        err = DDLValidationError("generic error")
        assert err.details is None
