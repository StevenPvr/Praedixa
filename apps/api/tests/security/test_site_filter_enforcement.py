"""Security tests for site-level access control enforcement.

Validates that site-scoped users cannot create/modify data
for sites other than their own. Covers write-path ForbiddenError
guards in canonical, cost_parameters, proof, and organizations routers.
"""

import uuid
from collections.abc import AsyncGenerator
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_current_user,
    get_db_session,
    get_site_filter,
    get_tenant_filter,
)
from app.core.security import SiteFilter, TenantFilter
from app.main import app

ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
SITE_A = "site-lyon"
SITE_B = "site-paris"


def _site_jwt(site_id: str) -> JWTPayload:
    return JWTPayload(
        user_id="site-user-001",
        email="site-user@test.com",
        organization_id=str(ORG_ID),
        role="org_admin",
        site_id=site_id,
    )


@pytest.fixture
async def client_site_a(
    mock_session: AsyncMock,
) -> AsyncGenerator[AsyncClient, None]:
    """Client restricted to SITE_A."""

    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = lambda: _site_jwt(SITE_A)
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_ID))
    app.dependency_overrides[get_site_filter] = lambda: SiteFilter(SITE_A)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    return session


# ── Canonical: site mismatch on create ────────────────────────────


async def test_canonical_create_wrong_site_raises_403(
    client_site_a: AsyncClient,
) -> None:
    """Site-A user creating a record for site-B gets 403."""
    body = {
        "siteId": SITE_B,
        "date": "2026-01-15",
        "shift": "am",
        "capacitePlanH": 100.0,
        "competence": "general",
        "chargeUnits": 80.0,
        "realiseH": 75.0,
        "coutInterneEst": 50.0,
    }
    response = await client_site_a.post("/api/v1/canonical", json=body)
    assert response.status_code == 403


# ── Canonical: bulk import wrong site ─────────────────────────────


async def test_canonical_bulk_import_wrong_site_raises_403(
    client_site_a: AsyncClient,
) -> None:
    """Site-A user bulk-importing records for site-B gets 403."""
    body = {
        "records": [
            {
                "siteId": SITE_B,
                "date": "2026-01-15",
                "shift": "am",
                "capacitePlanH": 100.0,
                "competence": "general",
                "chargeUnits": 80.0,
                "realiseH": 75.0,
                "coutInterneEst": 50.0,
            }
        ]
    }
    response = await client_site_a.post("/api/v1/canonical/bulk", json=body)
    assert response.status_code == 403


# ── Cost Parameters: create wrong site ────────────────────────────


async def test_cost_param_create_wrong_site_raises_403(
    client_site_a: AsyncClient,
) -> None:
    """Site-A user creating cost param for site-B gets 403."""
    body = {
        "cInt": 25.0,
        "majHs": 0.25,
        "cInterim": 35.0,
        "premiumUrgence": 0.1,
        "cBacklog": 50.0,
        "capHsShift": 10,
        "capInterimSite": 20,
        "leadTimeJours": 3,
        "effectiveFrom": "2026-01-01",
        "siteId": SITE_B,
    }
    response = await client_site_a.post("/api/v1/cost-parameters", json=body)
    assert response.status_code == 403


# ── Proof: generate for wrong site ────────────────────────────────


async def test_proof_generate_wrong_site_raises_403(
    client_site_a: AsyncClient,
) -> None:
    """Site-A user generating proof for site-B gets 403."""
    body = {
        "siteId": SITE_B,
        "month": "2026-01-01",
    }
    response = await client_site_a.post("/api/v1/proof/generate", json=body)
    assert response.status_code == 403


# ── Proof: PDF for wrong site ─────────────────────────────────────


async def test_proof_pdf_wrong_site_raises_403(
    client_site_a: AsyncClient,
) -> None:
    """Site-A user generating PDF for site-B gets 403."""
    response = await client_site_a.get(
        f"/api/v1/proof/pdf?site_id={SITE_B}&month=2026-01-01"
    )
    assert response.status_code == 403


# ── Organizations: site-level user sees only their site ───────────


async def test_sites_filtered_for_site_user(
    client_site_a: AsyncClient,
) -> None:
    """Site-scoped user only sees their own site in /sites."""
    from datetime import UTC, datetime

    site_a = SimpleNamespace(
        id=uuid.UUID("aaaaaaaa-1111-1111-1111-111111111111"),
        organization_id=ORG_ID,
        name="Lyon",
        code="LYN",
        address=None,
        timezone="Europe/Paris",
        working_days_config=None,
        headcount=50,
        capacity_units=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    site_b = SimpleNamespace(
        id=uuid.UUID("bbbbbbbb-2222-2222-2222-222222222222"),
        organization_id=ORG_ID,
        name="Paris",
        code="PAR",
        address=None,
        timezone="Europe/Paris",
        working_days_config=None,
        headcount=80,
        capacity_units=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    # Override site_filter to match site_a's UUID string
    app.dependency_overrides[get_site_filter] = lambda: SiteFilter(str(site_a.id))

    with patch(
        "app.routers.organizations.list_sites",
        new_callable=AsyncMock,
        return_value=[site_a, site_b],
    ):
        response = await client_site_a.get("/api/v1/sites")

    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 1
    assert data["data"][0]["name"] == "Lyon"
