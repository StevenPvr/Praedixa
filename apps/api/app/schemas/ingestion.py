"""Ingestion schemas — request/response models for file upload ingestion.

Security notes:
- format_hint is validated against a strict allowlist (Literal type).
- file_name and file_size are set server-side only, never from client.
- extra='forbid' on request schemas prevents mass assignment.
"""

import uuid
from typing import Literal

from pydantic import ConfigDict, Field

from app.schemas.base import CamelModel
from app.schemas.quality import QualitySummary

# Allowed format hints for file upload ingestion.
FormatHint = Literal["lucca", "payfit", "sage", "generic"]


class IngestionResponse(CamelModel):
    """Response after successful file ingestion."""

    model_config = ConfigDict(extra="forbid")

    dataset_id: uuid.UUID
    rows_inserted: int
    batch_id: uuid.UUID
    detected_format: str
    detected_encoding: str
    warnings: list[str] = Field(default_factory=list)
    ingestion_log_id: uuid.UUID
    quality_summary: QualitySummary | None = None
