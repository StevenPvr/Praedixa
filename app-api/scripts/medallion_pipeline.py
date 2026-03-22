# ruff: noqa: F401, T201, E501
"""Metadata-driven medallion pipeline for client datalake ingestion."""

from __future__ import annotations

import argparse
import time
from pathlib import Path
from typing import Any

from scripts.medallion_pipeline_base import (
    DAILY_DATASETS,
    DEFAULT_COLUMN_ALIASES,
    DEFAULT_STATE,
    LEGACY_DATASET_PREFIX,
    LEGACY_RUNTIME_COLUMN_PREFIX,
    MISSING_TOKENS,
    MONTHLY_DATASETS,
    VALID_SCHOOL_ZONES,
    BronzeAsset,
    BronzeManifestEntry,
    SourceFile,
    SourceInspection,
    coerce_scalar,
    load_json,
    normalize_identifier,
    now_utc,
    parse_date_any,
    sha256_file,
    to_float,
    write_json,
)
from scripts.medallion_pipeline_bronze import (
    detect_changed_files,
    discover_latest_bronze_assets,
    discover_source_files,
    inspect_source_file,
    load_column_aliases,
    parse_source_rows,
    resolve_key_columns,
    stage_bronze,
)
from scripts.medallion_pipeline_features import (
    add_calendar_features,
    add_external_features,
    add_lag_rolling_features,
    fetch_json,
    fetch_school_holiday_intervals,
    fetch_weather_series,
    load_site_locations,
    normalize_school_zone,
    select_gold_feature_columns,
    split_gold_features_and_quality_metadata,
    write_csv_rows,
)
from scripts.medallion_pipeline_quality import (
    apply_silver_quality,
    attempt_causal_ridge,
    build_silver_rows,
    classify_missing_mechanism,
    clip_to_history,
    daterange,
    extract_numeric_columns,
    get_client_indices,
    get_group_indices,
    hierarchical_median_impute,
    month_start,
    previous_month_start,
)


def _finalize_medallion_outputs(
    *,
    output_root: Path,
    metadata_root: Path,
    aliases: dict[str, list[str]],
    state: dict[str, Any],
    bronze_file_count: int,
) -> None:
    assets = discover_latest_bronze_assets(output_root / "bronze")
    silver_base = build_silver_rows(assets, aliases)
    silver_rows, quality_summary = apply_silver_quality(silver_base)

    silver_path = output_root / "silver" / "silver_site_day.csv"
    write_csv_rows(silver_path, silver_rows)

    gold_seed_rows, removed_quality_columns = split_gold_features_and_quality_metadata(
        silver_rows
    )
    gold_rows = [dict(row) for row in gold_seed_rows]
    add_calendar_features(gold_rows)

    site_locations = load_site_locations(metadata_root / "site_locations.json")
    add_external_features(gold_rows, site_locations, output_root / "cache")

    feature_cols = select_gold_feature_columns(gold_rows)
    add_lag_rolling_features(gold_rows, feature_cols)

    gold_path = output_root / "gold" / "gold_site_day.csv"
    write_csv_rows(gold_path, gold_rows)

    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in gold_rows:
        grouped.setdefault(str(row.get("client_slug") or ""), []).append(row)
    for client_slug, client_rows in grouped.items():
        client_path = (
            output_root / "gold" / f"client={client_slug}" / "gold_site_day.csv"
        )
        write_csv_rows(client_path, client_rows)

    run_summary = {
        "run_at": now_utc().isoformat(),
        "bronze_files": bronze_file_count,
        "silver_rows": len(silver_rows),
        "gold_rows": len(gold_rows),
        "feature_columns_for_lags": feature_cols,
        "gold_removed_quality_columns_count": len(removed_quality_columns),
    }
    state["last_run"] = run_summary

    gold_feature_quality_report = {
        "generated_at": now_utc().isoformat(),
        "removed_from_gold_columns": removed_quality_columns,
        "removed_from_gold_columns_count": len(removed_quality_columns),
        "silver_quality_summary": quality_summary.get("columns", {}),
    }

    write_json(output_root / "reports" / "silver_quality_report.json", quality_summary)
    write_json(
        output_root / "reports" / "gold_feature_quality_report.json",
        gold_feature_quality_report,
    )
    write_json(output_root / "reports" / "last_run_summary.json", run_summary)

    print(f"Bronze staged files: {bronze_file_count}")
    print(f"Silver rows: {len(silver_rows)} -> {silver_path}")
    print(f"Gold rows: {len(gold_rows)} -> {gold_path}")


def run_selected_sources(
    selected_sources: list[SourceFile],
    *,
    output_root: Path,
    metadata_root: Path,
    allow_reprocess: bool,
    force_rebuild: bool = False,
) -> dict[str, Any]:
    state_path = output_root / ".medallion_state.json"
    state = load_json(state_path, DEFAULT_STATE)
    if force_rebuild:
        state["files"] = {}
        state["watermarks"] = {}

    aliases = load_column_aliases(metadata_root / "column_aliases.json")
    manifest_entries = stage_bronze(
        selected_sources,
        output_root,
        state,
        aliases,
        allow_reprocess=allow_reprocess,
    )
    if not manifest_entries:
        write_json(state_path, state)
        return {
            "changed": False,
            "staged_files": 0,
            "quarantined_files": int(state.get("last_quarantine_count") or 0),
        }

    _finalize_medallion_outputs(
        output_root=output_root,
        metadata_root=metadata_root,
        aliases=aliases,
        state=state,
        bronze_file_count=len(manifest_entries),
    )
    write_json(state_path, state)
    return {
        "changed": True,
        "staged_files": len(manifest_entries),
        "quarantined_files": int(state.get("last_quarantine_count") or 0),
    }


def run_once(
    data_root: Path,
    output_root: Path,
    metadata_root: Path,
    *,
    allow_reprocess: bool,
    force_rebuild: bool,
) -> bool:
    source_files = discover_source_files(data_root)
    state = load_json(output_root / ".medallion_state.json", DEFAULT_STATE)
    changed = detect_changed_files(source_files, state)

    if force_rebuild:
        changed = source_files

    if not changed:
        print("No new source files detected.")
        return False

    result = run_selected_sources(
        changed,
        output_root=output_root,
        metadata_root=metadata_root,
        allow_reprocess=allow_reprocess,
        force_rebuild=force_rebuild,
    )
    if not result["changed"]:
        print("No files staged to bronze (all quarantined or invalid).")
        return False
    return True


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run medallion data pipeline.")
    parser.add_argument(
        "--data-root", type=Path, default=Path(__file__).resolve().parents[2] / "data"
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "data-ready",
    )
    parser.add_argument(
        "--metadata-root",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "config" / "medallion",
    )
    parser.add_argument(
        "--allow-reprocess",
        action="store_true",
        help="Allow retroactive files (disabled by default to prevent backfill leakage).",
    )
    parser.add_argument(
        "--force-rebuild",
        action="store_true",
        help="Ignore state and rebuild from all source files.",
    )
    parser.add_argument(
        "--watch", action="store_true", help="Poll source files continuously."
    )
    parser.add_argument("--poll-seconds", type=int, default=30)
    return parser


def main() -> None:
    args = build_parser().parse_args()

    if args.watch:
        while True:
            try:
                changed = run_once(
                    data_root=args.data_root,
                    output_root=args.output_root,
                    metadata_root=args.metadata_root,
                    allow_reprocess=args.allow_reprocess,
                    force_rebuild=args.force_rebuild,
                )
                if changed:
                    args.force_rebuild = False
            except Exception as exc:
                print(f"Pipeline failure: {exc}")
            time.sleep(args.poll_seconds)
    else:
        run_once(
            data_root=args.data_root,
            output_root=args.output_root,
            metadata_root=args.metadata_root,
            allow_reprocess=args.allow_reprocess,
            force_rebuild=args.force_rebuild,
        )


if __name__ == "__main__":
    main()
