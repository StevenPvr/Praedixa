"""Append-only quarantine and reprocessing helpers for the medallion pipeline."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any, Literal, cast

TriggerType = Literal["replay", "backfill"]


@dataclass(frozen=True)
class QuarantineRecord:
    source_path: str | None
    quarantine_path: str
    client_slug: str
    domain: str
    dataset: str
    detected_at: str
    reason_code: str
    reason_detail: str
    file_hash: str | None = None
    file_size_bytes: int | None = None
    rows_detected: int | None = None
    min_date: str | None = None
    max_date: str | None = None
    watermark: str | None = None
    replayable: bool = False


@dataclass(frozen=True)
class ReprocessingCandidate:
    source_path: str
    client_slug: str
    domain: str
    dataset: str
    min_date: str | None = None
    max_date: str | None = None
    reason_code: str | None = None


@dataclass(frozen=True)
class ReprocessingPlan:
    plan_id: str
    trigger_type: TriggerType
    created_at: str
    source_count: int
    requested_start_date: str | None
    requested_end_date: str | None
    candidates: tuple[ReprocessingCandidate, ...]


def now_utc_iso() -> str:
    return datetime.now(UTC).isoformat()


def build_quarantine_record(
    *,
    source_path: str | None,
    quarantine_path: str,
    client_slug: str,
    domain: str,
    dataset: str,
    detected_at: str,
    reason_code: str,
    reason_detail: str,
    file_hash: str | None = None,
    file_size_bytes: int | None = None,
    rows_detected: int | None = None,
    min_date: str | None = None,
    max_date: str | None = None,
    watermark: str | None = None,
) -> QuarantineRecord:
    return QuarantineRecord(
        source_path=source_path,
        quarantine_path=quarantine_path,
        client_slug=client_slug,
        domain=domain,
        dataset=dataset,
        detected_at=detected_at,
        reason_code=reason_code,
        reason_detail=reason_detail,
        file_hash=file_hash,
        file_size_bytes=file_size_bytes,
        rows_detected=rows_detected,
        min_date=min_date,
        max_date=max_date,
        watermark=watermark,
        replayable=source_path is not None,
    )


def save_quarantine_records(
    output_root: Path,
    *,
    run_id: str,
    records: list[QuarantineRecord],
) -> Path | None:
    if not records:
        return None
    manifest_path = output_root / "quarantine" / "_manifests" / f"{run_id}.json"
    _write_json(manifest_path, [asdict(record) for record in records])
    return manifest_path


def load_quarantine_records(
    output_root: Path,
    *,
    client_slug: str | None = None,
    dataset: str | None = None,
    reason_code: str | None = None,
) -> list[QuarantineRecord]:
    records = _load_manifest_records(output_root)
    if not records:
        records = _scan_legacy_quarantine_records(output_root)

    return [
        record
        for record in records
        if _matches_filter(
            record,
            client_slug=client_slug,
            dataset=dataset,
            reason_code=reason_code,
        )
    ]


def record_overlaps_window(
    record: QuarantineRecord,
    *,
    start_date: date | None,
    end_date: date | None,
) -> bool:
    return _range_overlaps(
        record.min_date,
        record.max_date,
        start_date=start_date,
        end_date=end_date,
    )


def build_reprocessing_plan(
    *,
    trigger_type: TriggerType,
    candidates: list[ReprocessingCandidate],
    requested_start_date: date | None = None,
    requested_end_date: date | None = None,
) -> ReprocessingPlan:
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    return ReprocessingPlan(
        plan_id=f"{trigger_type}-{timestamp}",
        trigger_type=trigger_type,
        created_at=now_utc_iso(),
        source_count=len(candidates),
        requested_start_date=requested_start_date.isoformat()
        if requested_start_date is not None
        else None,
        requested_end_date=requested_end_date.isoformat()
        if requested_end_date is not None
        else None,
        candidates=tuple(candidates),
    )


def write_reprocessing_report(
    output_root: Path,
    *,
    plan: ReprocessingPlan,
    status: Literal["planned", "applied", "empty"],
    staged_files: int,
    quarantined_files: int,
    notes: list[str] | None = None,
) -> Path:
    report_path = output_root / "reports" / "reprocessing" / f"{plan.plan_id}.json"
    payload = {
        "plan": asdict(plan),
        "status": status,
        "staged_files": staged_files,
        "quarantined_files": quarantined_files,
        "notes": notes or [],
        "written_at": now_utc_iso(),
    }
    _write_json(report_path, payload)
    return report_path


def _matches_filter(
    record: QuarantineRecord,
    *,
    client_slug: str | None,
    dataset: str | None,
    reason_code: str | None,
) -> bool:
    if client_slug is not None and record.client_slug != client_slug:
        return False
    if dataset is not None and record.dataset != dataset:
        return False
    return not (reason_code is not None and record.reason_code != reason_code)


def _load_manifest_records(output_root: Path) -> list[QuarantineRecord]:
    manifest_root = output_root / "quarantine" / "_manifests"
    records: list[QuarantineRecord] = []
    seen_paths: set[str] = set()

    for manifest_path in sorted(manifest_root.glob("*.json")):
        payload = _load_json(manifest_path, [])
        if not isinstance(payload, list):
            continue
        manifest_items = cast("list[object]", payload)
        for item in manifest_items:
            if not isinstance(item, dict):
                continue
            typed_item = cast("dict[str, Any]", item)
            record = _record_from_payload(typed_item)
            if record is None or record.quarantine_path in seen_paths:
                continue
            seen_paths.add(record.quarantine_path)
            records.append(record)
    return records


def _scan_legacy_quarantine_records(output_root: Path) -> list[QuarantineRecord]:
    quarantine_root = output_root / "quarantine"
    records: list[QuarantineRecord] = []
    for path in sorted(quarantine_root.glob("client=*/dataset=*/detected_at=*/*.csv")):
        if "_manifests" in path.parts:
            continue
        try:
            client_slug = path.parts[-4].split("=", 1)[1]
            dataset = path.parts[-3].split("=", 1)[1]
            detected_at = path.parts[-2].split("=", 1)[1]
        except IndexError:
            continue

        records.append(
            build_quarantine_record(
                source_path=None,
                quarantine_path=str(path),
                client_slug=client_slug,
                domain="unknown",
                dataset=dataset,
                detected_at=detected_at,
                reason_code="legacy_quarantine",
                reason_detail="Legacy quarantine entry without manifest metadata.",
            )
        )
    return records


def _record_from_payload(payload: dict[str, Any]) -> QuarantineRecord | None:
    quarantine_path = payload.get("quarantine_path")
    client_slug = payload.get("client_slug")
    dataset = payload.get("dataset")
    detected_at = payload.get("detected_at")
    reason_code = payload.get("reason_code")
    reason_detail = payload.get("reason_detail")

    if not all(
        isinstance(value, str) and value
        for value in (
            quarantine_path,
            client_slug,
            dataset,
            detected_at,
            reason_code,
            reason_detail,
        )
    ):
        return None

    assert isinstance(quarantine_path, str)
    assert isinstance(client_slug, str)
    assert isinstance(dataset, str)
    assert isinstance(detected_at, str)
    assert isinstance(reason_code, str)
    assert isinstance(reason_detail, str)

    return QuarantineRecord(
        source_path=payload.get("source_path")
        if isinstance(payload.get("source_path"), str)
        else None,
        quarantine_path=quarantine_path,
        client_slug=client_slug,
        domain=str(payload.get("domain") or "unknown"),
        dataset=dataset,
        detected_at=detected_at,
        reason_code=reason_code,
        reason_detail=reason_detail,
        file_hash=payload.get("file_hash")
        if isinstance(payload.get("file_hash"), str)
        else None,
        file_size_bytes=payload.get("file_size_bytes")
        if isinstance(payload.get("file_size_bytes"), int)
        else None,
        rows_detected=payload.get("rows_detected")
        if isinstance(payload.get("rows_detected"), int)
        else None,
        min_date=payload.get("min_date")
        if isinstance(payload.get("min_date"), str)
        else None,
        max_date=payload.get("max_date")
        if isinstance(payload.get("max_date"), str)
        else None,
        watermark=payload.get("watermark")
        if isinstance(payload.get("watermark"), str)
        else None,
        replayable=isinstance(payload.get("source_path"), str)
        and bool(payload.get("source_path")),
    )


def _range_overlaps(
    min_value: str | None,
    max_value: str | None,
    *,
    start_date: date | None,
    end_date: date | None,
) -> bool:
    if start_date is None and end_date is None:
        return True

    min_date = _parse_date(min_value)
    max_date = _parse_date(max_value)

    if min_date is None and max_date is None:
        return False

    effective_start = min_date or max_date
    effective_end = max_date or min_date
    if effective_start is None or effective_end is None:
        return False
    if start_date is not None and effective_end < start_date:
        return False
    return not (end_date is not None and effective_start > end_date)


def _parse_date(value: str | None) -> date | None:
    if value is None:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(f"{path.suffix}.tmp")
    with temp.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
    temp.replace(path)
