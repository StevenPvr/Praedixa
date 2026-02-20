"""Unit tests for Gold provenance policy payload."""

from pathlib import Path

from app.services.gold_live_data import GoldSnapshot, build_gold_provenance


def _snapshot(columns: list[str], rows: list[dict[str, object]]) -> GoldSnapshot:
    return GoldSnapshot(
        rows=rows,
        columns=columns,
        revision="rev-123",
        loaded_at="2026-02-19T10:00:00Z",
        source_path=Path("data-ready/gold/gold_site_day.csv"),
    )


def test_gold_provenance_accepts_forecast_mock_columns_only(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.gold_live_data.load_live_quality_reports",
        lambda: {
            "silver_quality": {"ok": True},
            "gold_feature_quality": {"ok": True},
            "last_run_summary": {"run_at": "2026-02-11T13:13:07Z", "gold_rows": 4386},
        },
    )
    snapshot = _snapshot(
        [
            "client_slug",
            "site_code",
            "mock_forecasts_daily__forecasted_orders",
        ],
        rows=[{"client_slug": "acme", "site_code": "CDG"}],
    )

    payload = build_gold_provenance(snapshot)

    assert payload["policy"]["strict_data_policy_ok"] is True
    assert payload["policy"]["non_forecast_mock_columns"] == []
    assert payload["policy"]["forecast_mock_columns"] == [
        "mock_forecasts_daily__forecasted_orders"
    ]
    assert payload["quality_reports"]["last_run_summary_available"] is True
    assert payload["quality_reports"]["last_run_gold_rows"] == 4386


def test_gold_provenance_flags_non_forecast_mock_columns(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.gold_live_data.load_live_quality_reports",
        lambda: {
            "silver_quality": {},
            "gold_feature_quality": {},
            "last_run_summary": {},
        },
    )
    snapshot = _snapshot(
        [
            "client_slug",
            "mock_forecasts_daily__predicted_required_fte",
            "mock_training_daily__synthetic_signal",
        ],
        rows=[],
    )

    payload = build_gold_provenance(snapshot)

    assert payload["policy"]["strict_data_policy_ok"] is False
    assert payload["policy"]["non_forecast_mock_columns"] == [
        "mock_training_daily__synthetic_signal"
    ]
    assert payload["quality_reports"]["silver_quality_available"] is False
