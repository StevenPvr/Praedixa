"""Integration tests for proof-of-value router.

Tests cover:
- GET /api/v1/proof — list proof records (paginated)
- GET /api/v1/proof/summary — proof summary
- POST /api/v1/proof/generate — generate proof record (role check)
- GET /api/v1/proof/pdf — generate and stream PDF
- 401 unauthenticated / 403 insufficient role
"""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.main import app
from app.models.operational import ShiftType

from .conftest import ORG_A_ID
from tests.unit.conftest import _make_proof_record


# ── GET /api/v1/proof ─────────────────────────────────────────────


async def test_list_proof_records_200(client_a: AsyncClient) -> None:
    """GET /api/v1/proof returns paginated proof records."""
    records = [_make_proof_record(), _make_proof_record()]

    with patch(
        "app.routers.proof.list_proof_records",
        new_callable=AsyncMock,
        return_value=(records, 2),
    ):
        response = await client_a.get("/api/v1/proof")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2
    assert data["pagination"]["total"] == 2
    assert data["pagination"]["page"] == 1


async def test_list_proof_records_empty(client_a: AsyncClient) -> None:
    """GET /api/v1/proof returns empty list."""
    with patch(
        "app.routers.proof.list_proof_records",
        new_callable=AsyncMock,
        return_value=([], 0),
    ):
        response = await client_a.get("/api/v1/proof")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == []
    assert data["pagination"]["total"] == 0
    assert data["pagination"]["totalPages"] == 1


async def test_list_proof_records_with_site_filter(client_a: AsyncClient) -> None:
    """GET /api/v1/proof?site_id=site-paris filters by site."""
    records = [_make_proof_record()]

    with patch(
        "app.routers.proof.list_proof_records",
        new_callable=AsyncMock,
        return_value=(records, 1),
    ) as mock_list:
        response = await client_a.get("/api/v1/proof?site_id=site-paris")

    assert response.status_code == 200
    mock_list.assert_called_once()
    call_kwargs = mock_list.call_args.kwargs
    assert call_kwargs["site_id"] == "site-paris"


async def test_list_proof_records_pagination(client_a: AsyncClient) -> None:
    """GET /api/v1/proof?page=2&page_size=5 handles pagination."""
    records = [_make_proof_record()]

    with patch(
        "app.routers.proof.list_proof_records",
        new_callable=AsyncMock,
        return_value=(records, 6),
    ):
        response = await client_a.get("/api/v1/proof?page=2&page_size=5")

    assert response.status_code == 200
    data = response.json()
    assert data["pagination"]["page"] == 2
    assert data["pagination"]["pageSize"] == 5
    assert data["pagination"]["totalPages"] == 2
    assert data["pagination"]["hasPreviousPage"] is True
    assert data["pagination"]["hasNextPage"] is False


async def test_list_proof_records_401(unauth_client: AsyncClient) -> None:
    """GET /api/v1/proof returns 401 without auth."""
    response = await unauth_client.get("/api/v1/proof")
    assert response.status_code == 401


# ── GET /api/v1/proof/summary ─────────────────────────────────────


async def test_proof_summary_200(client_a: AsyncClient) -> None:
    """GET /api/v1/proof/summary returns aggregated summary."""
    summary = {
        "total_gain_net_eur": Decimal("5000.00"),
        "avg_adoption_pct": Decimal("0.85"),
        "total_alertes_emises": 20,
        "total_alertes_traitees": 18,
        "records": [],
    }

    with patch(
        "app.routers.proof.get_proof_summary",
        new_callable=AsyncMock,
        return_value=summary,
    ):
        response = await client_a.get("/api/v1/proof/summary")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


async def test_proof_summary_with_dates(client_a: AsyncClient) -> None:
    """GET /api/v1/proof/summary?date_from=...&date_to=... passes date filters."""
    summary = {
        "total_gain_net_eur": Decimal("3000.00"),
        "avg_adoption_pct": None,
        "total_alertes_emises": 10,
        "total_alertes_traitees": 8,
        "records": [],
    }

    with patch(
        "app.routers.proof.get_proof_summary",
        new_callable=AsyncMock,
        return_value=summary,
    ) as mock_summary:
        response = await client_a.get(
            "/api/v1/proof/summary?date_from=2026-01-01&date_to=2026-01-31"
        )

    assert response.status_code == 200
    call_kwargs = mock_summary.call_args.kwargs
    assert call_kwargs["date_from"] == date(2026, 1, 1)
    assert call_kwargs["date_to"] == date(2026, 1, 31)


# ── POST /api/v1/proof/generate ───────────────────────────────────


async def test_generate_proof_201(client_a: AsyncClient) -> None:
    """POST /api/v1/proof/generate creates a proof record."""
    record = _make_proof_record()

    with patch(
        "app.routers.proof.generate_proof_record",
        new_callable=AsyncMock,
        return_value=record,
    ):
        response = await client_a.post(
            "/api/v1/proof/generate",
            json={
                "siteId": "site-paris",
                "month": "2026-01-01",
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True


async def test_generate_proof_403_viewer(mock_session: AsyncMock) -> None:
    """POST /api/v1/proof/generate returns 403 for viewer role."""
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
            "/api/v1/proof/generate",
            json={
                "siteId": "site-paris",
                "month": "2026-01-01",
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


# ── GET /api/v1/proof/pdf ─────────────────────────────────────────


def _make_mock_decision_orm(**overrides):
    """Create a mock OperationalDecision for the PDF endpoint."""
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001"),
        "site_id": "site-paris",
        "decision_date": date(2026, 1, 15),
        "shift": ShiftType.AM,
        "gap_h": Decimal("12.00"),
        "cout_observe_eur": Decimal("525.00"),
        "is_override": False,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


async def test_generate_pdf_200(
    client_a: AsyncClient, mock_session: AsyncMock
) -> None:
    """GET /api/v1/proof/pdf returns PDF streaming response."""
    record = _make_proof_record()
    decisions_orm = [_make_mock_decision_orm()]

    # Mock the proof record generation
    with (
        patch(
            "app.routers.proof.generate_proof_record",
            new_callable=AsyncMock,
            return_value=record,
        ),
        patch(
            "app.routers.proof.generate_proof_pack_pdf",
            return_value=b"%PDF-1.4 fake pdf content",
        ),
    ):
        # Mock session.execute for the decisions query
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = decisions_orm
        result_mock = MagicMock()
        result_mock.scalars.return_value = scalars_mock
        mock_session.execute.return_value = result_mock

        response = await client_a.get(
            "/api/v1/proof/pdf?site_id=site-paris&month=2026-01-15"
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers["content-disposition"]
    assert "proof-pack-site-paris-2026-01" in response.headers["content-disposition"]


async def test_generate_pdf_december_month(
    client_a: AsyncClient, mock_session: AsyncMock
) -> None:
    """GET /api/v1/proof/pdf handles December month boundary correctly."""
    record = _make_proof_record(month=date(2025, 12, 1))

    with (
        patch(
            "app.routers.proof.generate_proof_record",
            new_callable=AsyncMock,
            return_value=record,
        ),
        patch(
            "app.routers.proof.generate_proof_pack_pdf",
            return_value=b"%PDF-1.4 fake pdf content",
        ),
    ):
        # Mock session.execute for the decisions query
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []
        result_mock = MagicMock()
        result_mock.scalars.return_value = scalars_mock
        mock_session.execute.return_value = result_mock

        response = await client_a.get(
            "/api/v1/proof/pdf?site_id=site-paris&month=2025-12-15"
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"


async def test_generate_pdf_no_decisions(
    client_a: AsyncClient, mock_session: AsyncMock
) -> None:
    """GET /api/v1/proof/pdf works with no decisions for the month."""
    record = _make_proof_record()

    with (
        patch(
            "app.routers.proof.generate_proof_record",
            new_callable=AsyncMock,
            return_value=record,
        ),
        patch(
            "app.routers.proof.generate_proof_pack_pdf",
            return_value=b"%PDF-1.4 fake",
        ),
    ):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []
        result_mock = MagicMock()
        result_mock.scalars.return_value = scalars_mock
        mock_session.execute.return_value = result_mock

        response = await client_a.get(
            "/api/v1/proof/pdf?site_id=site-paris&month=2026-01-15"
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
