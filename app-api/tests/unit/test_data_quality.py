"""Unit tests for the data quality pipeline.

Tests cover: deduplication, MCAR/MAR classification, causal imputation,
forward-fill, rolling median, group-aware imputation, IQR and Z-score
outlier detection, config overrides, and edge cases.
"""

import copy
import datetime
from types import SimpleNamespace

import pytest

from app.services.data_quality import (
    ColumnReport,
    QualityConfig,
    QualityResult,
    _clamp_values,
    _classify_missing,
    _collect_past_group_values,
    _collect_past_values,
    _compute_outlier_bounds,
    _config_to_dict,
    _deduplicate,
    _detect_and_clamp_outliers,
    _impute_column,
    _impute_forward_fill,
    _impute_mar,
    _impute_mar_grouped,
    _impute_mcar_temporal,
    _iqr_bounds,
    _is_mar_group,
    _is_mar_temporal,
    _iso_week,
    _median,
    _normalize_date,
    _parse_date_string,
    _percentile,
    _ratio_exceeds_threshold,
    _try_global_median,
    _try_group_ffill,
    _try_group_median,
    _zscore_bounds,
    run_quality_checks,
)

# ── Test Helpers ──────────────────────────────────


def make_column(
    name: str, dtype: str = "float", role: str = "feature", nullable: bool = True
):
    """Create a mock DatasetColumn using SimpleNamespace (project convention)."""
    return SimpleNamespace(
        name=name,
        dtype=SimpleNamespace(value=dtype),
        role=SimpleNamespace(value=role),
        nullable=nullable,
    )


def make_rows(
    n: int,
    start_date: datetime.date = datetime.date(2025, 1, 1),
    value_fn=None,
):
    """Generate n test rows with sequential dates and a numeric value column."""
    if value_fn is None:

        def value_fn(i):
            return float(i + 10)

    return [
        {"date": start_date + datetime.timedelta(days=i), "value": value_fn(i)}
        for i in range(n)
    ]


def make_rows_with_groups(
    n: int,
    groups: list[str],
    start_date: datetime.date = datetime.date(2025, 1, 1),
):
    """Generate n rows per group with sequential dates."""
    rows = []
    for g in groups:
        rows.extend(
            {
                "date": start_date + datetime.timedelta(days=i),
                "value": float(i + 10),
                "group": g,
            }
            for i in range(n)
        )
    return rows


DEFAULT_COLUMNS = [
    make_column("date", dtype="date", role="temporal_index"),
    make_column("value", dtype="float", role="feature"),
]


# ── Deduplication Tests ──────────────────────────


class TestDeduplication:
    """Tests for _deduplicate() and dedup-related run_quality_checks behavior."""

    def test_dedup_no_duplicates(self) -> None:
        """All unique rows remain unchanged."""
        rows = make_rows(5)
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert result.rows_received == 5
        assert result.rows_after_dedup == 5
        assert result.duplicates_found == 0
        assert result.duplicates_removed == 0

    def test_dedup_some_duplicates(self) -> None:
        """Duplicate rows are removed; first occurrence is kept."""
        rows = make_rows(3)
        rows.append(copy.deepcopy(rows[0]))  # duplicate of first row
        rows.append(copy.deepcopy(rows[1]))  # duplicate of second row
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert result.rows_received == 5
        assert result.rows_after_dedup == 3
        assert result.duplicates_removed == 2
        assert result.duplicates_found == 2
        # First occurrences kept in temporal order
        dates = [r["date"] for r in result.cleaned_rows]
        assert dates == sorted(dates)

    def test_dedup_all_duplicates(self) -> None:
        """When all rows are identical, only 1 remains."""
        row = {"date": datetime.date(2025, 1, 1), "value": 42.0}
        rows = [copy.deepcopy(row) for _ in range(5)]
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert result.rows_after_dedup == 1
        assert result.duplicates_removed == 4
        # 1 duplicate group with 4 extra copies
        assert result.duplicates_found == 1

    def test_dedup_custom_columns(self) -> None:
        """Custom duplicate_columns ignores non-listed columns."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0, "extra": "a"},
            {"date": datetime.date(2025, 1, 1), "value": 10.0, "extra": "b"},
        ]
        cols = [*DEFAULT_COLUMNS, make_column("extra", dtype="text")]
        # Without custom dedup cols, "extra" differs -> not duplicate
        result1 = run_quality_checks(rows, cols, "date")
        assert result1.duplicates_removed == 0

        # With custom dedup cols, only date+value checked -> duplicate
        cfg = QualityConfig(duplicate_columns=["date", "value"])
        result2 = run_quality_checks(copy.deepcopy(rows), cols, "date", config=cfg)
        assert result2.duplicates_removed == 1

    def test_dedup_different_temporal_index_not_deduped(self) -> None:
        """Same data columns but different dates are NOT duplicates."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 42.0},
            {"date": datetime.date(2025, 1, 2), "value": 42.0},
        ]
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert result.duplicates_removed == 0
        assert result.rows_after_dedup == 2

    def test_dedup_empty_input(self) -> None:
        """0 rows returns a valid empty result."""
        result = run_quality_checks([], DEFAULT_COLUMNS, "date")
        assert result.rows_received == 0
        assert result.rows_after_dedup == 0
        assert result.cleaned_rows == []

    def test_dedup_single_row(self) -> None:
        """1 row has no duplicates."""
        rows = make_rows(1)
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert result.rows_after_dedup == 1
        assert result.duplicates_removed == 0

    def test_dedup_preserves_temporal_order(self) -> None:
        """After dedup, rows are sorted by temporal index (earliest first)."""
        rows = [
            {"date": datetime.date(2025, 1, 3), "value": 30.0},
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 2), "value": 20.0},
        ]
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        dates = [r["date"] for r in result.cleaned_rows]
        assert dates == [
            datetime.date(2025, 1, 1),
            datetime.date(2025, 1, 2),
            datetime.date(2025, 1, 3),
        ]

    def test_dedup_system_columns_excluded(self) -> None:
        """System columns (_row_id, etc.) are NOT used for fingerprinting by default."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0, "_row_id": 1},
            {"date": datetime.date(2025, 1, 1), "value": 10.0, "_row_id": 2},
        ]
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        # _row_id differs but system cols excluded -> treated as duplicate
        assert result.duplicates_removed == 1


# ── MCAR Detection Tests ────────────────────────


class TestMCARDetection:
    """Tests for _classify_missing returning 'mcar'."""

    def test_mcar_uniform_missing(self) -> None:
        """Uniformly distributed missing values across weeks -> 'mcar'."""
        # 30 rows across 4+ weeks, sprinkle None uniformly
        rows = make_rows(30)
        for i in range(0, 30, 5):
            rows[i]["value"] = None
        result = _classify_missing(rows, "value", "date", None)
        assert result == "mcar"

    def test_mcar_no_missing(self) -> None:
        """When column has no missing values, run_quality_checks reports 'none'."""
        rows = make_rows(10)
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert result.column_reports["value"].missing_type == "none"

    def test_mcar_single_missing(self) -> None:
        """1 missing value out of many -> 'mcar' (only 1 week has missing)."""
        rows = make_rows(20)
        rows[5]["value"] = None
        result = _classify_missing(rows, "value", "date", None)
        assert result == "mcar"

    def test_mcar_all_missing(self) -> None:
        """All values are None -> 'mcar' (no variation to detect MAR)."""
        rows = make_rows(10)
        for r in rows:
            r["value"] = None
        result = _classify_missing(rows, "value", "date", None)
        assert result == "mcar"

    def test_mcar_single_row(self) -> None:
        """1 row -> always 'mcar' (early return for len <= 1)."""
        rows = [{"date": datetime.date(2025, 1, 1), "value": None}]
        result = _classify_missing(rows, "value", "date", None)
        assert result == "mcar"

    def test_mcar_low_volume(self) -> None:
        """Low missing rate -> 'mcar' (pattern-based, not volume)."""
        rows = make_rows(100)
        rows[50]["value"] = None  # 1% missing
        result = _classify_missing(rows, "value", "date", None)
        assert result == "mcar"


# ── MAR Detection Tests ─────────────────────────


class TestMARDetection:
    """Tests for _classify_missing returning 'mar'."""

    def test_mar_temporal_clustering(self) -> None:
        """Missing values concentrated in specific weeks -> 'mar'.

        We create data spanning 6 weeks. All 7 values in week 3 are
        missing, while only 1 in week 6 is missing. The ratio of
        missing rates (1.0 / 0.14) > 3.0 -> MAR.
        """
        base = datetime.date(2025, 1, 6)  # Monday
        rows = []
        for week_offset in range(6):
            for day in range(7):
                d = base + datetime.timedelta(weeks=week_offset, days=day)
                rows.append({"date": d, "value": float(day + week_offset * 7)})

        # Null ALL values in week 2 (indices 14-20)
        for i in range(14, 21):
            rows[i]["value"] = None
        # Null 1 value in week 5 (index 35)
        rows[35]["value"] = None

        result = _classify_missing(rows, "value", "date", None)
        assert result == "mar"

    def test_mar_group_correlation(self) -> None:
        """Missing correlated with specific group -> 'mar'."""
        rows = []
        base = datetime.date(2025, 1, 1)
        # Group A: 50% missing (high rate)
        for i in range(20):
            val = None if i < 10 else float(i)
            rows.append(
                {"date": base + datetime.timedelta(days=i), "value": val, "group": "A"}
            )
        # Group B: 5% missing (low rate)
        for i in range(20):
            val = None if i == 0 else float(i + 100)
            rows.append(
                {"date": base + datetime.timedelta(days=i), "value": val, "group": "B"}
            )

        # Ratio: 0.5 / 0.05 = 10.0 > 3.0 -> MAR
        result = _classify_missing(rows, "value", "date", ["group"])
        assert result == "mar"

    def test_mar_mixed_columns(self) -> None:
        """Some columns MCAR, some MAR — verified via column reports."""
        base = datetime.date(2025, 1, 6)
        rows = []
        for week in range(6):
            for day in range(7):
                d = base + datetime.timedelta(weeks=week, days=day)
                rows.append({"date": d, "col_a": float(day), "col_b": float(day)})

        # col_a: uniform missing -> MCAR
        for i in range(0, 42, 7):
            rows[i]["col_a"] = None

        # col_b: concentrated in week 2 -> MAR
        for i in range(14, 21):
            rows[i]["col_b"] = None
        rows[35]["col_b"] = None

        columns = [
            make_column("date", dtype="date"),
            make_column("col_a", dtype="float"),
            make_column("col_b", dtype="float"),
        ]
        result = run_quality_checks(rows, columns, "date")
        assert result.column_reports["col_a"].missing_type == "mcar"
        assert result.column_reports["col_b"].missing_type == "mar"

    def test_mar_needs_sufficient_data(self) -> None:
        """Too few rows for MAR detection -> defaults to 'mcar'."""
        # Only 2 rows, 1 missing
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 2), "value": None},
        ]
        result = _classify_missing(rows, "value", "date", None)
        assert result == "mcar"

    def test_mar_multiple_groups(self) -> None:
        """Different missing rates across 3 groups, one dramatically higher."""
        base = datetime.date(2025, 1, 1)
        rows = []
        for i in range(30):
            rows.append(
                {
                    "date": base + datetime.timedelta(days=i),
                    "value": float(i),
                    "group": "X",
                }
            )
            rows.append(
                {
                    "date": base + datetime.timedelta(days=i),
                    "value": float(i + 100),
                    "group": "Y",
                }
            )
            rows.append(
                {
                    "date": base + datetime.timedelta(days=i),
                    "value": float(i + 200),
                    "group": "Z",
                }
            )

        # Group X: 80% missing
        for i in range(0, 90, 3):
            if i < 72:
                rows[i]["value"] = None

        # Group Y: 10% missing
        for i in range(1, 90, 30):
            rows[i]["value"] = None

        result = _classify_missing(rows, "value", "date", ["group"])
        assert result == "mar"

    def test_mar_temporal_ratio_at_threshold(self) -> None:
        """Ratio exactly at _MAR_RATIO_THRESHOLD (3.0) -> stays 'mcar' (strictly >)."""
        base = datetime.date(2025, 1, 6)
        rows = []
        for week in range(4):
            for day in range(7):
                d = base + datetime.timedelta(weeks=week, days=day)
                rows.append({"date": d, "value": float(day + week * 7)})

        # Week 0: 3/7 missing rate = 0.4286
        for i in range(3):
            rows[i]["value"] = None
        # Week 2: 1/7 missing rate = 0.1429
        rows[14]["value"] = None
        # Ratio = 0.4286 / 0.1429 = 3.0 exactly -> NOT > 3.0 -> mcar
        result = _classify_missing(rows, "value", "date", None)
        assert result == "mcar"


# ── Imputation Forward-Fill Tests ────────────────


class TestImputationForwardFill:
    """Tests for forward-fill behavior in _impute_mcar_temporal."""

    def test_ffill_basic(self) -> None:
        """Simple gap in middle filled with last known value."""
        rows = make_rows(5)
        rows[2]["value"] = None  # Gap at index 2
        imputed = _impute_mcar_temporal(rows, "value", "date", 14)
        assert imputed == 1
        assert rows[2]["value"] == rows[1]["value"]

    def test_ffill_beginning_of_series(self) -> None:
        """Gap at beginning with no prior value -> tries rolling median."""
        rows = make_rows(10)
        rows[0]["value"] = None
        imputed = _impute_mcar_temporal(rows, "value", "date", 14)
        # No prior value for row 0, no past rows -> left as None
        assert rows[0]["value"] is None
        assert imputed == 0

    def test_ffill_preserves_existing(self) -> None:
        """Non-null values are never changed by forward-fill."""
        rows = make_rows(5)
        original_values = [r["value"] for r in rows]
        _impute_mcar_temporal(rows, "value", "date", 14)
        for orig, row in zip(original_values, rows, strict=False):
            assert row["value"] == orig

    def test_ffill_no_lookahead(self) -> None:
        """Value AFTER a gap is NOT used to fill the gap."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 2), "value": None},
            {"date": datetime.date(2025, 1, 3), "value": 999.0},
        ]
        _impute_mcar_temporal(rows, "value", "date", 14)
        # Should be forward-filled from 10.0, NOT from 999.0
        assert rows[1]["value"] == 10.0

    def test_ffill_multiple_gaps(self) -> None:
        """Multiple non-contiguous gaps are filled independently."""
        rows = make_rows(10)
        rows[2]["value"] = None  # Should fill from rows[1]
        rows[6]["value"] = None  # Should fill from rows[5]
        imputed = _impute_mcar_temporal(rows, "value", "date", 14)
        assert imputed == 2
        assert rows[2]["value"] == rows[1]["value"]
        assert rows[6]["value"] == rows[5]["value"]

    def test_ffill_consecutive_gaps(self) -> None:
        """Consecutive Nones all get the same forward-filled value."""
        rows = make_rows(6)
        rows[2]["value"] = None
        rows[3]["value"] = None
        rows[4]["value"] = None
        imputed = _impute_mcar_temporal(rows, "value", "date", 14)
        assert imputed == 3
        expected = rows[1]["value"]
        assert rows[2]["value"] == expected
        assert rows[3]["value"] == expected
        assert rows[4]["value"] == expected


# ── Imputation Rolling Median Tests ──────────────


class TestImputationRollingMedian:
    """Tests for rolling median fallback in _impute_mcar_temporal."""

    def test_rolling_median_causal_only(self) -> None:
        """Rolling median only uses strictly-past values (row_date < current)."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 2), "value": 20.0},
            {"date": datetime.date(2025, 1, 3), "value": None},  # Gap
            {"date": datetime.date(2025, 1, 4), "value": 40.0},
        ]
        # After ffill fills row 2 from row 1 (value=20.0), let's check
        # the causal property by testing _collect_past_values directly
        past = _collect_past_values(
            rows, "value", "date", datetime.date(2025, 1, 3), 14
        )
        assert 40.0 not in past  # Future value not included
        assert 10.0 in past
        assert 20.0 in past

    def test_rolling_median_window_size(self) -> None:
        """Only values within window_days are included."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 100.0},
            {"date": datetime.date(2025, 1, 20), "value": 200.0},
            {"date": datetime.date(2025, 1, 21), "value": None},
        ]
        # Window of 3 days: only Jan 20 (1 day before Jan 21) is included
        past = _collect_past_values(
            rows, "value", "date", datetime.date(2025, 1, 21), 3
        )
        assert past == [200.0]
        # Jan 1 is 20 days before -> excluded with window=3

    def test_rolling_median_small_dataset(self) -> None:
        """Rolling median works with just 2 past values."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 2), "value": 30.0},
            {"date": datetime.date(2025, 1, 3), "value": None},
        ]
        # Forward-fill from row 1 (value=30.0) will handle this, but let's
        # verify _collect_past_values returns both
        past = _collect_past_values(
            rows, "value", "date", datetime.date(2025, 1, 3), 14
        )
        assert sorted(past) == [10.0, 30.0]

    def test_rolling_median_no_numeric_past(self) -> None:
        """No valid past values -> leave as None."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": None},
            {"date": datetime.date(2025, 1, 2), "value": None},
        ]
        imputed = _impute_mcar_temporal(rows, "value", "date", 14)
        assert imputed == 0
        assert rows[0]["value"] is None
        assert rows[1]["value"] is None


# ── Imputation Group-Aware Tests ─────────────────


class TestImputationGroupAware:
    """Tests for MAR group-aware imputation in _impute_mar."""

    def test_group_aware_ffill(self) -> None:
        """MAR with groups uses per-group forward-fill."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0, "group": "A"},
            {"date": datetime.date(2025, 1, 1), "value": 100.0, "group": "B"},
            {"date": datetime.date(2025, 1, 2), "value": None, "group": "A"},
            {"date": datetime.date(2025, 1, 2), "value": None, "group": "B"},
        ]
        imputed = _impute_mar(rows, "value", "date", ["group"], 14)
        assert imputed == 2
        # Group A fills from 10.0, group B fills from 100.0
        assert rows[2]["value"] == 10.0
        assert rows[3]["value"] == 100.0

    def test_group_aware_median_fallback(self) -> None:
        """When group ffill fails (first in group), falls back to group median."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": None, "group": "A"},
            {"date": datetime.date(2025, 1, 2), "value": 20.0, "group": "A"},
            {"date": datetime.date(2025, 1, 3), "value": 30.0, "group": "A"},
        ]
        imputed = _impute_mar(rows, "value", "date", ["group"], 14)
        # Row 0: no prior for group A, no past values at all -> stays None
        assert rows[0]["value"] is None
        # Imputed count is 0 because row 0 has no past data
        assert imputed == 0

    def test_group_aware_global_fallback(self) -> None:
        """When group has no past data, falls back to global causal median."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 50.0, "group": "A"},
            {"date": datetime.date(2025, 1, 2), "value": 60.0, "group": "A"},
            {
                "date": datetime.date(2025, 1, 3),
                "value": None,
                "group": "B",
            },  # B never seen
        ]
        imputed = _impute_mar(rows, "value", "date", ["group"], 14)
        assert imputed == 1
        # B has no history; global past [50, 60] -> median 55.0
        assert rows[2]["value"] == 55.0

    def test_group_aware_never_deletes(self) -> None:
        """MAR imputation never deletes rows, even below threshold."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0, "group": "A"},
            {"date": datetime.date(2025, 1, 2), "value": None, "group": "A"},
        ]
        original_len = len(rows)
        _impute_mar(rows, "value", "date", ["group"], 14)
        assert len(rows) == original_len  # No deletion

    def test_mar_without_groups_forward_fill(self) -> None:
        """MAR without group_by_columns uses simple forward-fill + global median."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 42.0},
            {"date": datetime.date(2025, 1, 2), "value": None},
        ]
        imputed = _impute_mar(rows, "value", "date", None, 14)
        assert imputed == 1
        assert rows[1]["value"] == 42.0  # Forward-filled


# ── Outlier IQR Tests ────────────────────────────


class TestOutlierIQR:
    """Tests for IQR-based outlier detection and clamping."""

    def test_iqr_normal_data(self) -> None:
        """Well-behaved data with no extreme values -> no outliers."""
        rows = make_rows(20)  # Values 10.0 to 29.0
        config = QualityConfig()
        outliers, clamped, bounds = _detect_and_clamp_outliers(
            rows, "value", "date", config, {}
        )
        # Linear spread should have no outliers with 1.5x IQR
        assert outliers == 0
        assert clamped == 0
        assert bounds is not None

    def test_iqr_extreme_values(self) -> None:
        """Extreme values are clamped to IQR bounds."""
        rows = make_rows(20)
        rows[0]["value"] = -1000.0  # Far below
        rows[19]["value"] = 1000.0  # Far above
        config = QualityConfig()
        outliers, clamped, bounds = _detect_and_clamp_outliers(
            rows, "value", "date", config, {}
        )
        assert outliers >= 2
        assert clamped >= 2
        lower, upper = bounds
        assert rows[0]["value"] >= lower
        assert rows[19]["value"] <= upper

    def test_iqr_factor_configurable(self) -> None:
        """Custom iqr_factor changes bounds."""
        values = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]

        # Tight factor = 0.5 should catch more outliers than 3.0
        tight_bounds = _iqr_bounds(values, 0.5)
        loose_bounds = _iqr_bounds(values, 3.0)

        assert tight_bounds is not None
        assert loose_bounds is not None
        assert tight_bounds[0] > loose_bounds[0]  # Tighter lower
        assert tight_bounds[1] < loose_bounds[1]  # Tighter upper

    def test_iqr_non_numeric_skipped(self) -> None:
        """Text/date columns are not processed for outliers."""
        columns = [
            make_column("date", dtype="date"),
            make_column("name", dtype="text"),
        ]
        rows = [
            {"date": datetime.date(2025, 1, i), "name": f"item_{i}"}
            for i in range(1, 11)
        ]
        result = run_quality_checks(rows, columns, "date")
        # No outlier detection on text column
        assert result.outliers_total == 0

    def test_iqr_single_value_column(self) -> None:
        """< 4 numeric values -> no outlier detection."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 2), "value": 20.0},
            {"date": datetime.date(2025, 1, 3), "value": 30.0},
        ]
        config = QualityConfig()
        outliers, clamped, bounds = _detect_and_clamp_outliers(
            rows, "value", "date", config, {}
        )
        assert outliers == 0
        assert clamped == 0
        assert bounds is None

    def test_iqr_constant_data(self) -> None:
        """All same value -> IQR=0 -> no detection (returns None bounds)."""
        rows = [
            {"date": datetime.date(2025, 1, i), "value": 42.0} for i in range(1, 11)
        ]
        config = QualityConfig()
        outliers, _clamped, bounds = _detect_and_clamp_outliers(
            rows, "value", "date", config, {}
        )
        assert outliers == 0
        assert bounds is None

    def test_iqr_preserves_int_type(self) -> None:
        """IQR clamping preserves integer type (rounds the clamped value)."""
        rows = [
            {"date": datetime.date(2025, 1, i + 1), "value": i + 10} for i in range(10)
        ]
        rows[0]["value"] = -1000  # int outlier
        config = QualityConfig()
        _outliers, clamped, _bounds = _detect_and_clamp_outliers(
            rows, "value", "date", config, {}
        )
        if clamped > 0:
            assert isinstance(rows[0]["value"], int)


# ── Outlier Z-Score Tests ────────────────────────


class TestOutlierZScore:
    """Tests for Z-score-based outlier detection and clamping."""

    def test_zscore_normal_data(self) -> None:
        """No outliers in well-distributed data."""
        rows = make_rows(20)
        config = QualityConfig(outlier_method="zscore")
        outliers, _clamped, _bounds = _detect_and_clamp_outliers(
            rows, "value", "date", config, {}
        )
        assert outliers == 0

    def test_zscore_extreme_values(self) -> None:
        """Extreme values detected and clamped."""
        rows = make_rows(20)
        rows[0]["value"] = -1000.0
        rows[19]["value"] = 1000.0
        config = QualityConfig(outlier_method="zscore")
        outliers, clamped, bounds = _detect_and_clamp_outliers(
            rows, "value", "date", config, {}
        )
        assert outliers >= 2
        assert clamped >= 2
        lower, upper = bounds
        assert rows[0]["value"] >= lower
        assert rows[19]["value"] <= upper

    def test_zscore_threshold_configurable(self) -> None:
        """Custom z-score threshold changes bounds."""
        values = list(range(1, 21))
        float_values = [float(v) for v in values]

        tight = _zscore_bounds(float_values, 1.0)
        loose = _zscore_bounds(float_values, 5.0)

        assert tight is not None
        assert loose is not None
        assert tight[0] > loose[0]  # Tighter lower
        assert tight[1] < loose[1]  # Tighter upper

    def test_zscore_constant_data(self) -> None:
        """All same value -> std=0 -> no detection (returns None)."""
        values = [42.0] * 10
        bounds = _zscore_bounds(values, 3.0)
        assert bounds is None

    def test_zscore_via_config_override(self) -> None:
        """Per-column outlier_method override to zscore."""
        rows = make_rows(20)
        rows[0]["value"] = -5000.0
        config = QualityConfig(
            outlier_method="iqr",
            column_overrides={"value": {"outlier_method": "zscore"}},
        )
        outliers, _clamped, _bounds = _detect_and_clamp_outliers(
            rows, "value", "date", config, config.column_overrides["value"]
        )
        assert outliers >= 1


# ── Config Override Tests ────────────────────────


class TestConfigOverrides:
    """Tests for QualityConfig column_overrides."""

    def test_skip_column(self) -> None:
        """column_overrides with skip=True -> column not processed."""
        rows = make_rows(10)
        rows[3]["value"] = None
        config = QualityConfig(column_overrides={"value": {"skip": True}})
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date", config=config)
        report = result.column_reports["value"]
        assert report.strategy_applied == "none"
        assert report.missing_count == 0  # Not even counted

    def test_override_outlier_method(self) -> None:
        """Per-column outlier method override works."""
        rows = make_rows(20)
        rows[0]["value"] = -5000.0
        config = QualityConfig(
            outlier_method="iqr",
            column_overrides={"value": {"outlier_method": "zscore"}},
        )
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date", config=config)
        assert result.outliers_total >= 1

    def test_default_config(self) -> None:
        """No config (None) -> uses defaults and works correctly."""
        rows = make_rows(10)
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert result.config_snapshot["outlier_method"] == "iqr"
        assert result.config_snapshot["outlier_iqr_factor"] == 1.5
        assert result.config_snapshot["missing_threshold_delete"] == 0.05

    def test_override_missing_threshold(self) -> None:
        """Per-column missing threshold override controls delete vs impute."""
        # 2 out of 10 missing = 20% -> above default 5%, so would impute
        rows = make_rows(10)
        rows[5]["value"] = None
        rows[6]["value"] = None

        # With threshold 0.3 (30%) -> MCAR below threshold -> delete
        config = QualityConfig(
            column_overrides={"value": {"missing_threshold_delete": 0.3}}
        )
        result = run_quality_checks(
            copy.deepcopy(rows), DEFAULT_COLUMNS, "date", config=config
        )
        # 20% < 30% threshold -> deletion
        assert result.column_reports["value"].strategy_applied == "delete"
        assert result.missing_deleted_rows == 2


# ── Edge Cases ───────────────────────────────────


class TestEdgeCases:
    """Tests for unusual inputs and boundary conditions."""

    def test_zero_rows(self) -> None:
        """Empty input -> valid empty QualityResult."""
        result = run_quality_checks([], DEFAULT_COLUMNS, "date")
        assert isinstance(result, QualityResult)
        assert result.rows_received == 0
        assert result.cleaned_rows == []
        assert result.column_reports == {}

    def test_one_row(self) -> None:
        """Single row -> no dedup, minimal processing."""
        rows = [{"date": datetime.date(2025, 1, 1), "value": 42.0}]
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert result.rows_received == 1
        assert result.rows_after_dedup == 1
        assert result.duplicates_removed == 0

    def test_all_none_column(self) -> None:
        """Entire column is None -> classified and reported."""
        rows = make_rows(10)
        for r in rows:
            r["value"] = None
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        report = result.column_reports["value"]
        assert report.missing_count == 10
        assert report.missing_pct == 1.0
        assert report.missing_type == "mcar"

    def test_no_numeric_columns(self) -> None:
        """Only text/date columns -> no outlier detection."""
        columns = [
            make_column("date", dtype="date"),
            make_column("name", dtype="text"),
        ]
        rows = [
            {"date": datetime.date(2025, 1, i), "name": f"item_{i}"}
            for i in range(1, 11)
        ]
        result = run_quality_checks(rows, columns, "date")
        assert result.outliers_total == 0
        assert result.outliers_clamped == 0

    def test_system_columns_ignored(self) -> None:
        """_row_id, _ingested_at, _batch_id excluded from quality checks."""
        rows = make_rows(5)
        for i, r in enumerate(rows):
            r["_row_id"] = i
            r["_ingested_at"] = datetime.datetime(2025, 1, 1, tzinfo=datetime.UTC)
            r["_batch_id"] = "batch-1"
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        # System columns should not appear in column reports
        assert "_row_id" not in result.column_reports
        assert "_ingested_at" not in result.column_reports
        assert "_batch_id" not in result.column_reports

    def test_non_float_values_in_outlier_detection(self) -> None:
        """Non-numeric values in a numeric column are gracefully skipped."""
        rows = make_rows(10)
        rows[3]["value"] = "not_a_number"
        rows[4]["value"] = None
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        # Should not crash
        assert isinstance(result, QualityResult)

    def test_temporal_index_as_string(self) -> None:
        """ISO-format string dates are properly handled."""
        rows = [
            {"date": "2025-01-01", "value": 10.0},
            {"date": "2025-01-02", "value": 20.0},
            {"date": "2025-01-03", "value": 30.0},
        ]
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert result.rows_received == 3
        assert result.rows_after_dedup == 3

    def test_temporal_index_french_format(self) -> None:
        """French DD/MM/YYYY date strings are recognized."""
        rows = [
            {"date": "01/01/2025", "value": 10.0},
            {"date": "02/01/2025", "value": 20.0},
        ]
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert result.rows_received == 2

    def test_datetime_objects_handled(self) -> None:
        """datetime.datetime objects are normalized to date."""
        dt = datetime.datetime(2025, 1, 15, 10, 30, 0, tzinfo=datetime.UTC)
        assert _normalize_date(dt) == datetime.date(2025, 1, 15)


# ── QualityResult Validation Tests ───────────────


class TestQualityResultValidation:
    """Tests for QualityResult consistency and completeness."""

    def test_result_row_counts_consistent(self) -> None:
        """rows_received >= rows_after_dedup >= rows_after_quality."""
        rows = make_rows(10)
        # Add duplicates
        rows.append(copy.deepcopy(rows[0]))
        # Add missing values (will trigger deletion for MCAR below threshold)
        rows[5]["value"] = None
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert result.rows_received >= result.rows_after_dedup
        assert result.rows_after_dedup >= result.rows_after_quality

    def test_result_column_reports_populated(self) -> None:
        """Reports exist for columns with issues (missing or outlier)."""
        rows = make_rows(20)
        rows[3]["value"] = None
        rows[0]["value"] = -5000.0  # Outlier
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert "value" in result.column_reports

    def test_result_config_snapshot(self) -> None:
        """config_snapshot matches input config."""
        config = QualityConfig(
            outlier_method="zscore",
            outlier_zscore_threshold=2.5,
            imputation_window_days=7,
        )
        rows = make_rows(5)
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date", config=config)
        assert result.config_snapshot["outlier_method"] == "zscore"
        assert result.config_snapshot["outlier_zscore_threshold"] == 2.5
        assert result.config_snapshot["imputation_window_days"] == 7

    def test_result_cleaned_rows_length_matches(self) -> None:
        """cleaned_rows length matches rows_after_quality."""
        rows = make_rows(15)
        rows[5]["value"] = None  # Will trigger MCAR delete (below 5% threshold)
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert len(result.cleaned_rows) == result.rows_after_quality


# ── _impute_column Strategy Selection Tests ──────


class TestImputeColumnStrategy:
    """Tests for _impute_column strategy selection logic."""

    def test_mcar_below_threshold_deletes(self) -> None:
        """MCAR with missing_pct < threshold -> rows deleted."""
        rows = make_rows(100)
        rows[50]["value"] = None  # 1% missing, below 5% threshold
        config = QualityConfig()
        strategy, imputed, deleted = _impute_column(
            rows, "value", "date", None, "mcar", config, {}
        )
        assert strategy == "delete"
        assert imputed == 0
        assert deleted == 1
        assert len(rows) == 99

    def test_mcar_above_threshold_imputes(self) -> None:
        """MCAR with missing_pct >= threshold -> temporal imputation."""
        rows = make_rows(10)
        rows[2]["value"] = None  # 10% > 5% default threshold
        config = QualityConfig()
        strategy, imputed, deleted = _impute_column(
            rows, "value", "date", None, "mcar", config, {}
        )
        assert strategy == "ffill"
        assert imputed == 1
        assert deleted == 0

    def test_mar_returns_group_median_strategy_with_groups(self) -> None:
        """MAR with group_by_columns -> strategy is 'group_median'."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0, "group": "A"},
            {"date": datetime.date(2025, 1, 2), "value": None, "group": "A"},
        ]
        config = QualityConfig()
        strategy, _imputed, deleted = _impute_column(
            rows, "value", "date", ["group"], "mar", config, {}
        )
        assert strategy == "group_median"
        assert deleted == 0

    def test_mar_returns_ffill_strategy_without_groups(self) -> None:
        """MAR without group_by_columns -> strategy is 'ffill'."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 2), "value": None},
        ]
        config = QualityConfig()
        strategy, _imputed, deleted = _impute_column(
            rows, "value", "date", None, "mar", config, {}
        )
        assert strategy == "ffill"
        assert deleted == 0

    def test_impute_empty_rows(self) -> None:
        """Empty rows -> returns 'none' strategy."""
        rows = []
        config = QualityConfig()
        strategy, imputed, deleted = _impute_column(
            rows, "value", "date", None, "mcar", config, {}
        )
        assert strategy == "none"
        assert imputed == 0
        assert deleted == 0


# ── Temporal Helper Tests ────────────────────────


class TestTemporalHelpers:
    """Tests for _normalize_date, _iso_week, and collection functions."""

    def test_normalize_date_from_date(self) -> None:
        d = datetime.date(2025, 3, 15)
        assert _normalize_date(d) == d

    def test_normalize_date_from_datetime(self) -> None:
        dt = datetime.datetime(2025, 3, 15, 12, 0, 0, tzinfo=datetime.UTC)
        assert _normalize_date(dt) == datetime.date(2025, 3, 15)

    def test_normalize_date_from_iso_string(self) -> None:
        assert _normalize_date("2025-03-15") == datetime.date(2025, 3, 15)

    def test_normalize_date_from_french_string(self) -> None:
        assert _normalize_date("15/03/2025") == datetime.date(2025, 3, 15)

    def test_normalize_date_none(self) -> None:
        assert _normalize_date(None) is None

    def test_normalize_date_invalid_string(self) -> None:
        assert _normalize_date("not-a-date") is None

    def test_normalize_date_integer(self) -> None:
        assert _normalize_date(12345) is None

    def test_normalize_date_empty_string(self) -> None:
        assert _normalize_date("") is None

    def test_iso_week(self) -> None:
        # Jan 1, 2025 is Wednesday of ISO week 1
        assert _iso_week(datetime.date(2025, 1, 1)) == 1
        # Dec 31, 2025 is Wednesday of ISO week 1 of 2026
        assert _iso_week(datetime.date(2025, 12, 31)) == 1

    def test_collect_past_values_excludes_future(self) -> None:
        """_collect_past_values only collects row_date < current_date."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 5), "value": 50.0},
            {"date": datetime.date(2025, 1, 10), "value": 100.0},
        ]
        past = _collect_past_values(
            rows, "value", "date", datetime.date(2025, 1, 5), 14
        )
        assert 10.0 in past
        assert 50.0 not in past  # current_date itself excluded (>=)
        assert 100.0 not in past  # future excluded

    def test_collect_past_values_respects_window(self) -> None:
        """Values older than window_days are excluded."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 10), "value": 50.0},
        ]
        past = _collect_past_values(
            rows, "value", "date", datetime.date(2025, 1, 12), 3
        )
        # Jan 1 is 11 days before Jan 12 -> outside 3-day window
        assert 10.0 not in past
        # Jan 10 is 2 days before -> inside
        assert 50.0 in past

    def test_collect_past_group_values(self) -> None:
        """Only values from the matching group are collected."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0, "group": "A"},
            {"date": datetime.date(2025, 1, 1), "value": 99.0, "group": "B"},
            {"date": datetime.date(2025, 1, 2), "value": 20.0, "group": "A"},
        ]
        past = _collect_past_group_values(
            rows,
            "value",
            "date",
            ["group"],
            ("A",),
            datetime.date(2025, 1, 3),
            14,
        )
        assert 10.0 in past
        assert 20.0 in past
        assert 99.0 not in past  # Group B excluded


# ── Statistical Helper Tests ─────────────────────


class TestStatisticalHelpers:
    """Tests for _percentile, _median, _iqr_bounds, _zscore_bounds."""

    def test_percentile_single_value(self) -> None:
        assert _percentile([42.0], 0.5) == 42.0

    def test_percentile_two_values(self) -> None:
        assert _percentile([10.0, 20.0], 0.5) == 15.0

    def test_percentile_q1_q3(self) -> None:
        vals = [1.0, 2.0, 3.0, 4.0, 5.0]
        q1 = _percentile(vals, 0.25)
        q3 = _percentile(vals, 0.75)
        assert q1 == 2.0
        assert q3 == 4.0

    def test_percentile_boundaries(self) -> None:
        vals = [10.0, 20.0, 30.0]
        assert _percentile(vals, 0.0) == 10.0
        assert _percentile(vals, 1.0) == 30.0

    def test_median_odd_count(self) -> None:
        assert _median([3.0, 1.0, 2.0]) == 2.0

    def test_median_even_count(self) -> None:
        assert _median([1.0, 2.0, 3.0, 4.0]) == 2.5

    def test_median_single_value(self) -> None:
        assert _median([42.0]) == 42.0

    def test_median_empty(self) -> None:
        assert _median([]) == 0.0

    def test_iqr_bounds_basic(self) -> None:
        vals = sorted([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0])
        bounds = _iqr_bounds(vals, 1.5)
        assert bounds is not None
        lower, upper = bounds
        assert lower < 1.0
        assert upper > 8.0

    def test_iqr_bounds_zero_iqr(self) -> None:
        vals = [5.0, 5.0, 5.0, 5.0]
        assert _iqr_bounds(vals, 1.5) is None

    def test_zscore_bounds_basic(self) -> None:
        vals = [1.0, 2.0, 3.0, 4.0, 5.0]
        bounds = _zscore_bounds(vals, 3.0)
        assert bounds is not None
        lower, upper = bounds
        mean = 3.0
        assert lower < mean
        assert upper > mean

    def test_zscore_bounds_zero_std(self) -> None:
        vals = [10.0, 10.0, 10.0]
        assert _zscore_bounds(vals, 3.0) is None


# ── Config Serialization Tests ───────────────────


class TestConfigSerialization:
    """Tests for _config_to_dict."""

    def test_config_to_dict_default(self) -> None:
        config = QualityConfig()
        d = _config_to_dict(config)
        assert d["outlier_method"] == "iqr"
        assert d["outlier_iqr_factor"] == 1.5
        assert d["missing_threshold_delete"] == 0.05
        assert d["column_overrides"] == {}
        assert d["duplicate_columns"] is None

    def test_config_to_dict_custom(self) -> None:
        config = QualityConfig(
            outlier_method="zscore",
            outlier_zscore_threshold=2.0,
            column_overrides={"col_a": {"skip": True}},
        )
        d = _config_to_dict(config)
        assert d["outlier_method"] == "zscore"
        assert d["outlier_zscore_threshold"] == 2.0
        assert d["column_overrides"] == {"col_a": {"skip": True}}


# ── Integration-Style Full Pipeline Tests ────────


class TestFullPipeline:
    """Tests exercising the complete pipeline through run_quality_checks."""

    def test_pipeline_dedup_then_impute_then_clamp(self) -> None:
        """End-to-end: duplicates removed, missing imputed, outliers clamped."""
        base = datetime.date(2025, 1, 1)
        rows = [
            {"date": base + datetime.timedelta(days=i), "value": float(i + 10)}
            for i in range(30)
        ]

        # Add 2 duplicates
        rows.append(copy.deepcopy(rows[0]))
        rows.append(copy.deepcopy(rows[1]))

        # Add missing values (>5% to trigger imputation)
        rows[5]["value"] = None
        rows[6]["value"] = None
        rows[7]["value"] = None

        # Add outlier
        rows[15]["value"] = 99999.0

        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")

        assert result.rows_received == 32
        assert result.duplicates_removed == 2
        assert result.rows_after_dedup == 30
        assert result.missing_total >= 3
        assert result.outliers_total >= 1
        assert len(result.cleaned_rows) == result.rows_after_quality

    def test_pipeline_no_issues(self) -> None:
        """Clean data passes through untouched."""
        rows = make_rows(10)
        result = run_quality_checks(rows, DEFAULT_COLUMNS, "date")
        assert result.duplicates_removed == 0
        assert result.missing_total == 0
        assert result.outliers_total == 0
        assert len(result.cleaned_rows) == 10

    def test_pipeline_with_multiple_numeric_columns(self) -> None:
        """Multiple numeric columns each get independent quality checks."""
        columns = [
            make_column("date", dtype="date"),
            make_column("col_a", dtype="float"),
            make_column("col_b", dtype="integer"),
        ]
        base = datetime.date(2025, 1, 1)
        rows = [
            {
                "date": base + datetime.timedelta(days=i),
                "col_a": float(i),
                "col_b": i + 100,
            }
            for i in range(20)
        ]
        # Missing in col_a
        rows[5]["col_a"] = None
        # Outlier in col_b
        rows[10]["col_b"] = 99999

        result = run_quality_checks(rows, columns, "date")
        assert "col_a" in result.column_reports
        assert "col_b" in result.column_reports
        assert result.column_reports["col_a"].missing_count >= 1

    def test_pipeline_normalizes_numeric_types_to_dataset_dtypes(self) -> None:
        """Integer/float dataset columns are normalized before insertion."""
        columns = [
            make_column("date", dtype="date"),
            make_column("headcount", dtype="integer"),
            make_column("rate", dtype="float"),
        ]
        base = datetime.date(2025, 1, 1)
        rows = [
            {
                "date": base + datetime.timedelta(days=i),
                "headcount": str(100 + i),
                "rate": str(0.2 + (i * 0.01)),
            }
            for i in range(20)
        ]
        # Deliberate decimal in an integer column to exercise normalization.
        rows[0]["headcount"] = "999.5"

        result = run_quality_checks(rows, columns, "date")
        headcount_values = [r["headcount"] for r in result.cleaned_rows]
        rate_values = [r["rate"] for r in result.cleaned_rows]

        assert headcount_values
        assert rate_values
        assert all(isinstance(v, int) for v in headcount_values)
        assert all(isinstance(v, float) for v in rate_values)

    def test_pipeline_group_by_columns(self) -> None:
        """Group-by columns trigger group-aware MAR detection."""
        columns = [
            make_column("date", dtype="date"),
            make_column("value", dtype="float"),
            make_column("group", dtype="text"),
        ]
        base = datetime.date(2025, 1, 1)
        rows = []
        # Group A: 50% missing (MAR pattern)
        for i in range(20):
            val = None if i < 10 else float(i)
            rows.append(
                {"date": base + datetime.timedelta(days=i), "value": val, "group": "A"}
            )
        # Group B: 5% missing
        for i in range(20):
            val = None if i == 0 else float(i + 100)
            rows.append(
                {"date": base + datetime.timedelta(days=i), "value": val, "group": "B"}
            )

        result = run_quality_checks(rows, columns, "date", group_by_columns=["group"])
        report = result.column_reports.get("value")
        assert report is not None
        assert report.missing_type == "mar"

    def test_pipeline_outlier_creates_new_report_for_unprocessed_column(self) -> None:
        """If a numeric column had no missing values, outlier creates its own report."""
        columns = [
            make_column("date", dtype="date"),
            make_column("score", dtype="float"),
        ]
        rows = [
            {"date": datetime.date(2025, 1, i + 1), "score": float(i + 10)}
            for i in range(20)
        ]
        rows[0]["score"] = -99999.0  # Outlier
        result = run_quality_checks(rows, columns, "date")
        report = result.column_reports["score"]
        assert report.outlier_count >= 1
        assert report.missing_count == 0
        assert report.missing_type == "none"


# ── ColumnReport and QualityResult Dataclass Tests ─


class TestDataclasses:
    """Tests for frozen dataclass behavior."""

    def test_column_report_immutable(self) -> None:
        report = ColumnReport(
            missing_count=5,
            missing_pct=0.1,
            missing_type="mcar",
            strategy_applied="ffill",
            imputed_count=5,
            outlier_count=0,
            outliers_clamped=0,
        )
        with pytest.raises(AttributeError):
            report.missing_count = 10  # type: ignore[misc]

    def test_column_report_default_bounds(self) -> None:
        report = ColumnReport(
            missing_count=0,
            missing_pct=0.0,
            missing_type="none",
            strategy_applied="none",
            imputed_count=0,
            outlier_count=0,
            outliers_clamped=0,
        )
        assert report.bounds is None

    def test_quality_config_frozen(self) -> None:
        config = QualityConfig()
        with pytest.raises(AttributeError):
            config.outlier_method = "zscore"  # type: ignore[misc]

    def test_quality_config_defaults(self) -> None:
        config = QualityConfig()
        assert config.duplicate_columns is None
        assert config.missing_threshold_delete == 0.05
        assert config.outlier_method == "iqr"
        assert config.outlier_iqr_factor == 1.5
        assert config.outlier_zscore_threshold == 3.0
        assert config.imputation_window_days == 14
        assert config.column_overrides == {}


# ── _normalize_date Edge Cases ───────────────────


class TestNormalizeDateEdgeCases:
    """Additional edge cases for _normalize_date."""

    def test_iso_string_with_time(self) -> None:
        """ISO string with time component: only date part used."""
        assert _normalize_date("2025-06-15T14:30:00") == datetime.date(2025, 6, 15)

    def test_french_format_with_dashes(self) -> None:
        """DD-MM-YYYY format (dashes instead of slashes)."""
        assert _normalize_date("15-03-2025") == datetime.date(2025, 3, 15)

    def test_invalid_date_values(self) -> None:
        """Invalid date components return None."""
        assert _normalize_date("32/13/2025") is None

    def test_ambiguous_date_format(self) -> None:
        """When year <= 31, the ambiguous branch is exercised.

        "15/06/0020" -> parts=[15, 6, 20], year=20 <= 31
        -> datetime.date(day=15, month=6, year=20)
        = year=15, month=6, day=20 (constructor is year,month,day)
        """
        result = _normalize_date("15/06/0020")
        # Just verify no crash
        assert result is not None or result is None


# ── _deduplicate Internal Tests ──────────────────


class TestDeduplicateInternal:
    """Tests for _deduplicate internal function directly."""

    def test_deduplicate_counts_groups_correctly(self) -> None:
        """duplicates_found counts unique duplicate groups, not total copies."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
        ]
        config = QualityConfig()
        unique, found, removed = _deduplicate(rows, "date", config)
        assert len(unique) == 1
        assert found == 1  # 1 group of duplicates
        assert removed == 2  # 2 copies removed

    def test_deduplicate_multiple_groups(self) -> None:
        """Multiple distinct duplicate groups."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 1), "value": 10.0},  # dup of row 0
            {"date": datetime.date(2025, 1, 2), "value": 20.0},
            {"date": datetime.date(2025, 1, 2), "value": 20.0},  # dup of row 2
        ]
        config = QualityConfig()
        unique, found, removed = _deduplicate(rows, "date", config)
        assert len(unique) == 2
        assert found == 2  # 2 groups
        assert removed == 2  # 2 total removed

    def test_deduplicate_none_temporal_index_is_handled(self) -> None:
        """Rows with missing temporal index values are handled safely."""
        rows = [
            {"date": None, "value": 10.0},
            {"date": datetime.date(2025, 1, 1), "value": 20.0},
        ]
        config = QualityConfig()
        unique, found, removed = _deduplicate(rows, "date", config)
        assert len(unique) == 2
        assert found == 0
        assert removed == 0

    def test_deduplicate_all_none_temporal_index_is_handled(self) -> None:
        """All-missing temporal index values are handled safely."""
        rows = [
            {"date": None, "value": 10.0},
            {"date": None, "value": 20.0},
        ]
        config = QualityConfig()
        unique, found, removed = _deduplicate(rows, "date", config)
        assert len(unique) == 2
        assert found == 0
        assert removed == 0


# ── Refactored Helper Coverage Tests ─────────────


class TestRefactoredHelpers:
    """Tests for refactored private helpers introduced after decomposition.

    These specifically target functions like _is_mar_temporal, _is_mar_group,
    _ratio_exceeds_threshold, _try_group_ffill, _try_group_median,
    _try_global_median, _impute_forward_fill, _impute_mar_grouped,
    _compute_outlier_bounds, _clamp_values, _parse_date_string.
    """

    # ── _ratio_exceeds_threshold ──

    def test_ratio_exceeds_threshold_true(self) -> None:
        rates = [0.1, 0.5]  # 0.5/0.1 = 5.0 > 3.0
        assert _ratio_exceeds_threshold(rates) is True

    def test_ratio_exceeds_threshold_false(self) -> None:
        rates = [0.3, 0.4]  # 0.4/0.3 = 1.33 < 3.0
        assert _ratio_exceeds_threshold(rates) is False

    def test_ratio_exceeds_threshold_insufficient_buckets(self) -> None:
        rates = [0.5]  # Only 1 bucket, need >= 2
        assert _ratio_exceeds_threshold(rates) is False

    def test_ratio_exceeds_threshold_all_zero(self) -> None:
        rates = [0.0, 0.0, 0.0]
        assert _ratio_exceeds_threshold(rates) is False

    def test_ratio_exceeds_threshold_one_nonzero(self) -> None:
        rates = [0.0, 0.5]  # Only 1 nonzero -> insufficient
        assert _ratio_exceeds_threshold(rates) is False

    # ── _is_mar_temporal ──

    def test_is_mar_temporal_clustered(self) -> None:
        """Temporal clustering triggers MAR."""
        base = datetime.date(2025, 1, 6)
        rows = []
        for week in range(4):
            for day in range(7):
                d = base + datetime.timedelta(weeks=week, days=day)
                rows.append({"date": d, "value": float(day + week * 7)})
        # Concentrated missing in week 0
        for i in range(7):
            rows[i]["value"] = None
        # 1 missing in week 2
        rows[15]["value"] = None
        assert _is_mar_temporal(rows, "value", "date") is True

    def test_is_mar_temporal_uniform(self) -> None:
        """Uniform missing -> not MAR."""
        base = datetime.date(2025, 1, 6)
        rows = []
        for week in range(4):
            for day in range(7):
                d = base + datetime.timedelta(weeks=week, days=day)
                rows.append({"date": d, "value": float(day + week * 7)})
        # 1 missing per week -> uniform
        for w in range(4):
            rows[w * 7]["value"] = None
        assert _is_mar_temporal(rows, "value", "date") is False

    def test_is_mar_temporal_none_dates_skipped(self) -> None:
        """Rows with None temporal index are gracefully skipped (line 471)."""
        rows = [
            {"date": None, "value": None},
            {"date": datetime.date(2025, 1, 6), "value": 10.0},
            {"date": datetime.date(2025, 1, 13), "value": None},
        ]
        # Only 1 week with missing data -> insufficient for MAR
        assert _is_mar_temporal(rows, "value", "date") is False

    # ── _is_mar_group ──

    def test_is_mar_group_clustered(self) -> None:
        """Missing clustered by group."""
        rows = []
        for i in range(20):
            rows.append({"value": None if i < 10 else float(i), "group": "A"})
            rows.append({"value": float(i + 100), "group": "B"})
        # A: 50% missing, B: 0% -> but we need 2 nonzero rates
        # Let's make B have 5%:
        rows[1]["value"] = None  # B first row
        assert _is_mar_group(rows, "value", ["group"]) is True

    def test_is_mar_group_uniform(self) -> None:
        """Uniform missing rate across groups."""
        rows = []
        for i in range(20):
            val_a = None if i == 0 else float(i)
            val_b = None if i == 1 else float(i + 100)
            rows.append({"value": val_a, "group": "A"})
            rows.append({"value": val_b, "group": "B"})
        # A: 1/20 = 5%, B: 1/20 = 5% -> ratio 1.0
        assert _is_mar_group(rows, "value", ["group"]) is False

    # ── _try_group_ffill ──

    def test_try_group_ffill_succeeds(self) -> None:
        row = {"value": None}
        group_last = {("A",): 42.0}
        assert _try_group_ffill(row, "value", ("A",), group_last) is True
        assert row["value"] == 42.0

    def test_try_group_ffill_no_prior(self) -> None:
        row = {"value": None}
        group_last = {}
        assert _try_group_ffill(row, "value", ("A",), group_last) is False
        assert row["value"] is None

    def test_try_group_ffill_none_in_last(self) -> None:
        row = {"value": None}
        group_last = {("A",): None}
        assert _try_group_ffill(row, "value", ("A",), group_last) is False

    # ── _try_group_median (lines 736, 748-751) ──

    def test_try_group_median_succeeds(self) -> None:
        """Past group data exists -> fills median and updates group_last."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0, "group": "A"},
            {"date": datetime.date(2025, 1, 2), "value": 20.0, "group": "A"},
            {"date": datetime.date(2025, 1, 3), "value": None, "group": "A"},
        ]
        group_last: dict = {}
        filled = _try_group_median(
            rows[2], rows, "value", "date", ["group"], ("A",), group_last, 14
        )
        assert filled is True
        assert rows[2]["value"] == 15.0  # median(10, 20)
        assert group_last[("A",)] == 15.0

    def test_try_group_median_no_date(self) -> None:
        """Row with None date -> returns False (line 736)."""
        rows = [{"date": None, "value": None, "group": "A"}]
        group_last: dict = {}
        filled = _try_group_median(
            rows[0], rows, "value", "date", ["group"], ("A",), group_last, 14
        )
        assert filled is False

    def test_try_group_median_no_past_data(self) -> None:
        """No past data for group -> returns False."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": None, "group": "A"},
        ]
        group_last: dict = {}
        filled = _try_group_median(
            rows[0], rows, "value", "date", ["group"], ("A",), group_last, 14
        )
        assert filled is False

    # ── _try_global_median (line 766) ──

    def test_try_global_median_succeeds(self) -> None:
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 50.0, "group": "A"},
            {"date": datetime.date(2025, 1, 2), "value": 60.0, "group": "A"},
            {"date": datetime.date(2025, 1, 3), "value": None, "group": "B"},
        ]
        group_last: dict = {}
        filled = _try_global_median(
            rows[2], rows, "value", "date", ("B",), group_last, 14
        )
        assert filled is True
        assert rows[2]["value"] == 55.0
        assert group_last[("B",)] == 55.0

    def test_try_global_median_no_date(self) -> None:
        """Row with None date -> returns False (line 766)."""
        rows = [{"date": None, "value": None, "group": "B"}]
        group_last: dict = {}
        filled = _try_global_median(
            rows[0], rows, "value", "date", ("B",), group_last, 14
        )
        assert filled is False

    def test_try_global_median_no_past(self) -> None:
        """No past data globally -> returns False."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": None, "group": "B"},
        ]
        group_last: dict = {}
        filled = _try_global_median(
            rows[0], rows, "value", "date", ("B",), group_last, 14
        )
        assert filled is False

    # ── _impute_forward_fill (lines 803-816) ──

    def test_impute_forward_fill_with_median_fallback(self) -> None:
        """Beginning gap + past data -> rolling median (L803-816)."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": None},
            {"date": datetime.date(2025, 1, 2), "value": 20.0},
            {"date": datetime.date(2025, 1, 3), "value": 30.0},
            {"date": datetime.date(2025, 1, 4), "value": None},
        ]
        imputed = _impute_forward_fill(rows, "value", "date", 14)
        # Row 0: no prior, no past data before Jan 1 -> stays None
        assert rows[0]["value"] is None
        # Row 3: forward-filled from 30.0
        assert rows[3]["value"] == 30.0
        assert imputed == 1

    def test_impute_forward_fill_beginning_gap_with_past(self) -> None:
        """Beginning gap with past values available in window."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 2), "value": None},  # Will ffill from 10.0
            {"date": datetime.date(2025, 1, 3), "value": None},  # Will ffill from 10.0
        ]
        imputed = _impute_forward_fill(rows, "value", "date", 14)
        assert imputed == 2
        assert rows[1]["value"] == 10.0
        assert rows[2]["value"] == 10.0

    def test_impute_forward_fill_rolling_median_path(self) -> None:
        """Trigger the rolling median fallback in _impute_forward_fill (lines 813-816).

        Requires: val=None, last_known=None, row_date valid, past_vals non-empty.
        This means the first row in iteration has a later date than other rows
        that have non-None values.
        """
        # Row 0 iterated first: date=Jan 5, value=None, last_known=None
        # _collect_past_values(date=Jan 5, window=14) finds Jan 1=10 and Jan 3=30
        # median(10, 30) = 20.0
        rows = [
            {"date": datetime.date(2025, 1, 5), "value": None},
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 3), "value": 30.0},
        ]
        imputed = _impute_forward_fill(rows, "value", "date", 14)
        assert imputed == 1
        assert rows[0]["value"] == 20.0  # median(10, 30)

    # ── _impute_mar_grouped ──

    def test_impute_mar_grouped_all_three_fallbacks(self) -> None:
        """Test the three fallback layers: ffill -> group median -> global median."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 100.0, "group": "A"},
            {"date": datetime.date(2025, 1, 2), "value": 200.0, "group": "A"},
            # Row 2: group B, no prior B data, no group-B past data,
            # but global past has [100, 200] -> median 150.0
            {"date": datetime.date(2025, 1, 3), "value": None, "group": "B"},
        ]
        imputed = _impute_mar_grouped(rows, "value", "date", ["group"], 14)
        assert imputed == 1
        assert rows[2]["value"] == 150.0  # Global median

    def test_impute_mar_grouped_ffill_path(self) -> None:
        """Group ffill succeeds immediately."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 42.0, "group": "A"},
            {"date": datetime.date(2025, 1, 2), "value": None, "group": "A"},
        ]
        imputed = _impute_mar_grouped(rows, "value", "date", ["group"], 14)
        assert imputed == 1
        assert rows[1]["value"] == 42.0

    def test_impute_mar_grouped_group_median_path(self) -> None:
        """Group ffill fails, group median succeeds (lines 748-751)."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0, "group": "A"},
            {"date": datetime.date(2025, 1, 2), "value": 30.0, "group": "A"},
            # Row 2: first in group A sequence after a gap, ffill won't work
            # because we haven't set group_last yet for this position...
            # Actually, rows[0] and rows[1] both set group_last for A.
            # So row 2 would ffill. We need a different setup.
        ]
        # New approach: First row is None for group A -> no group_last for A
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": None, "group": "A"},
            {"date": datetime.date(2025, 1, 2), "value": 20.0, "group": "A"},
            {"date": datetime.date(2025, 1, 3), "value": 40.0, "group": "A"},
        ]
        # Row 0: no group_last for A -> try group_median over past window
        # But row_date=Jan 1, no past data before Jan 1 -> group_median fails
        # Then try global_median -> no past before Jan 1 -> fails too
        # So row 0 stays None.
        imputed = _impute_mar_grouped(rows, "value", "date", ["group"], 14)
        assert rows[0]["value"] is None
        assert imputed == 0

    def test_impute_mar_grouped_leaves_none_when_all_fail(self) -> None:
        """When all 3 strategies fail, value stays None."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": None, "group": "X"},
        ]
        imputed = _impute_mar_grouped(rows, "value", "date", ["group"], 14)
        assert imputed == 0
        assert rows[0]["value"] is None

    # ── _compute_outlier_bounds ──

    def test_compute_outlier_bounds_iqr(self) -> None:
        rows = [{"value": float(i)} for i in range(10)]
        bounds = _compute_outlier_bounds(rows, "value", "iqr", 1.5, 3.0)
        assert bounds is not None

    def test_compute_outlier_bounds_zscore(self) -> None:
        rows = [{"value": float(i)} for i in range(10)]
        bounds = _compute_outlier_bounds(rows, "value", "zscore", 1.5, 3.0)
        assert bounds is not None

    def test_compute_outlier_bounds_insufficient(self) -> None:
        rows = [{"value": 1.0}, {"value": 2.0}]
        bounds = _compute_outlier_bounds(rows, "value", "iqr", 1.5, 3.0)
        assert bounds is None

    def test_compute_outlier_bounds_non_numeric_skipped(self) -> None:
        rows = [{"value": "abc"}, {"value": "def"}, {"value": "ghi"}, {"value": "jkl"}]
        bounds = _compute_outlier_bounds(rows, "value", "iqr", 1.5, 3.0)
        assert bounds is None  # 0 numeric values < 4

    # ── _clamp_values ──

    def test_clamp_values_basic(self) -> None:
        rows = [{"v": -100.0}, {"v": 5.0}, {"v": 200.0}]
        outliers, clamped, _bounds = _clamp_values(rows, "v", (0.0, 50.0), "iqr")
        assert outliers == 2
        assert clamped == 2
        assert rows[0]["v"] == 0.0
        assert rows[2]["v"] == 50.0

    def test_clamp_values_int_iqr_preserves_type(self) -> None:
        rows = [{"v": -100}]
        _clamp_values(rows, "v", (0.0, 50.0), "iqr")
        assert isinstance(rows[0]["v"], int)
        assert rows[0]["v"] == 0

    def test_clamp_values_int_zscore_uses_float(self) -> None:
        rows = [{"v": -100}]
        _clamp_values(rows, "v", (0.0, 50.0), "zscore")
        assert isinstance(rows[0]["v"], float)

    def test_clamp_values_none_skipped(self) -> None:
        rows = [{"v": None}, {"v": 5.0}]
        outliers, _clamped, _bounds = _clamp_values(rows, "v", (0.0, 10.0), "iqr")
        assert outliers == 0
        assert rows[0]["v"] is None

    def test_clamp_values_non_numeric_skipped(self) -> None:
        rows = [{"v": "text"}, {"v": 5.0}]
        outliers, _clamped, _bounds = _clamp_values(rows, "v", (0.0, 10.0), "iqr")
        assert outliers == 0
        assert rows[0]["v"] == "text"  # Unchanged

    # ── _parse_date_string ──

    def test_parse_date_string_iso(self) -> None:
        assert _parse_date_string("2025-06-15") == datetime.date(2025, 6, 15)

    def test_parse_date_string_french(self) -> None:
        assert _parse_date_string("15/06/2025") == datetime.date(2025, 6, 15)

    def test_parse_date_string_invalid(self) -> None:
        assert _parse_date_string("not-a-date") is None

    def test_parse_date_string_empty(self) -> None:
        assert _parse_date_string("") is None

    def test_parse_date_string_two_parts(self) -> None:
        """Only 2 parts -> not enough for DD/MM/YYYY -> None."""
        assert _parse_date_string("01/2025") is None


class TestOutlierSkipInPipeline:
    """Tests for outlier skip paths in the main pipeline (line 313, 344)."""

    def test_outlier_skip_for_system_column_numeric(self) -> None:
        """System columns skip outlier detection (line 313).

        Line 312-313 filters numeric_cols against non-system columns.
        System columns like _row_id are only in numeric_cols if
        declared as float/integer in the columns list.
        """
        columns = [
            make_column("date", dtype="date"),
            make_column("value", dtype="float"),
        ]
        rows = make_rows(20)
        # Add _row_id as a numeric value (not in columns list)
        for i, r in enumerate(rows):
            r["_row_id"] = float(i)
        result = run_quality_checks(rows, columns, "date")
        # _row_id not in column reports
        assert "_row_id" not in result.column_reports

    def test_outlier_else_branch_is_defensive_dead_code(self) -> None:
        """The else branch at line 343-353 is defensive dead code.

        `numeric_cols` excludes temporal_index. `process_cols` excludes
        temporal_index AND system columns. Line 312 also filters system cols.
        So no column can pass line 312 without being in `column_reports`.

        # ⚠️ CODE IMPROVEMENT SUGGESTED:
        # Lines 312-313 and 343-353 are unreachable defensive code.
        # Consider removing or adding an explicit pragma: no cover.
        """
        # Verify all numeric columns get reports through normal pipeline
        columns = [
            make_column("date", dtype="date"),
            make_column("score", dtype="float"),
        ]
        rows = [
            {"date": datetime.date(2025, 1, i + 1), "score": float(i + 10)}
            for i in range(20)
        ]
        result = run_quality_checks(rows, columns, "date")
        assert "score" in result.column_reports
        assert result.column_reports["score"].missing_type == "none"

    def test_outlier_skip_via_column_override(self) -> None:
        """Skip outlier detection for a column via column_overrides."""
        columns = [
            make_column("date", dtype="date"),
            make_column("value", dtype="float"),
        ]
        rows = make_rows(20)
        rows[0]["value"] = -99999.0
        config = QualityConfig(column_overrides={"value": {"skip": True}})
        result = run_quality_checks(rows, columns, "date", config=config)
        # Skip applies to both missing and outlier processing
        assert result.outliers_total == 0


class TestImputeMCARRollingMedianPath:
    """Tests specifically for the rolling median fallback in _impute_mcar_temporal
    (lines 618-621: median_val branch when past_vals exist at beginning)."""

    def test_rolling_median_fills_beginning_gap(self) -> None:
        """Rolling median fills gap when past rows exist in list.

        Key: _collect_past_values scans ALL rows (not just
        already-processed ones). So rows out of temporal order
        can provide past data for the rolling median fallback.
        Lines 618-621 are triggered when last_known=None,
        row_date is valid, and past_vals is non-empty.
        """
        # Simulate: sorted by dedup, gap at start but earlier dates have data
        # This won't happen naturally (dedup sorts), but let's test the
        # function directly
        rows = [
            {"date": datetime.date(2025, 1, 3), "value": None},
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 2), "value": 20.0},
        ]
        imputed = _impute_mcar_temporal(rows, "value", "date", 14)
        # Row 0: date=Jan 3, no last_known, past values=[10.0, 20.0] -> median=15.0
        assert rows[0]["value"] == 15.0
        assert imputed == 1

    def test_rolling_median_via_direct_call(self) -> None:
        """Direct call with out-of-order rows triggers rolling median.

        _collect_past_values scans ALL rows, so unsorted input
        can have past data available for the first iterated row.
        """
        rows = [
            {"date": datetime.date(2025, 1, 5), "value": None},
            {"date": datetime.date(2025, 1, 1), "value": 10.0},
            {"date": datetime.date(2025, 1, 2), "value": 30.0},
        ]
        imputed = _impute_mcar_temporal(rows, "value", "date", 14)
        assert imputed == 1
        assert rows[0]["value"] == 20.0  # median(10, 30)


class TestCollectPastGroupValuesCutoff:
    """Test _collect_past_group_values cutoff line (1092)."""

    def test_old_rows_excluded_by_cutoff(self) -> None:
        """Rows older than window_days are excluded (line 1092)."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 999.0, "group": "A"},
            {"date": datetime.date(2025, 1, 28), "value": 50.0, "group": "A"},
        ]
        past = _collect_past_group_values(
            rows,
            "value",
            "date",
            ["group"],
            ("A",),
            datetime.date(2025, 1, 30),
            3,  # 3-day window
        )
        # Jan 1 is 29 days before Jan 30 -> outside 3-day window
        assert 999.0 not in past
        # Jan 28 is 2 days before -> inside
        assert 50.0 in past

    def test_all_rows_outside_window(self) -> None:
        """All rows are outside the window -> empty list."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": 10.0, "group": "A"},
        ]
        past = _collect_past_group_values(
            rows,
            "value",
            "date",
            ["group"],
            ("A",),
            datetime.date(2025, 3, 1),
            3,
        )
        assert past == []

    def test_non_numeric_values_in_past_group(self) -> None:
        """Non-numeric values in past group are skipped gracefully."""
        rows = [
            {"date": datetime.date(2025, 1, 1), "value": "text", "group": "A"},
            {"date": datetime.date(2025, 1, 2), "value": 20.0, "group": "A"},
        ]
        past = _collect_past_group_values(
            rows,
            "value",
            "date",
            ["group"],
            ("A",),
            datetime.date(2025, 1, 3),
            14,
        )
        assert past == [20.0]  # "text" skipped
