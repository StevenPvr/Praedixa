"""Quality report schemas — response models for data quality analysis.

Security notes:
- All fields are read-only (no create/update schemas needed from client).
- column_details and strategy_config are opaque JSONB — never interpreted as code.
- extra="forbid" on QualitySummary prevents mass assignment from malformed responses.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import ConfigDict

from app.schemas.base import CamelModel


class QualityReportRead(CamelModel):
    """Full quality report response."""

    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    dataset_id: uuid.UUID
    ingestion_log_id: uuid.UUID
    rows_received: int
    rows_after_dedup: int
    rows_after_quality: int
    duplicates_found: int
    missing_values_found: int
    missing_values_imputed: int
    outliers_found: int
    outliers_clamped: int
    column_details: dict[str, Any]
    strategy_config: dict[str, Any]
    created_at: datetime


class QualitySummary(CamelModel):
    """Embedded quality summary in IngestionResponse."""

    model_config = ConfigDict(extra="forbid")

    duplicates_found: int
    duplicates_removed: int
    missing_values_found: int
    missing_values_imputed: int
    outliers_found: int
    outliers_clamped: int
    quality_report_id: uuid.UUID
