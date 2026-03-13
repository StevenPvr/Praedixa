from __future__ import annotations

import csv
import json
from datetime import date
from pathlib import Path
from typing import TYPE_CHECKING

from app.services.medallion_reprocessing import load_quarantine_records
from scripts.medallion_pipeline import (
    DEFAULT_COLUMN_ALIASES,
    SourceFile,
    run_selected_sources,
    stage_bronze,
)
from scripts.medallion_reprocessing_common import build_backfill_plan, build_replay_plan

if TYPE_CHECKING:
    import pytest


def _write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def _write_metadata(metadata_root: Path) -> None:
    metadata_root.mkdir(parents=True, exist_ok=True)
    (metadata_root / "column_aliases.json").write_text(
        json.dumps(DEFAULT_COLUMN_ALIASES),
        encoding="utf-8",
    )
    (metadata_root / "site_locations.json").write_text("{}", encoding="utf-8")


def test_stage_bronze_quarantines_invalid_payload_with_manifest(tmp_path: Path) -> None:
    source_path = tmp_path / "data" / "acme" / "ops" / "workforce_daily.csv"
    _write_csv(source_path, [{"unexpected": 1}])
    state: dict[str, object] = {"files": {}, "watermarks": {}}
    changed = [
        SourceFile(
            client_slug="acme",
            domain="ops",
            dataset="workforce_daily",
            path=source_path,
        )
    ]

    manifest_entries = stage_bronze(
        changed,
        tmp_path / "data-ready",
        state,
        DEFAULT_COLUMN_ALIASES,
        allow_reprocess=False,
    )

    assert manifest_entries == []
    records = load_quarantine_records(tmp_path / "data-ready")
    assert len(records) == 1
    assert records[0].reason_code == "invalid_payload"
    assert records[0].replayable is True
    assert records[0].source_path == str(source_path)
    assert state["last_quarantine_count"] == 1


def test_stage_bronze_quarantines_retroactive_file_with_manifest(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "data" / "acme" / "ops" / "workforce_daily.csv"
    _write_csv(
        source_path,
        [{"date": "2026-03-01", "site_code": "PAR", "required_fte": 10}],
    )
    state: dict[str, object] = {
        "files": {},
        "watermarks": {"acme::workforce_daily": "2026-03-02"},
    }

    manifest_entries = stage_bronze(
        [
            SourceFile(
                client_slug="acme",
                domain="ops",
                dataset="workforce_daily",
                path=source_path,
            )
        ],
        tmp_path / "data-ready",
        state,
        DEFAULT_COLUMN_ALIASES,
        allow_reprocess=False,
    )

    assert manifest_entries == []
    records = load_quarantine_records(tmp_path / "data-ready")
    assert len(records) == 1
    assert records[0].reason_code == "retroactive_watermark"
    assert records[0].watermark == "2026-03-02"
    assert records[0].min_date == "2026-03-01"


def test_build_replay_plan_uses_quarantine_manifests(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    source_path = data_root / "acme" / "ops" / "workforce_daily.csv"
    _write_csv(
        source_path,
        [{"date": "2026-03-01", "site_code": "PAR", "required_fte": 10}],
    )
    output_root = tmp_path / "data-ready"
    stage_bronze(
        [
            SourceFile(
                client_slug="acme",
                domain="ops",
                dataset="workforce_daily",
                path=source_path,
            )
        ],
        output_root,
        {"files": {}, "watermarks": {"acme::workforce_daily": "2026-03-02"}},
        DEFAULT_COLUMN_ALIASES,
        allow_reprocess=False,
    )

    plan, notes = build_replay_plan(
        data_root=data_root,
        output_root=output_root,
        client_slug="acme",
        dataset="workforce_daily",
        reason_code="retroactive_watermark",
        start_date=None,
        end_date=None,
    )

    assert notes == []
    assert plan.trigger_type == "replay"
    assert plan.source_count == 1
    assert plan.candidates[0].source_path == str(source_path)


def test_build_backfill_plan_filters_overlapping_sources_and_invalid_inputs(
    tmp_path: Path,
) -> None:
    data_root = tmp_path / "data"
    metadata_root = tmp_path / "config" / "medallion"
    _write_metadata(metadata_root)

    valid_path = data_root / "acme" / "ops" / "workforce_daily.csv"
    invalid_path = data_root / "acme" / "ops" / "operations_daily.csv"
    future_path = data_root / "acme" / "ops" / "labor_cost_daily.csv"

    _write_csv(
        valid_path,
        [{"date": "2026-03-02", "site_code": "PAR", "required_fte": 10}],
    )
    _write_csv(invalid_path, [{"broken": 1}])
    _write_csv(
        future_path,
        [{"date": "2026-04-02", "site_code": "PAR", "labor_cost": 1000}],
    )

    plan, notes = build_backfill_plan(
        data_root=data_root,
        metadata_root=metadata_root,
        client_slug="acme",
        dataset=None,
        start_date=date(2026, 3, 1),
        end_date=date(2026, 3, 31),
    )

    assert plan.trigger_type == "backfill"
    assert plan.source_count == 1
    assert plan.candidates[0].source_path == str(valid_path)
    assert any("invalid_source" in note for note in notes)


def test_run_selected_sources_rebuilds_outputs_for_explicit_sources(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    data_root = tmp_path / "data"
    output_root = tmp_path / "data-ready"
    metadata_root = tmp_path / "config" / "medallion"
    _write_metadata(metadata_root)

    source_path = data_root / "acme" / "ops" / "workforce_daily.csv"
    _write_csv(
        source_path,
        [{"date": "2026-03-02", "site_code": "PAR", "required_fte": 10}],
    )

    monkeypatch.setattr(
        "scripts.medallion_pipeline.add_external_features",
        lambda *args, **kwargs: None,
    )

    result = run_selected_sources(
        [
            SourceFile(
                client_slug="acme",
                domain="ops",
                dataset="workforce_daily",
                path=source_path,
            )
        ],
        output_root=output_root,
        metadata_root=metadata_root,
        allow_reprocess=True,
        force_rebuild=True,
    )

    assert result["changed"] is True
    assert result["staged_files"] == 1
    assert result["quarantined_files"] == 0
    assert (output_root / "gold" / "gold_site_day.csv").exists()
    assert (output_root / "reports" / "last_run_summary.json").exists()
