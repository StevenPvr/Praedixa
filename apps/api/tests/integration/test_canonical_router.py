"""Integration tests for canonical records router.

Tests cover:
- GET /api/v1/canonical — list records (paginated, with filters)
- GET /api/v1/canonical/quality — quality dashboard
- GET /api/v1/canonical/{record_id} — get single record
- POST /api/v1/canonical — create single record (role check)
- POST /api/v1/canonical/bulk — bulk import (role check)
- 401 unauthenticated / 403 insufficient role
"""

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.main import app

# ── Helper factories ──────────────────────────────────────────────
from tests.unit.conftest import (
    _make_canonical_record,
)

from .conftest import ORG_A_ID

# ── GET /api/v1/canonical ─────────────────────────────────────────


async def test_list_canonical_records_200(client_a: AsyncClient) -> None:
    """GET /api/v1/canonical returns paginated records."""
    records = [_make_canonical_record(), _make_canonical_record()]

    with patch(
        "app.routers.canonical.list_canonical_records",
        new_callable=AsyncMock,
        return_value=(records, 2),
    ):
        response = await client_a.get("/api/v1/canonical")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2
    assert data["pagination"]["total"] == 2
    assert data["pagination"]["page"] == 1


async def test_list_canonical_records_empty(client_a: AsyncClient) -> None:
    """GET /api/v1/canonical returns empty list with correct pagination."""
    with patch(
        "app.routers.canonical.list_canonical_records",
        new_callable=AsyncMock,
        return_value=([], 0),
    ):
        response = await client_a.get("/api/v1/canonical")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == []
    assert data["pagination"]["total"] == 0
    assert data["pagination"]["totalPages"] == 1


async def test_list_canonical_records_with_filters(client_a: AsyncClient) -> None:
    """GET /api/v1/canonical?site_id=site-paris&date_from=2026-01-01 applies filters."""
    records = [_make_canonical_record()]

    with patch(
        "app.routers.canonical.list_canonical_records",
        new_callable=AsyncMock,
        return_value=(records, 1),
    ) as mock_list:
        response = await client_a.get(
            "/api/v1/canonical?site_id=site-paris&date_from=2026-01-01&date_to=2026-01-31&shift=am"
        )

    assert response.status_code == 200
    mock_list.assert_called_once()
    call_kwargs = mock_list.call_args.kwargs
    assert call_kwargs["site_id"] == "site-paris"
    assert call_kwargs["date_from"] == date(2026, 1, 1)
    assert call_kwargs["date_to"] == date(2026, 1, 31)


async def test_list_canonical_records_pagination(client_a: AsyncClient) -> None:
    """GET /api/v1/canonical?page=2&page_size=5 handles pagination."""
    records = [_make_canonical_record()]

    with patch(
        "app.routers.canonical.list_canonical_records",
        new_callable=AsyncMock,
        return_value=(records, 6),
    ):
        response = await client_a.get("/api/v1/canonical?page=2&page_size=5")

    assert response.status_code == 200
    data = response.json()
    assert data["pagination"]["page"] == 2
    assert data["pagination"]["pageSize"] == 5
    assert data["pagination"]["totalPages"] == 2
    assert data["pagination"]["hasPreviousPage"] is True
    assert data["pagination"]["hasNextPage"] is False


async def test_list_canonical_records_401(unauth_client: AsyncClient) -> None:
    """GET /api/v1/canonical returns 401 without auth."""
    response = await unauth_client.get("/api/v1/canonical")
    assert response.status_code == 401


# ── GET /api/v1/canonical/quality ─────────────────────────────────


async def test_quality_dashboard_200(client_a: AsyncClient) -> None:
    """GET /api/v1/canonical/quality returns quality dashboard."""
    from types import SimpleNamespace

    dashboard = SimpleNamespace(
        total_records=100,
        coverage_pct=Decimal("0.95"),
        sites=3,
        date_range=["2026-01-01", "2026-01-31"],
        missing_shifts_pct=Decimal("0.05"),
        avg_abs_pct=Decimal("0.08"),
    )

    with patch(
        "app.routers.canonical.get_quality_dashboard",
        new_callable=AsyncMock,
        return_value=dashboard,
    ):
        response = await client_a.get("/api/v1/canonical/quality")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["totalRecords"] == 100
    assert data["data"]["sites"] == 3


# ── GET /api/v1/canonical/{record_id} ────────────────────────────


async def test_get_canonical_record_200(client_a: AsyncClient) -> None:
    """GET /api/v1/canonical/{id} returns single record."""
    record_id = uuid.uuid4()
    record = _make_canonical_record(id=record_id)

    with patch(
        "app.routers.canonical.get_canonical_record",
        new_callable=AsyncMock,
        return_value=record,
    ):
        response = await client_a.get(f"/api/v1/canonical/{record_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == str(record_id)


# ── POST /api/v1/canonical ────────────────────────────────────────


async def test_create_canonical_record_201(client_a: AsyncClient) -> None:
    """POST /api/v1/canonical creates a record."""
    record = _make_canonical_record()

    with patch(
        "app.routers.canonical.create_canonical_record",
        new_callable=AsyncMock,
        return_value=record,
    ):
        response = await client_a.post(
            "/api/v1/canonical",
            json={
                "siteId": "site-paris",
                "date": "2026-01-15",
                "shift": "am",
                "competence": "infirmier",
                "chargeUnits": "120.00",
                "capacitePlanH": "100.00",
                "realiseH": "92.00",
                "absH": "8.00",
                "hsH": "4.00",
                "interimH": "2.00",
                "coutInterneEst": "3500.00",
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True


async def test_create_canonical_record_defaults(client_a: AsyncClient) -> None:
    """POST /api/v1/canonical uses defaults for optional fields."""
    record = _make_canonical_record()

    with patch(
        "app.routers.canonical.create_canonical_record",
        new_callable=AsyncMock,
        return_value=record,
    ) as mock_create:
        response = await client_a.post(
            "/api/v1/canonical",
            json={
                "siteId": "site-paris",
                "date": "2026-01-15",
                "shift": "am",
                "capacitePlanH": "100.00",
            },
        )

    assert response.status_code == 201
    # Verify defaults are applied for abs_h, hs_h, interim_h
    call_kwargs = mock_create.call_args.kwargs
    assert call_kwargs["abs_h"] == 0
    assert call_kwargs["hs_h"] == 0
    assert call_kwargs["interim_h"] == 0


async def test_create_canonical_record_403_viewer(mock_session: AsyncMock) -> None:
    """POST /api/v1/canonical returns 403 for viewer role."""
    from collections.abc import AsyncGenerator

    viewer_jwt = JWTPayload(
        user_id="viewer-001",
        email="viewer@test.com",
        organization_id=str(ORG_A_ID),
        role="viewer",
    )

    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = lambda: viewer_jwt
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/canonical",
            json={
                "siteId": "site-paris",
                "date": "2026-01-15",
                "shift": "am",
                "capacitePlanH": "100.00",
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


# ── POST /api/v1/canonical/bulk ───────────────────────────────────


async def test_bulk_import_201(client_a: AsyncClient) -> None:
    """POST /api/v1/canonical/bulk imports records."""
    with patch(
        "app.routers.canonical.bulk_import_canonical",
        new_callable=AsyncMock,
        return_value=(5, 2),
    ):
        response = await client_a.post(
            "/api/v1/canonical/bulk",
            json={
                "records": [
                    {
                        "siteId": f"site-{i}",
                        "date": f"2026-01-{i + 1:02d}",
                        "shift": "am",
                        "capacitePlanH": "100.00",
                    }
                    for i in range(7)
                ],
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["inserted"] == 5
    assert data["data"]["skipped"] == 2


async def test_bulk_import_403_manager(mock_session: AsyncMock) -> None:
    """POST /api/v1/canonical/bulk returns 403 for manager role (requires org_admin)."""
    from collections.abc import AsyncGenerator

    manager_jwt = JWTPayload(
        user_id="manager-001",
        email="manager@test.com",
        organization_id=str(ORG_A_ID),
        role="manager",
    )

    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = lambda: manager_jwt
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/canonical/bulk",
            json={
                "records": [
                    {
                        "siteId": "site-paris",
                        "date": "2026-01-15",
                        "shift": "am",
                        "capacitePlanH": "100.00",
                    }
                ],
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403
