"""Unit tests for medallion pipeline script."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from scripts.medallion_pipeline import (
    BronzeAsset,
    SourceFile,
    apply_silver_quality,
    build_silver_rows,
    parse_date_any,
    split_gold_features_and_quality_metadata,
    stage_bronze,
    to_float,
)

if TYPE_CHECKING:
    from pathlib import Path


def _write_csv(path: Path, header: str, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join([header, *lines]) + "\n", encoding="utf-8")


def test_parse_date_any_supports_iso_and_french_formats() -> None:
    assert parse_date_any("2024-01-15") == date(2024, 1, 15)
    assert parse_date_any("15/01/2024") == date(2024, 1, 15)
    assert parse_date_any("15-01-2024") == date(2024, 1, 15)
    assert parse_date_any("bad-date") is None


def test_to_float_handles_french_decimal_and_missing_tokens() -> None:
    assert to_float("1 234,56") == 1234.56
    assert to_float("1,234.56") == 1234.56
    assert to_float("-") is None
    assert to_float("NA") is None
    assert to_float(42) == 42.0


def test_build_silver_rows_uses_previous_month_to_avoid_leakage(
    tmp_path: Path,
) -> None:
    daily_path = (
        tmp_path
        / "bronze"
        / "client=acme-logistics"
        / "dataset=operations_daily"
        / "ingested_at=20260101T000000Z"
        / "part-000.csv"
    )
    monthly_path = (
        tmp_path
        / "bronze"
        / "client=acme-logistics"
        / "dataset=hr_monthly"
        / "ingested_at=20260101T000000Z"
        / "part-000.csv"
    )

    _write_csv(
        daily_path,
        "date,site_code,site_name,orders_received",
        [
            "2024-02-01,LYO,Lyon Hub,1000",
            "2024-02-02,LYO,Lyon Hub,1100",
        ],
    )
    _write_csv(
        monthly_path,
        "month,site_code,site_name,headcount_fte_avg",
        [
            "2024-01-01,LYO,Lyon Hub,100",
            "2024-02-01,LYO,Lyon Hub,200",
        ],
    )

    assets = [
        BronzeAsset(
            client_slug="acme-logistics",
            dataset="operations_daily",
            domain="operations",
            path=daily_path,
            ingested_at="20260101T000000Z",
        ),
        BronzeAsset(
            client_slug="acme-logistics",
            dataset="hr_monthly",
            domain="hr",
            path=monthly_path,
            ingested_at="20260101T000000Z",
        ),
    ]

    aliases = {
        "date": ["date"],
        "month": ["month"],
        "site_code": ["site_code"],
        "site_name": ["site_name"],
    }
    rows = build_silver_rows(assets, aliases)

    feb_1 = next(
        row
        for row in rows
        if row["client_slug"] == "acme-logistics"
        and row["site_code"] == "LYO"
        and row["date"] == "2024-02-01"
    )
    assert feb_1["operations_daily__orders_received"] == 1000
    # Must use previous completed month (Jan), not current month (Feb=200).
    assert feb_1["hr_monthly__headcount_fte_avg"] == 100


def test_stage_bronze_quarantines_rows_older_than_watermark(tmp_path: Path) -> None:
    source_path = (
        tmp_path / "data" / "acme-logistics" / "operations" / "operations_daily.csv"
    )
    _write_csv(
        source_path,
        "date,site_code,site_name,orders_received",
        ["2024-01-01,LYO,Lyon Hub,1000"],
    )

    changed = [
        SourceFile(
            client_slug="acme-logistics",
            domain="operations",
            dataset="operations_daily",
            path=source_path,
        )
    ]

    output_root = tmp_path / "data-ready"
    state = {
        "version": 1,
        "files": {},
        "watermarks": {"acme-logistics::operations_daily": "2024-02-01"},
    }
    aliases = {
        "date": ["date"],
        "month": ["month"],
        "site_code": ["site_code"],
        "site_name": ["site_name"],
    }

    manifest = stage_bronze(
        changed,
        output_root,
        state,
        aliases,
        allow_reprocess=False,
    )

    assert manifest == []
    quarantined = list(
        (output_root / "quarantine").glob(
            "client=acme-logistics/dataset=operations_daily/detected_at=*/operations_daily.csv"
        )
    )
    assert len(quarantined) == 1


def test_apply_silver_quality_keeps_unresolved_when_missing_rate_too_high() -> None:
    rows: list[dict[str, object]] = []
    for idx in range(12):
        value: object = None
        if idx in {0, 5, 11}:
            value = float(100 + idx)
        rows.append(
            {
                "client_slug": "acme-logistics",
                "site_code": "LYO",
                "date": f"2024-01-{idx + 1:02d}",
                "operations_daily__orders_received": value,
            }
        )

    cleaned, summary = apply_silver_quality(rows)
    col_summary = summary["columns"]["operations_daily__orders_received"]

    assert col_summary["missing_rate"] > 0.30
    assert col_summary["unresolved_missing_count"] > 0

    unresolved_after = sum(
        1 for row in cleaned if row["operations_daily__orders_received"] is None
    )
    assert unresolved_after > 0


def test_split_gold_features_and_quality_metadata_removes_sidecar_columns() -> None:
    rows = [
        {
            "client_slug": "acme-logistics",
            "site_code": "LYO",
            "site_name": "Lyon Hub",
            "date": "2024-01-01",
            "operations_daily__orders_received": 1200,
            "operations_daily__orders_received__imputed": True,
            "operations_daily__orders_received__imputation_method": "causal_ridge",
            "operations_daily__orders_received__outlier_clamped": False,
        }
    ]

    clean_rows, removed = split_gold_features_and_quality_metadata(rows)
    assert len(clean_rows) == 1
    assert clean_rows[0]["operations_daily__orders_received"] == 1200
    assert "operations_daily__orders_received__imputed" not in clean_rows[0]
    assert "operations_daily__orders_received__imputation_method" not in clean_rows[0]
    assert "operations_daily__orders_received__outlier_clamped" not in clean_rows[0]
    assert removed == [
        "operations_daily__orders_received__imputation_method",
        "operations_daily__orders_received__imputed",
        "operations_daily__orders_received__outlier_clamped",
    ]
