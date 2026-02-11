"""Integration tests for GET /api/v1/datasets/{id}/quality-reports endpoint.

Covers:
- Successful listing with pagination metadata
- Empty report list
- Pagination params (page, pageSize)
- Dataset not found -> 404

Strategy:
  Mock get_quality_reports at the router import level to test only the HTTP
  contract (offset calculation, PaginatedResponse shape, model_validate).
"""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.exceptions import NotFoundError
from app.core.rate_limit import limiter
from app.core.security import TenantFilter
from app.main import app

ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
USER_ID = "user-admin-001"
DATASET_ID = uuid.UUID("dddddddd-0000-0000-0000-000000000001")
REPORT_ID = uuid.UUID("eeeeeeee-0000-0000-0000-000000000001")
INGESTION_LOG_ID = uuid.UUID("ffffffff-0000-0000-0000-000000000001")
BASE_URL = f"/api/v1/datasets/{DATASET_ID}/quality-reports"


def _jwt() -> JWTPayload:
    return JWTPayload(
        user_id=USER_ID,
        email="admin@test.com",
        organization_id=str(ORG_ID),
        role="org_admin",
    )


def _make_report(**overrides) -> SimpleNamespace:
    defaults = {
        "id": REPORT_ID,
        "dataset_id": DATASET_ID,
        "ingestion_log_id": INGESTION_LOG_ID,
        "rows_received": 100,
        "rows_after_dedup": 95,
        "rows_after_quality": 90,
        "duplicates_found": 5,
        "missing_values_found": 3,
        "missing_values_imputed": 2,
        "outliers_found": 4,
        "outliers_clamped": 4,
        "column_details": {"col_a": {"missing": 1}},
        "strategy_config": {"outlier_method": "iqr"},
        "created_at": datetime(2026, 1, 15, 10, 0, 0, tzinfo=UTC),
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


@pytest.fixture
async def client():
    mock_session = AsyncMock()

    async def _override_session():
        yield mock_session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = _jwt
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_ID))

    limiter.enabled = False

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    limiter.enabled = True
    app.dependency_overrides.clear()


@pytest.mark.asyncio
class TestListQualityReports:
    """Integration tests for GET /datasets/{id}/quality-reports."""

    @patch("app.routers.datasets_crud.get_quality_reports")
    async def test_returns_paginated_reports(self, mock_qr, client) -> None:
        report = _make_report()
        mock_qr.return_value = ([report], 1)

        resp = await client.get(BASE_URL)

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 1
        assert body["data"][0]["id"] == str(REPORT_ID)
        assert body["data"][0]["rowsReceived"] == 100
        assert body["pagination"]["total"] == 1
        assert body["pagination"]["page"] == 1
        assert body["pagination"]["totalPages"] == 1
        assert body["pagination"]["hasNextPage"] is False
        assert body["pagination"]["hasPreviousPage"] is False

    @patch("app.routers.datasets_crud.get_quality_reports")
    async def test_empty_list(self, mock_qr, client) -> None:
        mock_qr.return_value = ([], 0)

        resp = await client.get(BASE_URL)

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["pagination"]["total"] == 0
        assert body["pagination"]["totalPages"] == 1

    @patch("app.routers.datasets_crud.get_quality_reports")
    async def test_pagination_params_forwarded(self, mock_qr, client) -> None:
        mock_qr.return_value = ([], 25)

        resp = await client.get(BASE_URL, params={"page": 3, "pageSize": 5})

        assert resp.status_code == 200
        call_kwargs = mock_qr.call_args
        assert call_kwargs.kwargs["offset"] == 10
        assert call_kwargs.kwargs["limit"] == 5

        body = resp.json()
        assert body["pagination"]["page"] == 3
        assert body["pagination"]["pageSize"] == 5
        assert body["pagination"]["totalPages"] == 5
        assert body["pagination"]["hasNextPage"] is True
        assert body["pagination"]["hasPreviousPage"] is True

    @patch("app.routers.datasets_crud.get_quality_reports")
    async def test_dataset_not_found_returns_404(self, mock_qr, client) -> None:
        mock_qr.side_effect = NotFoundError("Dataset", str(DATASET_ID))

        resp = await client.get(BASE_URL)

        assert resp.status_code == 404
