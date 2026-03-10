"""Data/ML request schemas shared by offline services."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InferenceJobCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model_registry_id: UUID | None = None
    date_from: date | None = None
    date_to: date | None = None
    horizon_days: int = Field(default=14, ge=1, le=31)
    model_family: str | None = None
    site_code: str | None = None


class ModelRegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model_family: str
    version: str
    artifact_uri: str
    sha256: str
    onnx_opset: int | None = None
    features_schema_json: dict[str, Any] = Field(default_factory=dict)
    metrics_json: dict[str, Any] = Field(default_factory=dict)
