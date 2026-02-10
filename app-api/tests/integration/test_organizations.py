"""Integration tests for organization, sites, and departments endpoints."""

import uuid
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient

from tests.integration.conftest import (
    make_mock_department,
    make_mock_org,
    make_mock_site,
)


async def test_get_organization_me_200(client_a: AsyncClient) -> None:
    """GET /api/v1/organizations/me returns the current user's org."""
    org = make_mock_org()

    with patch(
        "app.routers.organizations.get_organization",
        new_callable=AsyncMock,
        return_value=org,
    ):
        response = await client_a.get("/api/v1/organizations/me")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "Test Org"
    assert data["data"]["slug"] == "test-org"
    assert data["data"]["timezone"] == "Europe/Paris"


async def test_get_organization_me_401_no_auth(unauth_client: AsyncClient) -> None:
    """GET /api/v1/organizations/me returns 401 without auth."""
    response = await unauth_client.get("/api/v1/organizations/me")
    assert response.status_code == 401


async def test_list_sites_200(client_a: AsyncClient) -> None:
    """GET /api/v1/sites returns sites for the organization."""
    sites = [make_mock_site(name="Paris Nord"), make_mock_site(name="Lyon Sud")]

    with patch(
        "app.routers.organizations.list_sites",
        new_callable=AsyncMock,
        return_value=sites,
    ):
        response = await client_a.get("/api/v1/sites")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2


async def test_list_sites_401_no_auth(unauth_client: AsyncClient) -> None:
    """GET /api/v1/sites returns 401 without auth."""
    response = await unauth_client.get("/api/v1/sites")
    assert response.status_code == 401


async def test_list_departments_200(client_a: AsyncClient) -> None:
    """GET /api/v1/departments returns departments."""
    depts = [
        make_mock_department(name="Expédition"),
        make_mock_department(name="Réception"),
    ]

    with patch(
        "app.routers.organizations.list_departments",
        new_callable=AsyncMock,
        return_value=depts,
    ):
        response = await client_a.get("/api/v1/departments")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2


async def test_list_departments_with_site_filter(client_a: AsyncClient) -> None:
    """GET /api/v1/departments?site_id=... filters by site."""
    site_id = uuid.uuid4()
    depts = [make_mock_department(name="Expédition", site_id=site_id)]

    with patch(
        "app.routers.organizations.list_departments",
        new_callable=AsyncMock,
        return_value=depts,
    ) as mock_fn:
        response = await client_a.get(f"/api/v1/departments?site_id={site_id}")

    assert response.status_code == 200
    call_kwargs = mock_fn.call_args
    assert call_kwargs.kwargs["site_id"] == site_id


async def test_list_departments_401_no_auth(unauth_client: AsyncClient) -> None:
    """GET /api/v1/departments returns 401 without auth."""
    response = await unauth_client.get("/api/v1/departments")
    assert response.status_code == 401
