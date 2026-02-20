"""Schemas for model registry and inference jobs."""
# ruff: noqa: TC003

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import ConfigDict, Field

from app.schemas.base import CamelModel, TenantEntitySchema


class ModelRegistryRead(TenantEntitySchema):
    model_family: str
    version: str
    status: str
    artifact_uri: str
    sha256: str
    metadata_hmac: str
    onnx_opset: int | None = None
    features_schema_json: dict[str, Any]
    metrics_json: dict[str, Any]
    activated_at: datetime | None = None
    created_by: uuid.UUID | None = None


class ModelRegisterRequest(CamelModel):
    model_config = ConfigDict(extra="forbid")

    model_family: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9_\-]+$")
    version: str = Field(min_length=1, max_length=40)
    artifact_uri: str = Field(min_length=8, max_length=1000)
    sha256: str = Field(min_length=64, max_length=64, pattern=r"^[A-Fa-f0-9]{64}$")
    onnx_opset: int | None = Field(default=None, ge=1, le=25)
    features_schema_json: dict[str, Any] = Field(default_factory=dict)
    metrics_json: dict[str, Any] = Field(default_factory=dict)


class ModelActivateResponse(CamelModel):
    model_id: uuid.UUID
    model_family: str
    version: str
    status: str
    activated_at: datetime


class InferenceJobCreateRequest(CamelModel):
    model_config = ConfigDict(extra="forbid")

    model_registry_id: uuid.UUID | None = None
    model_family: str | None = Field(default=None, min_length=2, max_length=80)
    site_code: str | None = Field(default=None, min_length=1, max_length=80)
    date_from: date | None = None
    date_to: date | None = None
    horizon_days: int = Field(default=14, ge=1, le=60)


class InferenceJobRead(TenantEntitySchema):
    model_registry_id: uuid.UUID | None = None
    status: str
    scope_json: dict[str, Any]
    started_at: datetime | None = None
    ended_at: datetime | None = None
    error_code: str | None = None
    error_message_redacted: str | None = None
    rows_in: int
    rows_out: int
    forecast_run_id: uuid.UUID | None = None
    requested_by: uuid.UUID | None = None


class InferenceJobCreateResponse(CamelModel):
    job_id: uuid.UUID
    status: str
