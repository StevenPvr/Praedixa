from __future__ import annotations

import pytest
from pydantic import ValidationError
from sqlalchemy import column, select, table

from app.core.exceptions import NotFoundError
from app.core.security import SiteFilter, TenantFilter
from app.schemas.mlops import InferenceJobCreateRequest, ModelRegisterRequest


def test_not_found_error_redacts_non_uuid_identifier() -> None:
    error = NotFoundError("dataset", "external-ref")
    assert error.code == "NOT_FOUND"
    assert error.details == {"resource": "dataset"}


def test_not_found_error_keeps_uuid_identifier() -> None:
    error = NotFoundError("dataset", "67b8f5d7-63a5-4f2e-a371-fd8d5e5e74ff")
    assert error.details == {
        "resource": "dataset",
        "id": "67b8f5d7-63a5-4f2e-a371-fd8d5e5e74ff",
    }


def test_tenant_filter_adds_organization_constraint() -> None:
    data = table("dataset", column("organization_id"), column("site_id"))
    model = type(
        "Model",
        (),
        {
            "organization_id": data.c.organization_id,
            "site_id": data.c.site_id,
        },
    )
    statement = TenantFilter("org-1").apply(select(data), model)
    sql = str(statement)
    assert "organization_id" in sql
    assert "WHERE" in sql


def test_site_filter_is_noop_without_site_id() -> None:
    data = table("dataset", column("organization_id"), column("site_id"))
    statement = select(data)
    filtered = SiteFilter(None).apply(statement, data)
    assert str(filtered) == str(statement)


def test_inference_job_schema_validates_horizon_bounds() -> None:
    with pytest.raises(ValidationError):
        InferenceJobCreateRequest(horizon_days=60)

    parsed = InferenceJobCreateRequest(horizon_days=7)
    assert parsed.horizon_days == 7


def test_model_register_request_forbids_extra_fields() -> None:
    payload = {
        "model_family": "xgboost",
        "version": "v1.0.0",
        "artifact_uri": "s3://models/xgboost/v1",
        "sha256": "abc123",
        "unexpected": "field",
    }
    with pytest.raises(ValidationError):
        ModelRegisterRequest(**payload)
