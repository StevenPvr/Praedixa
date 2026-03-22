# ruff: noqa: T201
"""Bronze staging helpers for the medallion pipeline."""

from __future__ import annotations

import shutil
from dataclasses import asdict
from datetime import date
from pathlib import Path
from typing import Any

from app.services.file_parser import parse_file
from app.services.medallion_reprocessing import (
    QuarantineRecord,
    build_quarantine_record,
    save_quarantine_records,
)
from scripts.medallion_pipeline_base import (
    DEFAULT_COLUMN_ALIASES,
    MONTHLY_DATASETS,
    BronzeAsset,
    BronzeManifestEntry,
    SourceFile,
    SourceInspection,
    _resolve_trusted_source_path,
    coerce_scalar,
    load_json,
    normalize_identifier,
    now_utc,
    parse_date_any,
    sha256_file,
    write_json,
)

SUPPORTED_SOURCE_SUFFIXES = ("*.csv", "*.tsv", "*.xlsx")


def discover_source_files(data_root: Path) -> list[SourceFile]:
    files: list[SourceFile] = []
    try:
        resolved_root = data_root.resolve(strict=True)
    except OSError:
        return files

    for client_dir in sorted(data_root.iterdir()):
        if not client_dir.is_dir():
            continue
        if client_dir.name in {"metadata", "reference"}:
            continue

        client_slug = client_dir.name
        for domain_dir in sorted(client_dir.iterdir()):
            if not domain_dir.is_dir():
                continue
            for pattern in SUPPORTED_SOURCE_SUFFIXES:
                files.extend(
                    SourceFile(
                        client_slug=client_slug,
                        domain=domain_dir.name,
                        dataset=file_path.stem,
                        path=trusted_path,
                    )
                    for file_path in sorted(domain_dir.glob(pattern))
                    for trusted_path in [
                        _resolve_trusted_source_path(file_path, root=resolved_root)
                    ]
                    if trusted_path is not None
                )
    return files


def detect_changed_files(
    files: list[SourceFile], state: dict[str, Any]
) -> list[SourceFile]:
    changed: list[SourceFile] = []
    tracked_files: dict[str, str] = state.get("files", {})

    for entry in files:
        key = str(entry.path)
        digest = sha256_file(entry.path)
        if tracked_files.get(key) != digest:
            changed.append(entry)

    return changed


def load_column_aliases(path: Path) -> dict[str, list[str]]:
    if not path.exists():
        return DEFAULT_COLUMN_ALIASES

    payload = load_json(path, {})
    out = {**DEFAULT_COLUMN_ALIASES}
    for key, values in payload.items():
        if not isinstance(values, list):
            continue
        clean = [normalize_identifier(str(v)) for v in values]
        out[key] = clean
    return out


def resolve_key_columns(
    source_columns: list[str],
    dataset: str,
    aliases: dict[str, list[str]],
) -> tuple[str, str, str | None]:
    normalized_map = {normalize_identifier(col): col for col in source_columns}

    date_alias_key = "month" if dataset in MONTHLY_DATASETS else "date"

    date_col = None
    for candidate in aliases.get(date_alias_key, []):
        if candidate in normalized_map:
            date_col = normalized_map[candidate]
            break

    site_code_col = None
    for candidate in aliases.get("site_code", []):
        if candidate in normalized_map:
            site_code_col = normalized_map[candidate]
            break

    site_name_col = None
    for candidate in aliases.get("site_name", []):
        if candidate in normalized_map:
            site_name_col = normalized_map[candidate]
            break

    if date_col is None:
        msg = f"Unable to resolve temporal column for dataset={dataset}"
        raise RuntimeError(msg)
    if site_code_col is None:
        msg = f"Unable to resolve site_code column for dataset={dataset}"
        raise RuntimeError(msg)

    return date_col, site_code_col, site_name_col


def resolve_format_hint(source: SourceFile | BronzeAsset) -> str:
    suffix = source.path.suffix.lower()
    if suffix == ".xlsx":
        return "xlsx"
    return "csv"


def parse_source_rows(
    source: SourceFile | BronzeAsset,
) -> tuple[list[dict[str, Any]], list[str]]:
    content = source.path.read_bytes()
    result = parse_file(
        content,
        source.path.name,
        format_hint=resolve_format_hint(source),
        max_rows=2_000_000,
    )
    rows = [{k: coerce_scalar(v) for k, v in row.items()} for row in result.rows]
    return rows, result.source_columns


def inspect_source_file(
    source: SourceFile,
    aliases: dict[str, list[str]],
) -> SourceInspection:
    rows, source_columns = parse_source_rows(source)
    date_col, _site_code_col, _site_name_col = resolve_key_columns(
        source_columns,
        source.dataset,
        aliases,
    )
    parsed_dates = [
        parse_date_any(str(row.get(date_col)))
        for row in rows
        if row.get(date_col) is not None
    ]
    valid_dates = [
        parsed_date
        for parsed_date in parsed_dates
        if parsed_date is not None
    ]
    return SourceInspection(
        rows=rows,
        source_columns=source_columns,
        date_column=date_col,
        min_date=min(valid_dates) if valid_dates else None,
        max_date=max(valid_dates) if valid_dates else None,
    )


def _quarantine_source_file(
    *,
    source: SourceFile,
    output_root: Path,
    run_id: str,
    reason_code: str,
    reason_detail: str,
    file_hash: str,
    file_size_bytes: int,
    rows_detected: int | None = None,
    min_date: date | None = None,
    max_date: date | None = None,
    watermark: date | None = None,
) -> QuarantineRecord:
    quarantine_dir = (
        output_root
        / "quarantine"
        / f"client={source.client_slug}"
        / f"dataset={source.dataset}"
        / f"detected_at={run_id}"
    )
    quarantine_dir.mkdir(parents=True, exist_ok=True)
    quarantine_path = quarantine_dir / source.path.name
    shutil.copy2(source.path, quarantine_path)
    return build_quarantine_record(
        source_path=str(source.path),
        quarantine_path=str(quarantine_path),
        client_slug=source.client_slug,
        domain=source.domain,
        dataset=source.dataset,
        detected_at=run_id,
        reason_code=reason_code,
        reason_detail=reason_detail,
        file_hash=file_hash,
        file_size_bytes=file_size_bytes,
        rows_detected=rows_detected,
        min_date=min_date.isoformat() if min_date else None,
        max_date=max_date.isoformat() if max_date else None,
        watermark=watermark.isoformat() if watermark else None,
    )


def stage_bronze(
    changed: list[SourceFile],
    output_root: Path,
    state: dict[str, Any],
    aliases: dict[str, list[str]],
    *,
    allow_reprocess: bool,
) -> list[BronzeManifestEntry]:
    run_id = now_utc().strftime("%Y%m%dT%H%M%SZ")
    bronze_root = output_root / "bronze"
    manifest_entries: list[BronzeManifestEntry] = []
    quarantine_records: list[QuarantineRecord] = []
    tracked_files: dict[str, str] = state.setdefault("files", {})
    watermarks: dict[str, str] = state.setdefault("watermarks", {})

    for source in changed:
        digest = sha256_file(source.path)
        bytes_size = source.path.stat().st_size
        try:
            inspection = inspect_source_file(source, aliases)
        except Exception as exc:
            quarantine_records.append(
                _quarantine_source_file(
                    source=source,
                    output_root=output_root,
                    run_id=run_id,
                    reason_code="invalid_payload",
                    reason_detail=str(exc),
                    file_hash=digest,
                    file_size_bytes=bytes_size,
                )
            )
            print("quarantine", source.path, f"reason=invalid_payload({exc})")
            continue

        min_date = inspection.min_date
        max_date = inspection.max_date

        wm_key = f"{source.client_slug}::{source.dataset}"
        watermark_raw = watermarks.get(wm_key)
        watermark = date.fromisoformat(watermark_raw) if watermark_raw else None

        if (
            not allow_reprocess
            and watermark is not None
            and min_date is not None
            and min_date <= watermark
        ):
            quarantine_records.append(
                _quarantine_source_file(
                    source=source,
                    output_root=output_root,
                    run_id=run_id,
                    reason_code="retroactive_watermark",
                    reason_detail=f"min_date({min_date}) <= watermark({watermark})",
                    file_hash=digest,
                    file_size_bytes=bytes_size,
                    rows_detected=len(inspection.rows),
                    min_date=min_date,
                    max_date=max_date,
                    watermark=watermark,
                )
            )
            print(
                "quarantine",
                source.path,
                f"reason=min_date({min_date}) <= watermark({watermark})",
            )
            continue

        bronze_dir = (
            bronze_root
            / f"client={source.client_slug}"
            / f"dataset={source.dataset}"
            / f"ingested_at={run_id}"
        )
        bronze_dir.mkdir(parents=True, exist_ok=True)
        bronze_path = bronze_dir / "part-000.csv"
        shutil.copy2(source.path, bronze_path)

        tracked_files[str(source.path)] = digest
        if max_date is not None:
            watermarks[wm_key] = max_date.isoformat()

        manifest_entries.append(
            BronzeManifestEntry(
                source_path=str(source.path),
                bronze_path=str(bronze_path),
                client_slug=source.client_slug,
                domain=source.domain,
                dataset=source.dataset,
                file_hash=digest,
                file_size_bytes=bytes_size,
                rows_detected=len(inspection.rows),
                min_date=min_date.isoformat() if min_date else None,
                max_date=max_date.isoformat() if max_date else None,
                ingested_at=run_id,
            )
        )

    if manifest_entries:
        manifest_path = output_root / "bronze" / "_manifests" / f"{run_id}.json"
        write_json(manifest_path, [asdict(entry) for entry in manifest_entries])
    state["last_quarantine_count"] = len(quarantine_records)
    save_quarantine_records(output_root, run_id=run_id, records=quarantine_records)

    return manifest_entries


def discover_latest_bronze_assets(bronze_root: Path) -> list[BronzeAsset]:
    if not bronze_root.exists():
        return []

    latest: dict[tuple[str, str], BronzeAsset] = {}
    for asset_path in sorted(
        bronze_root.glob("client=*/dataset=*/ingested_at=*/part-000.csv")
    ):
        try:
            client_part = asset_path.parts[-4]
            dataset_part = asset_path.parts[-3]
            ingested_part = asset_path.parts[-2]
        except IndexError:
            continue

        if not client_part.startswith("client="):
            continue
        if not dataset_part.startswith("dataset="):
            continue
        if not ingested_part.startswith("ingested_at="):
            continue

        client_slug = client_part.split("=", 1)[1]
        dataset = dataset_part.split("=", 1)[1]
        ingested_at = ingested_part.split("=", 1)[1]

        key = (client_slug, dataset)
        candidate = BronzeAsset(
            client_slug=client_slug,
            dataset=dataset,
            domain="unknown",
            path=asset_path,
            ingested_at=ingested_at,
        )

        current = latest.get(key)
        if current is None or candidate.ingested_at > current.ingested_at:
            latest[key] = candidate

    return sorted(latest.values(), key=lambda a: (a.client_slug, a.dataset))
