"""P0-03 Evidence (YAML) — YAML metadata validation tests.

Validates that strictyaml-based validation correctly:
- Accepts valid, complete YAML configs.
- Rejects unknown keys (prevents silent typos and injection).
- Rejects lag values < 1 or > 365.
- Rejects rolling window values < 2 or > 365.
- Enforces max 10 windows per dataset.
- Detects references to non-existent columns.
- Requires mandatory fields.

These tests serve as contractual evidence for security gate P0-03.
"""

from unittest.mock import patch

import pytest

from app.core.yaml_validation import (
    YAMLValidationError,
    validate_dataset_yaml,
)


def _valid_yaml(*, extra: str = "") -> str:
    """Return a minimal valid dataset YAML string."""
    return f"""name: sales_daily
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: revenue
    dtype: float
    role: target
  - name: region
    dtype: category
    role: group_by
{extra}"""


def _yaml_with_pipeline(
    *,
    windows: str | None = None,
    extra_pipeline: str = "",
) -> str:
    """Return a valid YAML with pipeline config."""
    pipeline_block = "pipeline:\n"
    pipeline_block += "  missing_values: fill_mean\n"
    pipeline_block += "  outliers: clip\n"
    if extra_pipeline:
        pipeline_block += f"  {extra_pipeline}\n"
    if windows:
        pipeline_block += f"  windows:\n{windows}"

    return f"""name: sales_daily
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: revenue
    dtype: float
    role: target
{pipeline_block}"""


class TestValidYAMLPasses:
    """P0-03: Valid YAML configurations pass validation."""

    def test_minimal_valid_yaml(self) -> None:
        """Minimal valid YAML with required fields passes."""
        result = validate_dataset_yaml(_valid_yaml())
        assert result["name"] == "sales_daily"
        assert result["temporal_index"] == "date_col"
        assert len(result["columns"]) == 3

    def test_valid_yaml_with_pipeline(self) -> None:
        """YAML with valid pipeline config passes."""
        yaml_str = _yaml_with_pipeline(
            windows=(
                "    - type: lag\n"
                "      size: 7\n"
                "    - type: rolling_mean\n"
                "      size: 14\n"
            ),
        )
        result = validate_dataset_yaml(yaml_str)
        assert result["pipeline"]["missing_values"] == "fill_mean"
        assert result["pipeline"]["outliers"] == "clip"

    def test_valid_yaml_with_group_by(self) -> None:
        """YAML with group_by referencing valid columns passes."""
        yaml_str = """name: sales_daily
temporal_index: date_col
group_by:
  - region
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: revenue
    dtype: float
    role: target
  - name: region
    dtype: category
    role: group_by"""
        result = validate_dataset_yaml(yaml_str)
        assert result["group_by"] == ["region"]

    def test_valid_yaml_all_dtypes(self) -> None:
        """YAML with all valid column dtypes passes."""
        yaml_str = """name: test_dtypes
temporal_index: ts_col
columns:
  - name: ts_col
    dtype: date
    role: temporal_index
  - name: count_col
    dtype: integer
    role: feature
  - name: val_col
    dtype: float
    role: target
  - name: cat_col
    dtype: category
    role: group_by
  - name: flag_col
    dtype: boolean
    role: meta
  - name: desc_col
    dtype: text
    role: id"""
        result = validate_dataset_yaml(yaml_str)
        assert len(result["columns"]) == 6


class TestUnknownKeysRejected:
    """P0-03: YAML with unknown keys is rejected (strictyaml feature)."""

    def test_unknown_top_level_key_rejected(self) -> None:
        """Extra top-level key is rejected."""
        yaml_str = """name: sales_daily
temporal_index: date_col
hacker_field: malicious_value
columns:
  - name: date_col
    dtype: date
    role: temporal_index"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_unknown_column_key_rejected(self) -> None:
        """Extra key inside a column definition is rejected."""
        yaml_str = """name: sales_daily
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
    injection: malicious"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_unknown_pipeline_key_rejected(self) -> None:
        """Extra key inside pipeline is rejected."""
        yaml_str = """name: sales_daily
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
pipeline:
  missing_values: drop
  exec_command: rm -rf /"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)


class TestLagOutOfBounds:
    """P0-03: Lag window values outside [1, 365] are rejected."""

    def test_lag_zero_rejected(self) -> None:
        """Lag with size=0 is rejected (min is 1)."""
        yaml_str = _yaml_with_pipeline(
            windows="    - type: lag\n      size: 0\n",
        )
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_str)
        assert "out of bounds" in exc_info.value.message.lower()

    def test_lag_negative_rejected(self) -> None:
        """Lag with size=-1 is rejected (strictyaml Int parses negative)."""
        yaml_str = _yaml_with_pipeline(
            windows="    - type: lag\n      size: -1\n",
        )
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_lag_366_rejected(self) -> None:
        """Lag with size=366 is rejected (max is 365)."""
        yaml_str = _yaml_with_pipeline(
            windows="    - type: lag\n      size: 366\n",
        )
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_str)
        assert "out of bounds" in exc_info.value.message.lower()

    def test_lag_1_accepted(self) -> None:
        """Lag with size=1 passes (boundary value)."""
        yaml_str = _yaml_with_pipeline(
            windows="    - type: lag\n      size: 1\n",
        )
        result = validate_dataset_yaml(yaml_str)
        assert result["pipeline"]["windows"][0]["size"] == 1

    def test_lag_365_accepted(self) -> None:
        """Lag with size=365 passes (boundary value)."""
        yaml_str = _yaml_with_pipeline(
            windows="    - type: lag\n      size: 365\n",
        )
        result = validate_dataset_yaml(yaml_str)
        assert result["pipeline"]["windows"][0]["size"] == 365


class TestRollingWindowOutOfBounds:
    """P0-03: Rolling window values outside [2, 365] are rejected."""

    def test_rolling_mean_size_1_rejected(self) -> None:
        """Rolling mean with size=1 is rejected (min is 2 for rolling)."""
        yaml_str = _yaml_with_pipeline(
            windows="    - type: rolling_mean\n      size: 1\n",
        )
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_str)
        assert "out of bounds" in exc_info.value.message.lower()

    def test_rolling_std_size_1_rejected(self) -> None:
        """Rolling std with size=1 is rejected (min is 2 for rolling)."""
        yaml_str = _yaml_with_pipeline(
            windows="    - type: rolling_std\n      size: 1\n",
        )
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_rolling_mean_366_rejected(self) -> None:
        """Rolling mean with size=366 is rejected (max is 365)."""
        yaml_str = _yaml_with_pipeline(
            windows="    - type: rolling_mean\n      size: 366\n",
        )
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_rolling_mean_2_accepted(self) -> None:
        """Rolling mean with size=2 passes (boundary value)."""
        yaml_str = _yaml_with_pipeline(
            windows="    - type: rolling_mean\n      size: 2\n",
        )
        result = validate_dataset_yaml(yaml_str)
        assert result["pipeline"]["windows"][0]["size"] == 2

    def test_rolling_mean_365_accepted(self) -> None:
        """Rolling mean with size=365 passes (boundary value)."""
        yaml_str = _yaml_with_pipeline(
            windows="    - type: rolling_mean\n      size: 365\n",
        )
        result = validate_dataset_yaml(yaml_str)
        assert result["pipeline"]["windows"][0]["size"] == 365


class TestMaxWindowsEnforced:
    """P0-03: More than MAX_WINDOWS_PER_DATASET windows is rejected."""

    def test_11_windows_rejected(self) -> None:
        """11 windows exceeds default max of 10."""
        windows_block = ""
        for i in range(11):
            windows_block += f"    - type: lag\n      size: {i + 1}\n"

        yaml_str = _yaml_with_pipeline(windows=windows_block)
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_str)
        assert "too many windows" in exc_info.value.message.lower()

    def test_10_windows_accepted(self) -> None:
        """10 windows is exactly at the limit and should pass."""
        windows_block = ""
        for i in range(10):
            windows_block += f"    - type: lag\n      size: {i + 1}\n"

        yaml_str = _yaml_with_pipeline(windows=windows_block)
        result = validate_dataset_yaml(yaml_str)
        assert len(result["pipeline"]["windows"]) == 10

    def test_custom_max_windows_enforced(self) -> None:
        """When MAX_WINDOWS_PER_DATASET=5, 6 windows is rejected."""
        windows_block = ""
        for i in range(6):
            windows_block += f"    - type: lag\n      size: {i + 1}\n"

        yaml_str = _yaml_with_pipeline(windows=windows_block)
        with patch("app.core.yaml_validation.settings") as mock_settings:
            mock_settings.MAX_WINDOWS_PER_DATASET = 5
            mock_settings.MIN_WINDOW_SIZE = 1
            mock_settings.MAX_WINDOW_SIZE = 365
            mock_settings.MAX_COLUMNS_PER_TABLE = 200
            with pytest.raises(YAMLValidationError):
                validate_dataset_yaml(yaml_str)


class TestColumnRefMissing:
    """P0-03: References to non-existent columns are detected."""

    def test_temporal_index_ref_missing(self) -> None:
        """temporal_index referencing a non-existent column is rejected."""
        yaml_str = """name: test_dataset
temporal_index: nonexistent_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: revenue
    dtype: float
    role: target"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_str)
        assert "temporal_index" in exc_info.value.message.lower()

    def test_group_by_ref_missing(self) -> None:
        """group_by referencing a non-existent column is rejected."""
        yaml_str = """name: test_dataset
temporal_index: date_col
group_by:
  - nonexistent_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: revenue
    dtype: float
    role: target"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_str)
        assert "group_by" in exc_info.value.message.lower()


class TestMissingRequiredFields:
    """P0-03: YAML without required fields fails validation."""

    def test_missing_name_fails(self) -> None:
        """YAML without 'name' field fails."""
        yaml_str = """temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_missing_temporal_index_fails(self) -> None:
        """YAML without 'temporal_index' field fails."""
        yaml_str = """name: test_dataset
columns:
  - name: date_col
    dtype: date
    role: temporal_index"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_missing_columns_fails(self) -> None:
        """YAML without 'columns' field fails."""
        yaml_str = """name: test_dataset
temporal_index: date_col"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_column_missing_name_fails(self) -> None:
        """Column definition without 'name' field fails."""
        yaml_str = """name: test_dataset
temporal_index: date_col
columns:
  - dtype: float
    role: target"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_column_missing_dtype_fails(self) -> None:
        """Column definition without 'dtype' field fails."""
        yaml_str = """name: test_dataset
temporal_index: date_col
columns:
  - name: revenue
    role: target"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_column_missing_role_fails(self) -> None:
        """Column definition without 'role' field fails."""
        yaml_str = """name: test_dataset
temporal_index: date_col
columns:
  - name: revenue
    dtype: float"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_empty_yaml_fails(self) -> None:
        """Empty YAML string fails."""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml("")

    def test_malformed_yaml_fails(self) -> None:
        """Malformed YAML syntax fails."""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml("{{invalid yaml::: [")


class TestInvalidColumnName:
    """P0-03: Invalid column names in YAML are rejected via DDL validation."""

    def test_column_name_with_special_chars_rejected(self) -> None:
        """Column name with special characters is rejected."""
        yaml_str = """name: test_dataset
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: "revenue; DROP TABLE"
    dtype: float
    role: target"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_dataset_name_with_injection_rejected(self) -> None:
        """Dataset name with injection is rejected."""
        yaml_str = """name: "'; DROP TABLE users;--"
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)


class TestDuplicateColumnNames:
    """P0-03: Duplicate column names are rejected."""

    def test_duplicate_column_name_rejected(self) -> None:
        """Two columns with the same name are rejected."""
        yaml_str = """name: test_dataset
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: temporal_index
  - name: date_col
    dtype: float
    role: target"""
        with pytest.raises(YAMLValidationError) as exc_info:
            validate_dataset_yaml(yaml_str)
        assert "duplicate" in exc_info.value.message.lower()


class TestInvalidDtypeOrRole:
    """P0-03: Invalid dtype or role enum values are rejected."""

    def test_invalid_dtype_rejected(self) -> None:
        """Column with invalid dtype is rejected."""
        yaml_str = """name: test_dataset
temporal_index: date_col
columns:
  - name: date_col
    dtype: varchar
    role: temporal_index"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)

    def test_invalid_role_rejected(self) -> None:
        """Column with invalid role is rejected."""
        yaml_str = """name: test_dataset
temporal_index: date_col
columns:
  - name: date_col
    dtype: date
    role: primary_key"""
        with pytest.raises(YAMLValidationError):
            validate_dataset_yaml(yaml_str)


class TestYAMLValidationErrorProperties:
    """P0-03: YAMLValidationError has correct properties."""

    def test_error_code(self) -> None:
        """YAMLValidationError has code YAML_VALIDATION_ERROR."""
        err = YAMLValidationError("test")
        assert err.code == "YAML_VALIDATION_ERROR"

    def test_error_status_code(self) -> None:
        """YAMLValidationError has status_code 422."""
        err = YAMLValidationError("test")
        assert err.status_code == 422

    def test_error_details(self) -> None:
        """YAMLValidationError includes details when provided."""
        err = YAMLValidationError(
            "test",
            details={"field": "name"},
        )
        assert err.details == {"field": "name"}
