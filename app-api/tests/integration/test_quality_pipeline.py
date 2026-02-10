"""Integration tests for the data quality pipeline.

Tests the full flow: parse -> map -> quality without database.
Verifies that the three services compose correctly and that quality
results feed downstream processing.
"""

import csv
import io
from types import SimpleNamespace

from app.services.data_quality import QualityResult, run_quality_checks
from app.services.file_parser import parse_file

# ── Helpers ──────────────────────────────────────


def make_column(
    name: str, dtype: str = "float", role: str = "feature", nullable: bool = True
):
    return SimpleNamespace(
        name=name,
        dtype=SimpleNamespace(value=dtype),
        role=SimpleNamespace(value=role),
        nullable=nullable,
    )


def make_csv_bytes(headers: list[str], rows: list[list[str]]) -> bytes:
    """Build a CSV file (semicolon delimiter, UTF-8-BOM) as bytes."""
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    return ("\ufeff" + buf.getvalue()).encode("utf-8-sig")


# ── Integration Tests ────────────────────────────


class TestQualityPipelineIntegration:
    """End-to-end integration tests: parse -> quality -> verify."""

    def test_csv_with_duplicates_removed(self) -> None:
        """CSV with duplicate rows -> quality removes them."""
        content = make_csv_bytes(
            ["date", "value"],
            [
                ["01/01/2025", "10,5"],
                ["02/01/2025", "20,0"],
                ["01/01/2025", "10,5"],  # Duplicate
                ["03/01/2025", "30,0"],
                ["02/01/2025", "20,0"],  # Duplicate
            ],
        )
        parse_result = parse_file(content, filename="test.csv")
        assert parse_result.row_count > 0

        columns = [
            make_column("date", dtype="date", role="temporal_index"),
            make_column("value", dtype="float"),
        ]
        result = run_quality_checks(parse_result.rows, columns, "date")

        assert result.rows_received == 5
        assert result.duplicates_removed == 2
        assert result.rows_after_dedup == 3
        assert len(result.cleaned_rows) == 3

    def test_csv_with_missing_values_imputed(self) -> None:
        """CSV with >5% missing values -> MCAR above threshold -> imputed."""
        rows_data = []
        for i in range(20):
            date = f"{i + 1:02d}/01/2025"
            val = "" if i in (5, 10, 15) else f"{(i + 1) * 10},0"
            rows_data.append([date, val])

        content = make_csv_bytes(["date", "valeur"], rows_data)
        parse_result = parse_file(content, filename="test.csv")
        assert parse_result.row_count > 0

        columns = [
            make_column("date", dtype="date", role="temporal_index"),
            make_column("valeur", dtype="float"),
        ]
        # 3 out of 20 = 15% missing -> above 5% threshold -> imputation
        result = run_quality_checks(parse_result.rows, columns, "date")

        assert result.missing_total >= 3
        assert result.missing_imputed >= 1
        assert result.missing_deleted_rows == 0
        # All rows preserved (imputed, not deleted)
        assert result.rows_after_quality == 20
        report = result.column_reports.get("valeur")
        assert report is not None
        assert report.missing_type == "mcar"
        assert report.strategy_applied in ("ffill", "rolling_median")

    def test_csv_with_outliers_clamped(self) -> None:
        """CSV with extreme outlier values -> detected and clamped."""
        rows_data = []
        for i in range(20):
            date = f"{i + 1:02d}/01/2025"
            val = f"{(i + 10)},0"
            rows_data.append([date, val])

        # Inject extreme outliers
        rows_data[0] = ["01/01/2025", "-99999,0"]
        rows_data[19] = ["20/01/2025", "99999,0"]

        content = make_csv_bytes(["date", "mesure"], rows_data)
        parse_result = parse_file(content, filename="test.csv")
        assert parse_result.row_count > 0

        columns = [
            make_column("date", dtype="date", role="temporal_index"),
            make_column("mesure", dtype="float"),
        ]
        result = run_quality_checks(parse_result.rows, columns, "date")

        assert result.outliers_total >= 2
        assert result.outliers_clamped >= 2
        report = result.column_reports["mesure"]
        assert report.bounds is not None
        lower, upper = report.bounds
        # Verify clamped values are within bounds
        for row in result.cleaned_rows:
            val = row.get("mesure")
            if val is not None:
                assert lower <= float(val) <= upper

    def test_quality_result_feeds_downstream(self) -> None:
        """QualityResult cleaned_rows can be consumed by downstream processing."""
        content = make_csv_bytes(
            ["date", "temperature"],
            [
                ["01/01/2025", "15,0"],
                ["02/01/2025", "16,5"],
                ["03/01/2025", "14,0"],
                ["04/01/2025", "17,0"],
                ["05/01/2025", "15,5"],
            ],
        )
        parse_result = parse_file(content, filename="meteo.csv")
        columns = [
            make_column("date", dtype="date", role="temporal_index"),
            make_column("temperature", dtype="float"),
        ]
        result = run_quality_checks(parse_result.rows, columns, "date")

        # Verify the result is a complete, usable QualityResult
        assert isinstance(result, QualityResult)
        assert len(result.cleaned_rows) == result.rows_after_quality
        assert isinstance(result.config_snapshot, dict)
        assert result.config_snapshot["outlier_method"] == "iqr"

        # cleaned_rows should be valid dicts with expected keys
        for row in result.cleaned_rows:
            assert "date" in row
            assert "temperature" in row
            assert row["temperature"] is not None
