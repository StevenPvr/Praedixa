from pathlib import Path

import pytest

from scripts.medallion_pipeline_base import BronzeAsset
from scripts.medallion_pipeline_quality import (
    apply_silver_quality,
    attempt_causal_ridge,
    build_silver_rows,
    classify_missing_mechanism,
    hierarchical_median_impute,
)


def test_build_silver_rows_densifies_daily_assets_and_keeps_metrics(
    tmp_path: Path,
) -> None:
    csv_path = tmp_path / "workforce_daily.csv"
    csv_path.write_text(
        "date,site_code,site_name,temperature_c\n"
        "2024-03-01,PARIS-1,Paris,12\n"
        "2024-03-03,PARIS-1,Paris,14\n",
        encoding="utf-8",
    )

    rows = build_silver_rows(
        [
            BronzeAsset(
                client_slug="acme",
                domain="operations",
                dataset="workforce_daily",
                path=csv_path,
                ingested_at="2024-03-04T00:00:00Z",
            )
        ],
        {
            "date": ["date"],
            "site_code": ["site_code"],
            "site_name": ["site_name"],
        },
    )

    assert [row["date"] for row in rows] == [
        "2024-03-01",
        "2024-03-02",
        "2024-03-03",
    ]
    assert [row["site_name"] for row in rows] == ["Paris", "Paris", "Paris"]
    assert rows[0]["workforce_daily__temperature_c"] == 12
    assert rows[1].get("workforce_daily__temperature_c") is None
    assert rows[2]["workforce_daily__temperature_c"] == 14


def test_build_silver_rows_rejects_legacy_dataset_names(tmp_path: Path) -> None:
    legacy_path = tmp_path / "legacy.csv"

    with pytest.raises(RuntimeError, match="canonical dataset names"):
        build_silver_rows(
            [
                BronzeAsset(
                    client_slug="acme",
                    domain="operations",
                    dataset="mock_workforce_daily",
                    path=legacy_path,
                    ingested_at="2024-03-04T00:00:00Z",
                )
            ],
            {"date": ["date"], "site_code": ["site_code"]},
        )


def test_classify_missing_mechanism_distinguishes_none_and_mar() -> None:
    none_rows = [
        {"date": "2024-03-01", "site_code": "A", "metric": 1},
        {"date": "2024-03-02", "site_code": "B", "metric": 2},
    ]
    assert classify_missing_mechanism(none_rows, "metric") == "none"

    mar_rows: list[dict[str, object]] = []
    for idx in range(10):
        mar_rows.append(
            {
                "date": f"2024-03-{idx + 1:02d}",
                "site_code": "A",
                "metric": None if idx == 0 else 1,
            }
        )
        mar_rows.append(
            {
                "date": f"2024-03-{idx + 1:02d}",
                "site_code": "B",
                "metric": None if idx < 5 else 1,
            }
        )

    assert classify_missing_mechanism(mar_rows, "metric") == "mar"


def test_attempt_causal_ridge_fits_a_simple_linear_relation() -> None:
    rows: list[dict[str, object]] = []
    for idx in range(50):
        x = float(idx)
        z = float(idx % 7)
        rows.append(
            {
                "date": f"2024-03-{(idx % 28) + 1:02d}",
                "client_slug": "acme",
                "site_code": "PARIS-1",
                "feature_x": x,
                "feature_y": z,
                "target": 2.0 * x + 3.0 * z + 1.0,
            }
        )

    current_idx = len(rows)
    current_row = dict(rows[-1])
    current_row["target"] = None
    rows.append(current_row)

    predicted, r2 = attempt_causal_ridge(
        rows,
        current_idx,
        "target",
        ["feature_x", "feature_y"],
        list(range(current_idx)),
        ridge_alpha=0.0,
    )

    expected = 2.0 * float(current_row["feature_x"]) + 3.0 * float(
        current_row["feature_y"]
    ) + 1.0
    assert predicted == pytest.approx(expected, rel=1e-6, abs=1e-6)
    assert r2 == pytest.approx(1.0, abs=1e-9)


def test_hierarchical_median_impute_prefers_same_weekday_history() -> None:
    rows = [
        {
            "date": "2024-03-01",
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "metric__value": 10.0,
        },
        {
            "date": "2024-02-23",
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "metric__value": 20.0,
        },
        {
            "date": "2024-03-04",
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "metric__value": 100.0,
        },
        {
            "date": "2024-03-05",
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "metric__value": 100.0,
        },
        {
            "date": "2024-03-08",
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "metric__value": None,
        },
    ]
    group_indices = {("acme", "PARIS-1"): [0, 1, 2, 3]}
    client_indices = {"acme": [0, 1, 2, 3]}

    assert (
        hierarchical_median_impute(
            rows,
            4,
            "metric__value",
            group_indices,
            client_indices,
            window_days=30,
        )
        == 15.0
    )


def test_apply_silver_quality_imputes_missing_values_with_median_fallback() -> None:
    rows = [
        {
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "date": "2024-03-01",
            "metric__value": 10.0,
        },
        {
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "date": "2024-03-02",
            "metric__value": 10.0,
        },
        {
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "date": "2024-03-03",
            "metric__value": None,
        },
        {
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "date": "2024-03-04",
            "metric__value": 10.0,
        },
        {
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "date": "2024-03-05",
            "metric__value": 10.0,
        },
    ]

    sorted_rows, summary = apply_silver_quality(rows)

    column_summary = summary["columns"]["metric__value"]
    assert column_summary["imputed_count"] == 1
    assert column_summary["unresolved_missing_count"] == 0
    assert sorted_rows[2]["metric__value"] == 10.0
    assert sorted_rows[2]["metric__value__imputed"] is True
    assert sorted_rows[2]["metric__value__imputation_method"] == "hierarchical_median"


def test_apply_silver_quality_clamps_outliers_after_history_builds() -> None:
    rows: list[dict[str, object]] = []
    history_values = [9.0, 10.0, 11.0] * 4 + [10.0, 11.0]
    for idx, value in enumerate(history_values, start=1):
        rows.append(
            {
                "client_slug": "acme",
                "site_code": "PARIS-1",
                "date": f"2024-03-{idx:02d}",
                "metric__value": value,
            }
        )

    rows.append(
        {
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "date": "2024-03-15",
            "metric__value": 100.0,
        }
    )

    sorted_rows, summary = apply_silver_quality(rows)

    assert sorted_rows[-1]["metric__value"] < 100.0
    assert sorted_rows[-1]["metric__value__outlier_clamped"] is True
    assert summary["columns"]["metric__value"]["outliers_clamped"] == 1
