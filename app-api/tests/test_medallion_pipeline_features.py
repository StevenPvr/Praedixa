from datetime import date
from pathlib import Path

import pytest

import scripts.medallion_pipeline_features as features


def test_fetch_school_holiday_intervals_uses_cache_and_parses_results(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cache_file = tmp_path / "holidays.json"
    payload = {
        "results": [
            {
                "start_date": "2024-02-10T12:00:00+00:00",
                "end_date": "2024-02-20T12:00:00+00:00",
                "description": "Winter break",
            }
        ]
    }
    calls: list[str] = []

    def fake_fetch_json(url: str) -> dict[str, object]:
        calls.append(url)
        return payload

    monkeypatch.setattr(features, "fetch_json", fake_fetch_json)

    intervals = features.fetch_school_holiday_intervals("a", {2024}, cache_file)

    assert intervals == [(date(2024, 2, 10), date(2024, 2, 20), "Winter break")]
    assert calls
    assert "fr-en-calendrier-scolaire" in calls[0]

    monkeypatch.setattr(features, "fetch_json", lambda _url: pytest.fail("cache"))
    assert features.fetch_school_holiday_intervals("a", {2024}, cache_file) == intervals


def test_apply_external_features_merges_weather_and_school_flags() -> None:
    rows = [
        {
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "date": "2024-02-12",
        }
    ]
    site_locations = {("acme", "PARIS-1"): {"school_zone": "a"}}
    weather_by_site = {
        ("acme", "PARIS-1"): {
            "2024-02-12": {
                "weather_temp_mean_c": 8.0,
                "weather_precip_mm": 1.2,
            }
        }
    }
    holiday_intervals_by_zone = {
        "A": [(date(2024, 2, 10), date(2024, 2, 20), "Winter break")]
    }

    features._apply_external_features(
        rows,
        site_locations,
        weather_by_site=weather_by_site,
        holiday_intervals_by_zone=holiday_intervals_by_zone,
    )

    row = rows[0]
    assert row["weather_temp_mean_c"] == 8.0
    assert row["weather_precip_mm"] == 1.2
    assert row["school_zone"] == "A"
    assert row["is_school_holiday"] is True
    assert row["school_holiday_label"] == "Winter break"


def test_add_lag_rolling_features_builds_expected_window_statistics() -> None:
    rows = [
        {
            "client_slug": "acme",
            "site_code": "PARIS-1",
            "date": f"2024-03-{idx:02d}",
            "metric": float(idx),
        }
        for idx in range(1, 9)
    ]

    features.add_lag_rolling_features(rows, ["metric"])

    last_row = rows[-1]
    assert last_row["metric__lag_1"] == 7.0
    assert last_row["metric__lag_7"] == 1.0
    assert last_row["metric__rolling_mean_7"] == pytest.approx(4.0)
    assert last_row["metric__rolling_std_7"] == pytest.approx(2.0)
