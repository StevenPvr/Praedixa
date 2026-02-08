"""Tests for app.services.admin_orgs — admin organization management."""

import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.core.exceptions import ConflictError, NotFoundError
from app.models.organization import (
    IndustrySector,
    OrganizationSize,
    OrganizationStatus,
    SubscriptionPlan,
)
from app.services.admin_orgs import (
    _STATUS_TRANSITIONS,
    change_org_status,
    create_organization,
    get_org_counts,
    get_org_hierarchy,
    get_organization,
    list_organizations,
    update_organization,
)
from tests.unit.conftest import (
    make_all_result,
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)


def _make_org(**overrides):
    defaults = {
        "id": uuid.uuid4(),
        "name": "Test Org",
        "slug": "test-org",
        "legal_name": None,
        "siret": None,
        "sector": IndustrySector.LOGISTICS,
        "size": OrganizationSize.MEDIUM,
        "headcount": 100,
        "status": OrganizationStatus.ACTIVE,
        "plan": SubscriptionPlan.STARTER,
        "timezone": "Europe/Paris",
        "locale": "fr-FR",
        "currency": "EUR",
        "contact_email": "test@example.com",
        "logo_url": None,
        "settings": {},
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class TestStatusTransitions:
    """Tests for the org status transition map."""

    def test_trial_can_go_to_active(self):
        assert "active" in _STATUS_TRANSITIONS["trial"]

    def test_trial_can_go_to_suspended(self):
        assert "suspended" in _STATUS_TRANSITIONS["trial"]

    def test_trial_can_go_to_churned(self):
        assert "churned" in _STATUS_TRANSITIONS["trial"]

    def test_active_can_go_to_suspended(self):
        assert "suspended" in _STATUS_TRANSITIONS["active"]

    def test_active_can_go_to_churned(self):
        assert "churned" in _STATUS_TRANSITIONS["active"]

    def test_suspended_can_go_to_active(self):
        assert "active" in _STATUS_TRANSITIONS["suspended"]

    def test_churned_is_terminal(self):
        assert _STATUS_TRANSITIONS["churned"] == set()


class TestListOrganizations:
    """Tests for list_organizations()."""

    @pytest.mark.asyncio
    async def test_basic_list(self):
        org = _make_org()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([org]),
        )
        items, total = await list_organizations(session)
        assert total == 1
        assert len(items) == 1

    @pytest.mark.asyncio
    async def test_pagination(self):
        session = make_mock_session(
            make_scalar_result(50),
            make_scalars_result([]),
        )
        _, total = await list_organizations(session, page=3, page_size=10)
        assert total == 50

    @pytest.mark.asyncio
    async def test_search_filter(self):
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        _, total = await list_organizations(session, search="test")
        assert total == 0

    @pytest.mark.asyncio
    async def test_status_filter(self):
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        _, total = await list_organizations(
            session, status_filter=OrganizationStatus.ACTIVE
        )
        assert total == 0

    @pytest.mark.asyncio
    async def test_plan_filter(self):
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        _, total = await list_organizations(
            session, plan_filter=SubscriptionPlan.ENTERPRISE
        )
        assert total == 0

    @pytest.mark.asyncio
    async def test_sector_filter(self):
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        _, total = await list_organizations(
            session, sector_filter=IndustrySector.HEALTHCARE
        )
        assert total == 0


class TestGetOrganization:
    """Tests for get_organization()."""

    @pytest.mark.asyncio
    async def test_found(self):
        org = _make_org()
        session = make_mock_session(make_scalar_result(org))
        result = await get_organization(session, org.id)
        assert result.slug == "test-org"

    @pytest.mark.asyncio
    async def test_not_found(self):
        session = make_mock_session(make_scalar_result(None))
        with pytest.raises(NotFoundError):
            await get_organization(session, uuid.uuid4())


class TestCreateOrganization:
    """Tests for create_organization()."""

    @pytest.mark.asyncio
    async def test_success(self):
        session = make_mock_session(make_scalar_result(None))  # slug check

        await create_organization(
            session,
            name="New Org",
            slug="new-org",
            contact_email="admin@neworg.com",
        )
        session.add.assert_called_once()
        session.flush.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_slug_conflict(self):
        session = make_mock_session(
            make_scalar_result(uuid.uuid4())  # slug exists
        )
        with pytest.raises(ConflictError, match="slug"):
            await create_organization(
                session,
                name="Dup",
                slug="existing",
                contact_email="dup@test.com",
            )


class TestUpdateOrganization:
    """Tests for update_organization()."""

    @pytest.mark.asyncio
    async def test_partial_update(self):
        org = _make_org()
        session = make_mock_session(
            make_scalar_result(org),  # get_organization
            make_scalar_result(None),  # UPDATE execute
        )

        await update_organization(session, org.id, data={"name": "Updated"})
        # Session.execute called for get + update
        assert session.execute.call_count == 2

    @pytest.mark.asyncio
    async def test_non_text_field_update(self):
        """Updating a non-text field (else branch) stores value directly."""
        org = _make_org()
        session = make_mock_session(
            make_scalar_result(org),  # get_organization
            make_scalar_result(None),  # UPDATE execute
        )

        result = await update_organization(session, org.id, data={"headcount": 200})
        assert result.headcount == 200

    @pytest.mark.asyncio
    async def test_empty_data_returns_org(self):
        org = _make_org()
        session = make_mock_session(make_scalar_result(org))

        result = await update_organization(session, org.id, data={"name": None})
        assert result.name == "Test Org"

    @pytest.mark.asyncio
    async def test_not_found(self):
        session = make_mock_session(make_scalar_result(None))
        with pytest.raises(NotFoundError):
            await update_organization(session, uuid.uuid4(), data={"name": "X"})


class TestChangeOrgStatus:
    """Tests for change_org_status()."""

    @pytest.mark.asyncio
    async def test_valid_transition_trial_to_active(self):
        org = _make_org(status=OrganizationStatus.TRIAL)
        session = make_mock_session(
            make_scalar_result(org),  # get_organization
            make_scalar_result(None),  # UPDATE execute
        )

        result = await change_org_status(session, org.id, OrganizationStatus.ACTIVE)
        assert result.status == OrganizationStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_valid_transition_active_to_suspended(self):
        org = _make_org(status=OrganizationStatus.ACTIVE)
        session = make_mock_session(
            make_scalar_result(org),  # get_organization
            make_scalar_result(None),  # UPDATE execute
        )

        result = await change_org_status(session, org.id, OrganizationStatus.SUSPENDED)
        assert result.status == OrganizationStatus.SUSPENDED

    @pytest.mark.asyncio
    async def test_invalid_transition_churned_to_active(self):
        org = _make_org(status=OrganizationStatus.CHURNED)
        session = make_mock_session(make_scalar_result(org))

        with pytest.raises(ConflictError, match="Cannot transition"):
            await change_org_status(session, org.id, OrganizationStatus.ACTIVE)

    @pytest.mark.asyncio
    async def test_invalid_transition_active_to_trial(self):
        org = _make_org(status=OrganizationStatus.ACTIVE)
        session = make_mock_session(make_scalar_result(org))

        with pytest.raises(ConflictError, match="Cannot transition"):
            await change_org_status(session, org.id, OrganizationStatus.TRIAL)

    @pytest.mark.asyncio
    async def test_not_found(self):
        session = make_mock_session(make_scalar_result(None))
        with pytest.raises(NotFoundError):
            await change_org_status(session, uuid.uuid4(), OrganizationStatus.ACTIVE)


class TestGetOrgCounts:
    """Tests for get_org_counts()."""

    @pytest.mark.asyncio
    async def test_returns_counts(self):
        counts_result = MagicMock()
        counts_result.one.return_value = (5, 2, 10, 3)
        session = make_mock_session(counts_result)
        counts = await get_org_counts(session, uuid.uuid4())
        assert counts["user_count"] == 5
        assert counts["site_count"] == 2
        assert counts["department_count"] == 10
        assert counts["dataset_count"] == 3


class TestGetOrgHierarchy:
    """Tests for get_org_hierarchy()."""

    @pytest.mark.asyncio
    async def test_returns_tree(self):
        org_id = uuid.uuid4()
        site = SimpleNamespace(id=uuid.uuid4(), name="Paris HQ", city="Paris")
        dept = SimpleNamespace(
            id=uuid.uuid4(),
            name="Logistics",
            organization_id=org_id,
            site_id=site.id,
        )

        session = make_mock_session(
            make_scalar_result(SimpleNamespace(id=org_id)),  # org exists
            make_scalars_result([site]),  # sites
            make_scalars_result([dept]),  # all departments in org
            make_all_result([(dept.id, 25)]),  # employee counts by dept
        )

        hierarchy = await get_org_hierarchy(session, org_id)
        assert len(hierarchy) == 1
        assert hierarchy[0]["name"] == "Paris HQ"
        assert len(hierarchy[0]["departments"]) == 1
        assert hierarchy[0]["departments"][0]["employee_count"] == 25

    @pytest.mark.asyncio
    async def test_org_not_found(self):
        session = make_mock_session(make_scalar_result(None))
        with pytest.raises(NotFoundError):
            await get_org_hierarchy(session, uuid.uuid4())
