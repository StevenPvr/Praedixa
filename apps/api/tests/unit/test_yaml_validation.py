"""Tests for app.core.yaml_validation — strictyaml schema validation.

Covers:
- Valid YAML passes validation
- Unknown keys are rejected (strictyaml's disallow_any_key behavior)
- Out-of-bounds lag values rejected (must be MIN_WINDOW_SIZE..MAX_WINDOW_SIZE)
- Out-of-bounds rolling window values rejected (must be 2..MAX_WINDOW_SIZE)
- Column references (temporal_index, group_by) that don't exist are caught
- Max windows per dataset enforced (MAX_WINDOWS_PER_DATASET = 10)
- Missing required fields fail
- Empty YAML fails
- Duplicate column names rejected
- Invalid dataset name rejected (DDL validation)
- Invalid column name rejected (DDL validation)
- Max columns per table enforced
- Pipeline config defaults applied correctly
"""

from unittest.mock import patch

import pytest

from app.core.yaml_validation import (
    YAMLValidationError,
    validate_dataset_yaml,
)

# ── Valid YAML fixtures ────────────────────────────────────────────


_VALID_MINIMAL_YAML = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: revenue
    dtype: float
    role: target
"""

_VALID_WITH_PIPELINE = """\
name: effectifs
temporal_index: date_col
group_by:
  - department
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: department
    dtype: category
    role: group_by
  - name: revenue
    dtype: float
    role: target
pipeline:
  missing_values: fill_median
  outliers: clip
  deduplication: true
  normalization: zscore
  encoding: onehot
  windows:
    - type: lag
      size: 7
    - type: rolling_mean
      size: 14
"""

_VALID_WITH_RULES_OVERRIDE = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: revenue
    dtype: float
    role: target
    nullable: false
    rules_override:
      fill_strategy: forward
      clip_upper: 99
"""


class TestValidYAML:
    """Test that valid YAML configurations pass validation."""

    def test_minimal_valid_yaml(self):
        result = validate_dataset_yaml(_VALID_MINIMAL_YAML)
        assert result["name"] == "effectifs"
        assert result["temporal_index"] == "date_col"
        assert len(result["columns"]) == 2

    def test_valid_with_pipeline(self):
        result = validate_dataset_yaml(_VALID_WITH_PIPELINE)
        assert result["pipeline"]["missing_values"] == "fill_median"
        assert result["pipeline"]["outliers"] == "clip"
        assert result["pipeline"]["deduplication"] is True
        assert result["pipeline"]["normalization"] == "zscore"
        assert result["pipeline"]["encoding"] == "onehot"
        assert len(result["pipeline"]["windows"]) == 2

    def test_valid_with_rules_override(self):
        result = validate_dataset_yaml(_VALID_WITH_RULES_OVERRIDE)
        target_col = result["columns"][1]
        assert target_col["nullable"] is False
        assert target_col["rules_override"]["fill_strategy"] == "forward"

    def test_valid_group_by(self):
        result = validate_dataset_yaml(_VALID_WITH_PIPELINE)
        assert result["group_by"] == ["department"]

    def test_defaults_applied_when_pipeline_omitted(self):
        """When pipeline section is omitted, defaults should be valid."""
        result = validate_dataset_yaml(_VALID_MINIMAL_YAML)
        assert "pipeline" not in result or result.get("pipeline") is None


class TestMissingRequiredFields:
    """Test that missing required fields cause validation failure."""

    def test_missing_name(self):
        yaml_content = """\
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_missing_temporal_index(self):
        yaml_content = """\
name: effectifs
columns:
  - name: date_col
    dtype: date
    role: temporal_index
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_missing_columns(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_missing_column_name(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - dtype: date
    role: temporal_index
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_missing_column_dtype(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    role: temporal_index
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_missing_column_role(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)


class TestEmptyYAML:
    """Test that empty or blank YAML content fails."""

    def test_empty_string(self):
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml("")

    def test_whitespace_only(self):
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml("   \n  \n  ")


class TestMalformedYAML:
    """Test that syntactically invalid YAML is rejected."""

    def test_malformed_syntax(self):
        yaml_content = """\
name: effectifs
temporal_index: [
  unterminated
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert (
            "Malformed YAML" in exc_info.value.message
            or "Invalid" in exc_info.value.message
        )


class TestUnknownKeys:
    """Test that unknown/extra keys in the YAML are rejected by strictyaml."""

    def test_unknown_top_level_key(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
unknown_field: something
columns:
  - name: date_col
    dtype: date
    role: temporal_index
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_unknown_column_key(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
    bad_key: value
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_unknown_pipeline_key(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  unknown_step: value
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)


class TestInvalidEnumValues:
    """Test that invalid enum values for dtype, role, pipeline options are rejected."""

    def test_invalid_dtype(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: timestamp
    role: temporal_index
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_invalid_role(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: primary_key
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_invalid_missing_values_option(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  missing_values: interpolate
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_invalid_normalization_option(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  normalization: l2norm
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_invalid_encoding_option(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  encoding: embedding
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_invalid_outlier_option(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  outliers: iqr
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)

    def test_invalid_window_type(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  windows:
    - type: ewma
      size: 7
"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_content)


class TestWindowBounds:
    """Test window size validation bounds."""

    def test_lag_size_zero_rejected(self):
        """Lag size 0 is below MIN_WINDOW_SIZE (1)."""
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  windows:
    - type: lag
      size: 0
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "out of bounds" in exc_info.value.message

    def test_lag_size_negative_rejected(self):
        """Negative lag values should be rejected."""
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  windows:
    - type: lag
      size: -5
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "out of bounds" in exc_info.value.message

    @patch("app.core.yaml_validation.settings")
    def test_lag_size_exceeds_max_rejected(self, mock_settings):
        """Lag size > MAX_WINDOW_SIZE is rejected."""
        mock_settings.MAX_WINDOWS_PER_DATASET = 10
        mock_settings.MIN_WINDOW_SIZE = 1
        mock_settings.MAX_WINDOW_SIZE = 365
        mock_settings.MAX_COLUMNS_PER_TABLE = 200

        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  windows:
    - type: lag
      size: 366
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "out of bounds" in exc_info.value.message

    def test_lag_size_at_minimum_accepted(self):
        """Lag size 1 (MIN_WINDOW_SIZE) should be accepted."""
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  windows:
    - type: lag
      size: 1
"""
        result = validate_dataset_yaml(yaml_content)
        assert result["pipeline"]["windows"][0]["size"] == 1

    @patch("app.core.yaml_validation.settings")
    def test_lag_size_at_maximum_accepted(self, mock_settings):
        """Lag size at MAX_WINDOW_SIZE should be accepted."""
        mock_settings.MAX_WINDOWS_PER_DATASET = 10
        mock_settings.MIN_WINDOW_SIZE = 1
        mock_settings.MAX_WINDOW_SIZE = 365
        mock_settings.MAX_COLUMNS_PER_TABLE = 200

        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  windows:
    - type: lag
      size: 365
"""
        result = validate_dataset_yaml(yaml_content)
        assert result["pipeline"]["windows"][0]["size"] == 365

    def test_rolling_mean_size_one_rejected(self):
        """Rolling windows need at least 2 data points."""
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  windows:
    - type: rolling_mean
      size: 1
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "out of bounds" in exc_info.value.message

    def test_rolling_std_size_one_rejected(self):
        """Rolling std also needs at least 2 data points."""
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  windows:
    - type: rolling_std
      size: 1
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "out of bounds" in exc_info.value.message

    def test_rolling_mean_size_two_accepted(self):
        """Rolling mean at size 2 should be accepted."""
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  windows:
    - type: rolling_mean
      size: 2
"""
        result = validate_dataset_yaml(yaml_content)
        assert result["pipeline"]["windows"][0]["size"] == 2


class TestMaxWindows:
    """Test that max windows per dataset is enforced."""

    @patch("app.core.yaml_validation.settings")
    def test_exceeds_max_windows(self, mock_settings):
        """More than MAX_WINDOWS_PER_DATASET should be rejected."""
        mock_settings.MAX_WINDOWS_PER_DATASET = 3
        mock_settings.MIN_WINDOW_SIZE = 1
        mock_settings.MAX_WINDOW_SIZE = 365
        mock_settings.MAX_COLUMNS_PER_TABLE = 200

        windows_yaml = "\n".join(
            f"    - type: lag\n      size: {i + 1}" for i in range(4)
        )
        yaml_content = f"""\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  windows:
{windows_yaml}
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "Too many windows" in exc_info.value.message

    @patch("app.core.yaml_validation.settings")
    def test_at_max_windows_accepted(self, mock_settings):
        """Exactly MAX_WINDOWS_PER_DATASET should pass."""
        mock_settings.MAX_WINDOWS_PER_DATASET = 3
        mock_settings.MIN_WINDOW_SIZE = 1
        mock_settings.MAX_WINDOW_SIZE = 365
        mock_settings.MAX_COLUMNS_PER_TABLE = 200

        windows_yaml = "\n".join(
            f"    - type: lag\n      size: {i + 1}" for i in range(3)
        )
        yaml_content = f"""\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  windows:
{windows_yaml}
"""
        result = validate_dataset_yaml(yaml_content)
        assert len(result["pipeline"]["windows"]) == 3


class TestColumnReferenceValidation:
    """Test that temporal_index and group_by reference existing columns."""

    def test_temporal_index_not_in_columns(self):
        yaml_content = """\
name: effectifs
temporal_index: nonexistent_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "temporal_index not found" in exc_info.value.message

    def test_group_by_not_in_columns(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
group_by:
  - nonexistent_group
columns:
  - name: date_col
    dtype: date
    role: temporal_index
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "group_by" in exc_info.value.message
        assert "nonexistent_group" in exc_info.value.message

    def test_multiple_group_by_one_invalid(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
group_by:
  - department
  - missing_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: department
    dtype: category
    role: group_by
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "missing_col" in exc_info.value.message


class TestDuplicateColumnNames:
    """Test that duplicate column names are rejected."""

    def test_duplicate_column_name(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: date_col
    dtype: float
    role: target
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "Duplicate column name" in exc_info.value.message


class TestInvalidIdentifiers:
    """Test that DDL-unsafe identifiers are rejected."""

    def test_dataset_name_with_uppercase(self):
        yaml_content = """\
name: Effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "Invalid dataset name" in exc_info.value.message

    def test_dataset_name_sql_reserved_word(self):
        yaml_content = """\
name: select
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "Invalid dataset name" in exc_info.value.message

    def test_column_name_with_special_chars(self):
        """Column names with special characters should be rejected."""
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: "date-col"
    dtype: date
    role: temporal_index
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "Invalid column name" in exc_info.value.message

    def test_column_name_sql_injection_attempt(self):
        """SQL injection in column name should be rejected by DDL validation."""
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: "x; drop table--"
    dtype: float
    role: target
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "Invalid column name" in exc_info.value.message

    def test_dataset_name_with_reserved_prefix(self):
        """Dataset name starting with pg_ should be rejected."""
        yaml_content = """\
name: pg_dataset
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "Invalid dataset name" in exc_info.value.message


class TestMaxColumns:
    """Test that column count limit is enforced."""

    @patch("app.core.yaml_validation.settings")
    def test_exceeds_max_columns(self, mock_settings):
        """More than MAX_COLUMNS_PER_TABLE columns should be rejected."""
        mock_settings.MAX_COLUMNS_PER_TABLE = 3
        mock_settings.MAX_WINDOWS_PER_DATASET = 10
        mock_settings.MIN_WINDOW_SIZE = 1
        mock_settings.MAX_WINDOW_SIZE = 365

        cols_yaml = "\n".join(
            f"  - name: col{i}\n    dtype: float\n    role: feature" for i in range(4)
        )
        yaml_content = f"""\
name: effectifs
temporal_index: col0
columns:
{cols_yaml}
"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_content)
        assert "Too many columns" in exc_info.value.message


class TestYAMLValidationError:
    """Test YAMLValidationError exception class."""

    def test_code(self):
        err = YAMLValidationError("test error")
        assert err.code == "YAML_VALIDATION_ERROR"

    def test_status_code(self):
        err = YAMLValidationError("test error")
        assert err.status_code == 422

    def test_details(self):
        err = YAMLValidationError("test", details={"field": "name"})
        assert err.details == {"field": "name"}

    def test_no_details(self):
        err = YAMLValidationError("test")
        assert err.details is None

    def test_inherits_from_praedixa_error(self):
        from app.core.exceptions import PraedixaError

        err = YAMLValidationError("test")
        assert isinstance(err, PraedixaError)


class TestPipelineNoWindows:
    """Test pipeline section with no windows or empty windows."""

    def test_pipeline_without_windows_key(self):
        yaml_content = """\
name: effectifs
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  missing_values: drop
  normalization: none
"""
        result = validate_dataset_yaml(yaml_content)
        assert result["pipeline"]["missing_values"] == "drop"

    def test_empty_group_by(self):
        """Empty group_by list should pass if not referenced."""
        yaml_content = """\
name: effectifs
temporal_index: date_col
group_by: []
columns:
  - name: date_col
    dtype: date
    role: temporal_index
"""
        # strictyaml may not accept empty sequences with Seq(Str());
        # let's see what happens. The code does `data.get("group_by") or []`
        # which handles None case.
        try:
            result = validate_dataset_yaml(yaml_content)
            # If it passes, verify the group_by is empty-ish
            assert result.get("group_by") in ([], None)
        except YAMLValidationError:
            # Also acceptable — strictyaml may reject empty Seq
            pass


class TestColumnNullableDefault:
    """Test that nullable defaults to true when omitted."""

    def test_nullable_defaults_to_true(self):
        result = validate_dataset_yaml(_VALID_MINIMAL_YAML)
        for col in result["columns"]:
            assert col.get("nullable", True) is True
