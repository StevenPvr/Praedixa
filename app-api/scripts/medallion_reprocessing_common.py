"""Shared helpers for medallion replay/backfill CLI entrypoints."""

from __future__ import annotations

from dataclasses import asdict
from datetime import date
from pathlib import Path
from typing import Any, Literal

from app.services.medallion_reprocessing import (
    ReprocessingCandidate,
    ReprocessingPlan,
    build_reprocessing_plan,
    load_quarantine_records,
    record_overlaps_window,
    write_reprocessing_report,
)
from scripts.medallion_pipeline import (
    SourceFile,
    discover_source_files,
    inspect_source_file,
    load_column_aliases,
    run_selected_sources,
)


def parse_iso_date(value: str | None) -> date | None:
    if value is None:
        return None
    return date.fromisoformat(value)


def build_replay_plan(
    *,
    data_root: Path,
    output_root: Path,
    client_slug: str | None,
    dataset: str | None,
    reason_code: str | None,
    start_date: date | None,
    end_date: date | None,
) -> tuple[ReprocessingPlan, list[str]]:
    records = load_quarantine_records(
        output_root,
        client_slug=client_slug,
        dataset=dataset,
        reason_code=reason_code,
    )
    candidates: list[ReprocessingCandidate] = []
    notes: list[str] = []
    source_map = _build_source_file_map(data_root)

    for record in records:
        if not record.replayable or record.source_path is None:
            notes.append(
                f"skip:{record.quarantine_path}:missing_source_reference_for_replay"
            )
            continue
        if not record_overlaps_window(
            record,
            start_date=start_date,
            end_date=end_date,
        ):
            continue
        if record.source_path not in source_map:
            notes.append(f"skip:{record.source_path}:source_file_missing")
            continue
        candidates.append(
            ReprocessingCandidate(
                source_path=record.source_path,
                client_slug=record.client_slug,
                domain=record.domain,
                dataset=record.dataset,
                min_date=record.min_date,
                max_date=record.max_date,
                reason_code=record.reason_code,
            )
        )

    return (
        build_reprocessing_plan(
            trigger_type="replay",
            candidates=_dedupe_candidates(candidates),
            requested_start_date=start_date,
            requested_end_date=end_date,
        ),
        notes,
    )


def build_backfill_plan(
    *,
    data_root: Path,
    metadata_root: Path,
    client_slug: str | None,
    dataset: str | None,
    start_date: date,
    end_date: date,
) -> tuple[ReprocessingPlan, list[str]]:
    aliases = load_column_aliases(metadata_root / "column_aliases.json")
    candidates: list[ReprocessingCandidate] = []
    notes: list[str] = []

    for source in discover_source_files(data_root):
        if client_slug is not None and source.client_slug != client_slug:
            continue
        if dataset is not None and source.dataset != dataset:
            continue
        try:
            inspection = inspect_source_file(source, aliases)
        except Exception as exc:
            notes.append(f"skip:{source.path}:invalid_source({exc})")
            continue
        if not _window_overlaps(
            inspection.min_date,
            inspection.max_date,
            start_date=start_date,
            end_date=end_date,
        ):
            continue
        candidates.append(
            ReprocessingCandidate(
                source_path=str(source.path),
                client_slug=source.client_slug,
                domain=source.domain,
                dataset=source.dataset,
                min_date=inspection.min_date.isoformat()
                if inspection.min_date is not None
                else None,
                max_date=inspection.max_date.isoformat()
                if inspection.max_date is not None
                else None,
                reason_code="requested_backfill",
            )
        )

    return (
        build_reprocessing_plan(
            trigger_type="backfill",
            candidates=_dedupe_candidates(candidates),
            requested_start_date=start_date,
            requested_end_date=end_date,
        ),
        notes,
    )


def apply_reprocessing_plan(
    *,
    plan: ReprocessingPlan,
    data_root: Path,
    output_root: Path,
    metadata_root: Path,
    force_rebuild: bool,
    notes: list[str] | None = None,
) -> dict[str, Any]:
    notes = list(notes or [])
    source_map = _build_source_file_map(data_root)
    selected_sources: list[SourceFile] = []

    for candidate in plan.candidates:
        source = source_map.get(candidate.source_path)
        if source is None:
            notes.append(f"skip:{candidate.source_path}:source_file_missing")
            continue
        selected_sources.append(source)

    result = run_selected_sources(
        selected_sources,
        output_root=output_root,
        metadata_root=metadata_root,
        allow_reprocess=True,
        force_rebuild=force_rebuild,
    )
    status: Literal["applied", "empty"] = (
        "applied" if result["changed"] else "empty"
    )
    report_path = write_reprocessing_report(
        output_root,
        plan=plan,
        status=status,
        staged_files=int(result["staged_files"]),
        quarantined_files=int(result["quarantined_files"]),
        notes=notes,
    )
    return {
        "status": status,
        "report_path": str(report_path),
        "staged_files": int(result["staged_files"]),
        "quarantined_files": int(result["quarantined_files"]),
        "notes": notes,
    }


def plan_to_payload(
    plan: ReprocessingPlan, *, notes: list[str] | None = None
) -> dict[str, Any]:
    return {
        "plan": asdict(plan),
        "notes": notes or [],
    }


def _build_source_file_map(data_root: Path) -> dict[str, SourceFile]:
    return {str(source.path): source for source in discover_source_files(data_root)}


def _dedupe_candidates(
    candidates: list[ReprocessingCandidate],
) -> list[ReprocessingCandidate]:
    unique: dict[str, ReprocessingCandidate] = {}
    for candidate in candidates:
        unique[candidate.source_path] = candidate
    return sorted(
        unique.values(),
        key=lambda item: (item.client_slug, item.dataset, item.source_path),
    )


def _window_overlaps(
    min_date: date | None,
    max_date: date | None,
    *,
    start_date: date,
    end_date: date,
) -> bool:
    effective_start = min_date or max_date
    effective_end = max_date or min_date
    if effective_start is None or effective_end is None:
        return False
    if effective_end < start_date:
        return False
    return not (effective_start > end_date)
