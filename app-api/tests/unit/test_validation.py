"""Tests for app.core.validation — input sanitization and validation utilities."""

import uuid

import pytest

from app.core.validation import (
    html_encode,
    limit_string,
    sanitize_search_query,
    sanitize_text,
    validate_horizon,
    validate_uuid,
)


class TestHtmlEncode:
    """Test html_encode function."""

    def test_encodes_angle_brackets(self) -> None:
        assert html_encode("<script>") == "&lt;script&gt;"

    def test_encodes_ampersand(self) -> None:
        assert html_encode("a & b") == "a &amp; b"

    def test_encodes_quotes(self) -> None:
        assert html_encode('"hello"') == "&quot;hello&quot;"
        assert html_encode("it's") == "it&#x27;s"

    def test_plain_text_unchanged(self) -> None:
        assert html_encode("hello world") == "hello world"

    def test_empty_string(self) -> None:
        assert html_encode("") == ""

    def test_unicode_preserved(self) -> None:
        assert html_encode("cafe") == "cafe"


class TestLimitString:
    """Test limit_string function."""

    def test_short_string_unchanged(self) -> None:
        assert limit_string("abc", 10) == "abc"

    def test_exact_length_unchanged(self) -> None:
        assert limit_string("abcde", 5) == "abcde"

    def test_long_string_truncated(self) -> None:
        assert limit_string("abcdefghij", 5) == "abcde"

    def test_default_max_length(self) -> None:
        long_str = "x" * 1001
        result = limit_string(long_str)
        assert len(result) == 1000

    def test_empty_string(self) -> None:
        assert limit_string("", 10) == ""


class TestSanitizeText:
    """Test sanitize_text — HTML encode + strip + limit."""

    def test_strips_whitespace(self) -> None:
        assert sanitize_text("  hello  ") == "hello"

    def test_encodes_html_and_limits(self) -> None:
        result = sanitize_text("<script>alert('xss')</script>", max_length=50)
        assert "<script>" not in result
        assert "&lt;script&gt;" in result

    def test_truncation_after_encoding(self) -> None:
        """Encoding increases length, then truncation applies."""
        result = sanitize_text("x" * 2000, max_length=100)
        assert len(result) == 100

    def test_empty_string(self) -> None:
        assert sanitize_text("") == ""


class TestValidateUuid:
    """Test validate_uuid function."""

    def test_valid_uuid(self) -> None:
        test_uuid = "550e8400-e29b-41d4-a716-446655440000"
        result = validate_uuid(test_uuid)
        assert isinstance(result, uuid.UUID)
        assert str(result) == test_uuid

    def test_invalid_uuid_raises(self) -> None:
        with pytest.raises(ValueError, match="Invalid UUID format"):
            validate_uuid("not-a-uuid")

    def test_empty_string_raises(self) -> None:
        with pytest.raises(ValueError, match="Invalid UUID format"):
            validate_uuid("")

    def test_error_does_not_reflect_input(self) -> None:
        """Ensure the error message does not contain the input value."""
        malicious = "<script>alert(1)</script>"
        with pytest.raises(ValueError) as exc_info:
            validate_uuid(malicious)
        assert malicious not in str(exc_info.value)

    def test_uppercase_uuid_valid(self) -> None:
        test_uuid = "550E8400-E29B-41D4-A716-446655440000"
        result = validate_uuid(test_uuid)
        assert isinstance(result, uuid.UUID)


class TestSanitizeSearchQuery:
    """Test sanitize_search_query function."""

    def test_simple_query(self) -> None:
        assert sanitize_search_query("hello world") == "hello world"

    def test_strips_whitespace(self) -> None:
        assert sanitize_search_query("  hello  ") == "hello"

    def test_removes_special_chars(self) -> None:
        assert sanitize_search_query("hello!@#$%") == "hello"

    def test_preserves_french_accents(self) -> None:
        assert sanitize_search_query("cafe resume") == "cafe resume"
        assert sanitize_search_query("ete") == "ete"

    def test_preserves_hyphens(self) -> None:
        assert sanitize_search_query("Saint-Denis") == "Saint-Denis"

    def test_strips_sql_injection(self) -> None:
        result = sanitize_search_query("'; DROP TABLE users;--")
        # Allowlist keeps alphanumeric + spaces (SQL keywords are preserved
        # since SQL injection is prevented by parameterized queries, not sanitization)
        assert "'" not in result
        assert ";" not in result

    def test_max_length_200(self) -> None:
        long_query = "a" * 300
        result = sanitize_search_query(long_query)
        assert len(result) == 200

    def test_empty_string(self) -> None:
        assert sanitize_search_query("") == ""

    def test_preserves_numbers(self) -> None:
        assert sanitize_search_query("site 42") == "site 42"

    def test_preserves_underscores(self) -> None:
        assert sanitize_search_query("dept_name") == "dept_name"


class TestValidateHorizon:
    """Test validate_horizon function."""

    def test_valid_3(self) -> None:
        assert validate_horizon(3) == 3

    def test_valid_7(self) -> None:
        assert validate_horizon(7) == 7

    def test_valid_14(self) -> None:
        assert validate_horizon(14) == 14

    def test_invalid_1_raises(self) -> None:
        with pytest.raises(ValueError, match="Invalid horizon"):
            validate_horizon(1)

    def test_invalid_30_raises(self) -> None:
        with pytest.raises(ValueError, match="Invalid horizon"):
            validate_horizon(30)

    def test_invalid_0_raises(self) -> None:
        with pytest.raises(ValueError, match="Invalid horizon"):
            validate_horizon(0)

    def test_invalid_negative_raises(self) -> None:
        with pytest.raises(ValueError, match="Invalid horizon"):
            validate_horizon(-1)
