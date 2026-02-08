"""Tests for app.services.admin_onboarding — multi-step onboarding wizard."""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import ConflictError, NotFoundError
from app.models.admin import OnboardingStatus
from app.models.organization import IndustrySector, SubscriptionPlan
from app.services.admin_onboarding import (
    _MAX_STEP,
    complete_step,
    create_onboarding,
    get_onboarding,
    list_onboardings,
)
from tests.unit.conftest import (
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)


def _make_onboarding(**overrides):
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": uuid.uuid4(),
        "initiated_by": uuid.uuid4(),
        "status": OnboardingStatus.IN_PROGRESS,
        "current_step": 1,
        "steps_completed": [{"step": 1, "completed_at": "2026-02-07T00:00:00+00:00"}],
        "completed_at": None,
        "created_at": datetime(2026, 2, 7, tzinfo=UTC),
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class TestMaxStep:
    """Tests for _MAX_STEP constant."""

    def test_max_step_is_five(self):
        assert _MAX_STEP == 5


class TestCreateOnboarding:
    """Tests for create_onboarding()."""

    @pytest.mark.asyncio
    async def test_success(self):
        session = make_mock_session(
            make_scalar_result(None),  # slug check
        )
        # Mock flush to assign UUIDs to added objects
        org_id = uuid.uuid4()
        flush_call_count = 0

        async def _assign_ids():
            nonlocal flush_call_count
            flush_call_count += 1
            if flush_call_count == 1:
                # First flush: org gets an id
                added_obj = session.add.call_args_list[0][0][0]
                added_obj.id = org_id
            # Second flush: onboarding already has its id from constructor

        session.flush = AsyncMock(side_effect=_assign_ids)

        await create_onboarding(
            session,
            org_name="New Company",
            org_slug="new-company",
            contact_email="admin@company.com",
            initiated_by=str(uuid.uuid4()),
        )
        assert session.add.call_count == 2  # org + onboarding
        assert flush_call_count == 2

    @pytest.mark.asyncio
    async def test_slug_conflict_raises(self):
        session = make_mock_session(
            make_scalar_result(uuid.uuid4()),  # slug exists
        )
        with pytest.raises(ConflictError, match="slug"):
            await create_onboarding(
                session,
                org_name="Dup",
                org_slug="existing-slug",
                contact_email="dup@test.com",
                initiated_by=str(uuid.uuid4()),
            )

    @pytest.mark.asyncio
    async def test_default_plan_is_free(self):
        session = make_mock_session(
            make_scalar_result(None),  # slug check
        )
        org_id = uuid.uuid4()
        flush_count = 0

        async def _assign():
            nonlocal flush_count
            flush_count += 1
            if flush_count == 1:
                session.add.call_args_list[0][0][0].id = org_id

        session.flush = AsyncMock(side_effect=_assign)

        await create_onboarding(
            session,
            org_name="Free Org",
            org_slug="free-org",
            contact_email="free@test.com",
            initiated_by=str(uuid.uuid4()),
        )
        # The org should have plan=FREE by default
        org = session.add.call_args_list[0][0][0]
        assert org.plan == SubscriptionPlan.FREE

    @pytest.mark.asyncio
    async def test_sector_parameter(self):
        session = make_mock_session(
            make_scalar_result(None),
        )
        org_id = uuid.uuid4()
        flush_count = 0

        async def _assign():
            nonlocal flush_count
            flush_count += 1
            if flush_count == 1:
                session.add.call_args_list[0][0][0].id = org_id

        session.flush = AsyncMock(side_effect=_assign)

        await create_onboarding(
            session,
            org_name="Health Co",
            org_slug="health-co",
            contact_email="health@test.com",
            sector=IndustrySector.HEALTHCARE,
            initiated_by=str(uuid.uuid4()),
        )
        org = session.add.call_args_list[0][0][0]
        assert org.sector == IndustrySector.HEALTHCARE

    @pytest.mark.asyncio
    async def test_org_status_is_trial(self):
        from app.models.organization import OrganizationStatus

        session = make_mock_session(
            make_scalar_result(None),
        )
        org_id = uuid.uuid4()
        flush_count = 0

        async def _assign():
            nonlocal flush_count
            flush_count += 1
            if flush_count == 1:
                session.add.call_args_list[0][0][0].id = org_id

        session.flush = AsyncMock(side_effect=_assign)

        await create_onboarding(
            session,
            org_name="Trial Org",
            org_slug="trial-org",
            contact_email="trial@test.com",
            initiated_by=str(uuid.uuid4()),
        )
        org = session.add.call_args_list[0][0][0]
        assert org.status == OrganizationStatus.TRIAL


class TestListOnboardings:
    """Tests for list_onboardings()."""

    @pytest.mark.asyncio
    async def test_basic_list(self):
        ob = _make_onboarding()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([ob]),
        )
        items, total = await list_onboardings(session)
        assert total == 1
        assert len(items) == 1

    @pytest.mark.asyncio
    async def test_pagination(self):
        session = make_mock_session(
            make_scalar_result(50),
            make_scalars_result([]),
        )
        _, total = await list_onboardings(session, page=3, page_size=10)
        assert total == 50

    @pytest.mark.asyncio
    async def test_status_filter_valid(self):
        session = make_mock_session(
            make_scalar_result(2),
            make_scalars_result([]),
        )
        _, total = await list_onboardings(session, status_filter="in_progress")
        assert total == 2

    @pytest.mark.asyncio
    async def test_invalid_status_filter_ignored(self):
        session = make_mock_session(
            make_scalar_result(10),
            make_scalars_result([]),
        )
        _, total = await list_onboardings(session, status_filter="invalid_status")
        # Invalid filter is ignored — returns all
        assert total == 10


class TestGetOnboarding:
    """Tests for get_onboarding()."""

    @pytest.mark.asyncio
    async def test_found(self):
        ob = _make_onboarding()
        session = make_mock_session(make_scalar_result(ob))
        result = await get_onboarding(session, ob.id)
        assert result.current_step == 1

    @pytest.mark.asyncio
    async def test_not_found_raises(self):
        session = make_mock_session(make_scalar_result(None))
        with pytest.raises(NotFoundError):
            await get_onboarding(session, uuid.uuid4())


class TestCompleteStep:
    """Tests for complete_step()."""

    @pytest.mark.asyncio
    async def test_complete_step_2(self):
        ob = _make_onboarding(current_step=1)
        session = make_mock_session(
            make_scalar_result(ob),  # get_onboarding
            make_scalar_result(None),  # UPDATE execute
        )
        result = await complete_step(session, ob.id, step=2, data={"sites": ["Paris"]})
        assert result.current_step == 2
        assert result.status == OnboardingStatus.IN_PROGRESS

    @pytest.mark.asyncio
    async def test_complete_final_step_sets_completed(self):
        ob = _make_onboarding(current_step=4)
        session = make_mock_session(
            make_scalar_result(ob),
            make_scalar_result(None),
        )
        result = await complete_step(session, ob.id, step=5, data={"finalize": True})
        assert result.current_step == 5
        assert result.status == OnboardingStatus.COMPLETED
        assert result.completed_at is not None

    @pytest.mark.asyncio
    async def test_skip_step_raises_conflict(self):
        ob = _make_onboarding(current_step=1)
        session = make_mock_session(make_scalar_result(ob))

        with pytest.raises(ConflictError, match="Cannot skip"):
            await complete_step(session, ob.id, step=3, data={})

    @pytest.mark.asyncio
    async def test_step_below_1_raises(self):
        ob = _make_onboarding(current_step=1)
        session = make_mock_session(make_scalar_result(ob))

        with pytest.raises(ConflictError, match="Invalid step"):
            await complete_step(session, ob.id, step=0, data={})

    @pytest.mark.asyncio
    async def test_step_above_max_raises(self):
        ob = _make_onboarding(current_step=1)
        session = make_mock_session(make_scalar_result(ob))

        with pytest.raises(ConflictError, match="Invalid step"):
            await complete_step(session, ob.id, step=6, data={})

    @pytest.mark.asyncio
    async def test_completed_onboarding_rejects_steps(self):
        ob = _make_onboarding(
            status=OnboardingStatus.COMPLETED,
            current_step=5,
        )
        session = make_mock_session(make_scalar_result(ob))

        with pytest.raises(ConflictError, match="cannot complete steps"):
            await complete_step(session, ob.id, step=5, data={})

    @pytest.mark.asyncio
    async def test_abandoned_onboarding_rejects_steps(self):
        ob = _make_onboarding(
            status=OnboardingStatus.ABANDONED,
            current_step=2,
        )
        session = make_mock_session(make_scalar_result(ob))

        with pytest.raises(ConflictError, match="cannot complete steps"):
            await complete_step(session, ob.id, step=3, data={})

    @pytest.mark.asyncio
    async def test_re_complete_current_step_allowed(self):
        """Re-completing the current step is allowed (idempotent)."""
        ob = _make_onboarding(current_step=2)
        session = make_mock_session(
            make_scalar_result(ob),
            make_scalar_result(None),
        )
        result = await complete_step(session, ob.id, step=2, data={"retry": True})
        assert result.current_step == 2

    @pytest.mark.asyncio
    async def test_step_data_keys_recorded(self):
        ob = _make_onboarding(current_step=2)
        session = make_mock_session(
            make_scalar_result(ob),
            make_scalar_result(None),
        )
        result = await complete_step(
            session, ob.id, step=3, data={"users": ["a@b.com"], "count": 1}
        )
        # steps_completed should include a record with data_keys
        last_step = result.steps_completed[-1]
        assert set(last_step["data_keys"]) == {"users", "count"}

    @pytest.mark.asyncio
    async def test_empty_data_records_empty_keys(self):
        ob = _make_onboarding(current_step=1)
        session = make_mock_session(
            make_scalar_result(ob),
            make_scalar_result(None),
        )
        result = await complete_step(session, ob.id, step=2, data={})
        last_step = result.steps_completed[-1]
        assert last_step["data_keys"] == []

    @pytest.mark.asyncio
    async def test_not_found_raises(self):
        session = make_mock_session(make_scalar_result(None))
        with pytest.raises(NotFoundError):
            await complete_step(session, uuid.uuid4(), step=1, data={})
