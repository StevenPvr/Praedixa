"""Stage 1: Deduplication — remove duplicate rows keeping first occurrence.

All operations preserve causal (temporal) ordering.
"""

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
    """Remove duplicate rows, keeping the first occurrence in temporal order.

    Returns:
        (deduplicated_rows, duplicates_found, duplicates_removed)
    """
    # Sort by temporal index for causal ordering.
    # Rows with missing/invalid dates are placed at the end deterministically.
    sorted_rows = sorted(
        rows,
        key=lambda r: temporal_sort_key(r.get(temporal_index)),
    )

    # Determine which columns to use for duplicate detection
    if config.duplicate_columns is not None:
        dedup_cols = config.duplicate_columns
    else:
        # All columns except system columns
        all_cols: set[str] = set()
        for row in sorted_rows:
            all_cols.update(row.keys())
        dedup_cols = sorted(all_cols - SYSTEM_COLUMNS)

    # Build fingerprints and detect duplicates
    seen: dict[tuple[Any, ...], int] = {}
    unique_rows: list[dict[str, Any]] = []
    dupes_found = 0
    dupes_removed = 0

    for row in sorted_rows:
        fingerprint = tuple(row.get(col) for col in dedup_cols)
        if fingerprint in seen:
            dupes_removed += 1
            # Only count unique duplicate groups
            if seen[fingerprint] == 1:
                dupes_found += 1
            seen[fingerprint] += 1
        else:
            seen[fingerprint] = 1
            unique_rows.append(row)

    return unique_rows, dupes_found, dupes_removed
