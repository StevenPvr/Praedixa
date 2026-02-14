"""Deduplication — remove duplicate rows, keep first in temporal order."""

from __future__ import annotations

from typing import Any

from app.services.quality.types import (
    SYSTEM_COLUMNS,
    QualityConfig,
    temporal_sort_key,
)

__all__ = ["deduplicate"]


def deduplicate(
    rows: list[dict[str, Any]],
    temporal_index: str,
    config: QualityConfig,
) -> tuple[list[dict[str, Any]], int, int]:
    sorted_rows = sorted(
        rows,
        key=lambda r: temporal_sort_key(r.get(temporal_index)),
    )

    dedup_cols = (
        config.duplicate_columns
        if config.duplicate_columns is not None
        else sorted({k for row in sorted_rows for k in row} - SYSTEM_COLUMNS)
    )

    seen: dict[tuple[Any, ...], int] = {}
    unique_rows: list[dict[str, Any]] = []
    dupes_found = 0
    dupes_removed = 0

    for row in sorted_rows:
        fingerprint = tuple(row.get(col) for col in dedup_cols)
        if fingerprint in seen:
            dupes_removed += 1
            if seen[fingerprint] == 1:
                dupes_found += 1
            seen[fingerprint] += 1
        else:
            seen[fingerprint] = 1
            unique_rows.append(row)

    return unique_rows, dupes_found, dupes_removed
