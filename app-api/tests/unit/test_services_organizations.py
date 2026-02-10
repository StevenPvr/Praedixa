"""Tests for app.services.organizations — org, sites, departments."""

import uuid
from types import SimpleNamespace

import pytest

from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter
from app.services.organizations import get_organization, list_departments, list_sites
from tests.unit.conftest import (
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)


class TestGetOrganization:
    """Test get_organization service function."""

    @pytest.mark.asyncio
    async def test_found(self) -> None:
        org_id = uuid.uuid4()
        org = SimpleNamespace(id=org_id, name="Test Org", slug="test-org")
        session = make_mock_session(make_scalar_result(org))

        result = await get_organization(org_id, session)
        assert result.name == "Test Org"

    @pytest.mark.asyncio
    async def test_not_found_raises(self) -> None:
        org_id = uuid.uuid4()
        session = make_mock_session(make_scalar_result(None))

        with pytest.raises(NotFoundError) as exc_info:
            await get_organization(org_id, session)
        assert exc_info.value.status_code == 404
        assert "Organization" in exc_info.value.message


class TestListSites:
    """Test list_sites service function."""

    @pytest.mark.asyncio
    async def test_returns_sites(self) -> None:
        tenant = TenantFilter("org-1")
        sites = [
            SimpleNamespace(id=uuid.uuid4(), name="Site A"),
            SimpleNamespace(id=uuid.uuid4(), name="Site B"),
        ]
        session = make_mock_session(make_scalars_result(sites))

        result = await list_sites(tenant, session)
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_empty_sites(self) -> None:
        tenant = TenantFilter("org-1")
        session = make_mock_session(make_scalars_result([]))

        result = await list_sites(tenant, session)
        assert result == []


class TestListDepartments:
    """Test list_departments service function."""

    @pytest.mark.asyncio
    async def test_all_departments(self) -> None:
        tenant = TenantFilter("org-1")
        depts = [SimpleNamespace(id=uuid.uuid4(), name="Dept A")]
        session = make_mock_session(make_scalars_result(depts))

        result = await list_departments(tenant, session)
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_filter_by_site_id(self) -> None:
        tenant = TenantFilter("org-1")
        site_id = uuid.uuid4()
        depts = [SimpleNamespace(id=uuid.uuid4(), name="Dept B")]

        session = make_mock_session(
            make_scalar_result(site_id),  # site exists check
            make_scalars_result(depts),  # departments
        )

        result = await list_departments(tenant, session, site_id=site_id)
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_site_not_found_raises(self) -> None:
        tenant = TenantFilter("org-1")
        site_id = uuid.uuid4()

        session = make_mock_session(make_scalar_result(None))  # site not found

        with pytest.raises(NotFoundError) as exc_info:
            await list_departments(tenant, session, site_id=site_id)
        assert "Site" in exc_info.value.message

    @pytest.mark.asyncio
    async def test_no_site_filter_no_site_check(self) -> None:
        """Without site_id, no site existence check should happen."""
        tenant = TenantFilter("org-1")
        session = make_mock_session(make_scalars_result([]))

        await list_departments(tenant, session)
        # Only 1 execute call (department query), no site check
        assert session.execute.call_count == 1

    @pytest.mark.asyncio
    async def test_empty_departments(self) -> None:
        tenant = TenantFilter("org-1")
        session = make_mock_session(make_scalars_result([]))

        result = await list_departments(tenant, session)
        assert result == []
