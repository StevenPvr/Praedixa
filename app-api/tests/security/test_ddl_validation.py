"""P0-03 Evidence — DDL identifier validation tests.

Validates that ALL identifiers used in dynamic DDL pass through
strict allowlist validation before being used, even when also
wrapped in psycopg.sql.Identifier (defense in depth).

Tests cover:
- Valid identifiers pass (lowercase, underscores, digits).
- SQL injection payloads are rejected.
- PostgreSQL reserved words are rejected.
- System prefixes (pg_, sql_, etc.) are rejected.
- Special characters are rejected.
- Empty strings, too-long strings, uppercase-only, digit-start rejected.
- Column types: valid types pass, invalid/injection types rejected.

These tests serve as contractual evidence for security gate P0-03.
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


class TestValidIdentifiersPass:
    """P0-03: Valid identifiers pass validation."""

    def test_simple_lowercase_passes(self) -> None:
        """Simple lowercase identifier passes."""
        assert validate_identifier("acme") == "acme"

    def test_with_underscores_passes(self) -> None:
        """Identifier with underscores passes."""
        assert validate_identifier("test_org_123") == "test_org_123"

    def test_single_char_passes(self) -> None:
        """Single lowercase letter passes."""
        assert validate_identifier("a") == "a"

    def test_max_length_63_passes(self) -> None:
        """Identifier at exactly 63 chars passes."""
        ident = "a" + "b" * 62
        assert validate_identifier(ident) == ident

    def test_mixed_lower_digits_underscores(self) -> None:
        """Identifier with mix of lowercase, digits, underscores passes."""
        assert validate_identifier("col_2024_v3") == "col_2024_v3"

    def test_starts_with_letter(self) -> None:
        """Identifier starting with a lowercase letter passes."""
        assert validate_identifier("dataset") == "dataset"


class TestSQLInjectionRejected:
    """P0-03: SQL injection payloads in identifiers are rejected."""

    @pytest.mark.parametrize(
        "injection",
        [
            "'; DROP TABLE users;--",
            "UNION SELECT * FROM pg_tables",
            "1=1; --",
            "'; DELETE FROM users WHERE '1'='1",
            "test'; INSERT INTO admin VALUES('hacker",
            "name OR 1=1",
            "x UNION ALL SELECT password FROM users",
        ],
    )
    def test_sql_injection_rejected(self, injection: str) -> None:
        """SQL injection payloads are rejected by identifier validation."""
        with pytest.raises(DDLValidationError):
            validate_identifier(injection)

    @pytest.mark.parametrize(
        "injection",
        [
            "'; DROP TABLE users;--",
            "UNION SELECT * FROM pg_tables",
            "1=1; --",
        ],
    )
    def test_sql_injection_in_table_name_rejected(
        self,
        injection: str,
    ) -> None:
        """SQL injection in table name is rejected."""
        with pytest.raises(DDLValidationError):
            validate_table_name(injection)

    @pytest.mark.parametrize(
        "injection",
        [
            "'; DROP TABLE users;--",
            "UNION SELECT * FROM pg_tables",
        ],
    )
    def test_sql_injection_in_column_name_rejected(
        self,
        injection: str,
    ) -> None:
        """SQL injection in column name is rejected."""
        with pytest.raises(DDLValidationError):
            validate_column_name(injection)


class TestReservedWordsRejected:
    """P0-03: PostgreSQL reserved words are rejected."""

    @pytest.mark.parametrize(
        "word",
        [
            "select",
            "from",
            "where",
            "drop",
            "table",
            "insert",
            "update",
            "delete",
            "create",
            "union",
            "grant",
            "having",
            "order",
            "group",
            "into",
            "between",
            "distinct",
            "not",
            "null",
            "true",
            "false",
            "and",
            "or",
        ],
    )
    def test_reserved_word_rejected(self, word: str) -> None:
        """PostgreSQL reserved word is rejected as an identifier."""
        # Only test words that are actually in the _PG_RESERVED_WORDS set
        # AND pass the regex check (lowercase alpha start)
        with pytest.raises(DDLValidationError):
            validate_identifier(word)


class TestSystemPrefixesRejected:
    """P0-03: System-reserved prefixes are rejected."""

    @pytest.mark.parametrize(
        "identifier",
        [
            "pg_tables",
            "pg_stat_activity",
            "sql_query",
            "sql_features",
            "praedixa_internal",
            "platform_schema",
            "audit_log",
            "public_data",
            "information_schema_check",
        ],
    )
    def test_system_prefix_rejected(self, identifier: str) -> None:
        """Identifiers starting with system prefixes are rejected."""
        with pytest.raises(DDLValidationError):
            validate_identifier(identifier)


class TestSpecialCharsRejected:
    """P0-03: Special characters in identifiers are rejected."""

    @pytest.mark.parametrize(
        "identifier",
        [
            "test.table",
            "test;table",
            "test'table",
            'test"table',
            "test table",
            "test-table",
            "test@table",
            "test$table",
            "test%table",
            "test(table)",
            "test[table]",
            "test{table}",
            "test\\table",
            "test/table",
            "test\ntable",
            "test\ttable",
        ],
    )
    def test_special_char_rejected(self, identifier: str) -> None:
        """Identifiers with special characters are rejected."""
        with pytest.raises(DDLValidationError):
            validate_identifier(identifier)


class TestEmptyStringRejected:
    """P0-03: Empty string raises DDLValidationError."""

    def test_empty_string_rejected(self) -> None:
        """Empty string is rejected."""
        with pytest.raises(DDLValidationError):
            validate_identifier("")

    def test_whitespace_only_rejected(self) -> None:
        """Whitespace-only string is rejected."""
        with pytest.raises(DDLValidationError):
            validate_identifier("   ")


class TestTooLongRejected:
    """P0-03: String > 63 chars is rejected (PostgreSQL NAMEDATALEN limit)."""

    def test_64_chars_rejected(self) -> None:
        """Identifier at 64 chars is rejected (1 over limit)."""
        ident = "a" + "b" * 63  # 64 chars total
        with pytest.raises(DDLValidationError):
            validate_identifier(ident)

    def test_100_chars_rejected(self) -> None:
        """Very long identifier is rejected."""
        ident = "a" + "b" * 99
        with pytest.raises(DDLValidationError):
            validate_identifier(ident)


class TestUppercaseRejected:
    """P0-03: Uppercase identifiers are rejected (must be lowercase)."""

    def test_all_uppercase_rejected(self) -> None:
        """All-uppercase identifier is rejected."""
        with pytest.raises(DDLValidationError):
            validate_identifier("TEST")

    def test_mixed_case_rejected(self) -> None:
        """Mixed-case identifier is rejected."""
        with pytest.raises(DDLValidationError):
            validate_identifier("TestTable")

    def test_uppercase_first_letter_rejected(self) -> None:
        """Capital first letter is rejected."""
        with pytest.raises(DDLValidationError):
            validate_identifier("Acme")


class TestStartsWithNumberRejected:
    """P0-03: Identifiers starting with a digit are rejected."""

    def test_starts_with_digit_rejected(self) -> None:
        """'123abc' is rejected."""
        with pytest.raises(DDLValidationError):
            validate_identifier("123abc")

    def test_starts_with_zero_rejected(self) -> None:
        """'0column' is rejected."""
        with pytest.raises(DDLValidationError):
            validate_identifier("0column")

    def test_underscore_start_rejected(self) -> None:
        """'_private' is rejected (must start with letter)."""
        with pytest.raises(DDLValidationError):
            validate_identifier("_private")


class TestValidColumnTypes:
    """P0-03: Valid column types pass validation and resolve to PG types."""

    @pytest.mark.parametrize(
        ("dtype", "expected_pg"),
        [
            ("float", "DOUBLE PRECISION"),
            ("integer", "INTEGER"),
            ("date", "DATE"),
            ("boolean", "BOOLEAN"),
            ("text", "TEXT"),
            ("category", "TEXT"),
            ("bigint", "BIGINT"),
            ("uuid", "UUID"),
            ("timestamptz", "TIMESTAMPTZ"),
            ("bytea", "BYTEA"),
            ("jsonb", "JSONB"),
            ("double_precision", "DOUBLE PRECISION"),
        ],
    )
    def test_valid_column_type(
        self,
        dtype: str,
        expected_pg: str,
    ) -> None:
        """Valid column type resolves to the correct PG type string."""
        assert validate_column_type(dtype) == expected_pg

    def test_column_type_case_insensitive(self) -> None:
        """Column types are normalized to lowercase before lookup."""
        assert validate_column_type("TEXT") == "TEXT"
        assert validate_column_type("Float") == "DOUBLE PRECISION"

    def test_column_type_whitespace_stripped(self) -> None:
        """Leading/trailing whitespace is stripped."""
        assert validate_column_type("  integer  ") == "INTEGER"

    def test_column_type_space_to_underscore(self) -> None:
        """Internal spaces are converted to underscores for lookup."""
        assert validate_column_type("double precision") == "DOUBLE PRECISION"


class TestInvalidColumnTypeRejected:
    """P0-03: Invalid column types are rejected."""

    @pytest.mark.parametrize(
        "bad_type",
        [
            "DROP TABLE",
            "varchar(255); --",
            "serial",
            "money",
            "xml",
            "NUMERIC",
            "ARRAY",
            "",
            "   ",
            "'; SELECT 1;--",
        ],
    )
    def test_invalid_column_type_rejected(self, bad_type: str) -> None:
        """Unknown/malicious column types are rejected."""
        with pytest.raises(DDLValidationError):
            validate_column_type(bad_type)

    def test_non_string_type_rejected(self) -> None:
        """Non-string column type is rejected."""
        with pytest.raises(DDLValidationError):
            validate_column_type(123)  # type: ignore[arg-type]

    def test_non_string_identifier_rejected(self) -> None:
        """Non-string identifier is rejected."""
        with pytest.raises(DDLValidationError):
            validate_identifier(123)  # type: ignore[arg-type]


class TestValidateClientSlug:
    """P0-03: Client slug validation (stricter than identifier)."""

    def test_valid_slug_passes(self) -> None:
        """Valid 3+ char slug passes."""
        assert validate_client_slug("acme") == "acme"
        assert validate_client_slug("test_org_123") == "test_org_123"

    def test_slug_too_short_rejected(self) -> None:
        """Slug < 3 chars is rejected."""
        with pytest.raises(DDLValidationError):
            validate_client_slug("ab")

    def test_slug_too_long_rejected(self) -> None:
        """Slug > 35 chars is rejected."""
        slug = "a" + "b" * 35  # 36 chars total
        with pytest.raises(DDLValidationError):
            validate_client_slug(slug)

    def test_slug_system_prefix_rejected(self) -> None:
        """Slug with system prefix is rejected."""
        with pytest.raises(DDLValidationError):
            validate_client_slug("pg_custom")

    def test_slug_reserved_word_rejected(self) -> None:
        """Slug that is a reserved word is rejected."""
        with pytest.raises(DDLValidationError):
            validate_client_slug("select")

    def test_non_string_slug_rejected(self) -> None:
        """Non-string slug is rejected."""
        with pytest.raises(DDLValidationError):
            validate_client_slug(42)  # type: ignore[arg-type]


class TestValidateSchemaName:
    """P0-03: Schema name validation."""

    def test_valid_schema_name_passes(self) -> None:
        """Valid schema names (including _raw, _transformed suffixes) pass."""
        assert validate_schema_name("acme_raw") == "acme_raw"
        assert validate_schema_name("acme_transformed") == "acme_transformed"

    def test_schema_system_prefix_rejected(self) -> None:
        """Schema with pg_ or sql_ system prefix is rejected."""
        with pytest.raises(DDLValidationError):
            validate_schema_name("pg_custom")
        with pytest.raises(DDLValidationError):
            validate_schema_name("sql_custom")

    def test_schema_reserved_word_rejected(self) -> None:
        """Schema name that is a reserved word is rejected."""
        with pytest.raises(DDLValidationError):
            validate_schema_name("select")

    def test_schema_special_chars_rejected(self) -> None:
        """Schema name with special chars is rejected."""
        with pytest.raises(DDLValidationError):
            validate_schema_name("acme.raw")

    def test_non_string_schema_rejected(self) -> None:
        """Non-string schema name is rejected."""
        with pytest.raises(DDLValidationError):
            validate_schema_name(42)  # type: ignore[arg-type]

    def test_schema_allows_praedixa_prefix(self) -> None:
        """Schema names with praedixa_ prefix are allowed (not blocked
        by system prefix check in validate_schema_name)."""
        # validate_schema_name only blocks pg_, sql_, information_schema
        assert validate_schema_name("praedixa_data") == "praedixa_data"


class TestDDLValidationErrorProperties:
    """P0-03: DDLValidationError has correct properties."""

    def test_error_code_is_ddl_validation(self) -> None:
        """DDLValidationError has code DDL_VALIDATION_ERROR."""
        err = DDLValidationError("test message")
        assert err.code == "DDL_VALIDATION_ERROR"

    def test_error_status_code_is_422(self) -> None:
        """DDLValidationError has status_code 422."""
        err = DDLValidationError("test message")
        assert err.status_code == 422

    def test_error_field_in_details(self) -> None:
        """DDLValidationError includes field in details when provided."""
        err = DDLValidationError("test", field="column_name")
        assert err.details is not None
        assert err.details["field"] == "column_name"

    def test_error_no_field(self) -> None:
        """DDLValidationError has no details when field not provided."""
        err = DDLValidationError("test")
        assert err.details is None or err.details == {}

    def test_validate_identifier_sets_field(self) -> None:
        """validate_identifier passes field name to DDLValidationError."""
        with pytest.raises(DDLValidationError) as exc_info:
            validate_identifier("", field="my_field")
        assert exc_info.value.details is not None
        assert exc_info.value.details["field"] == "my_field"
