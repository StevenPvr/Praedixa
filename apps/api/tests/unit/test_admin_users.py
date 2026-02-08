"""Tests for app.services.admin_users — admin user management."""

import uuid
from types import SimpleNamespace

import pytest

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.user import UserRole, UserStatus
from app.services.admin_users import (
    _get_org_user,
    change_user_role,
    deactivate_user,
    invite_user,
    list_org_users,
    reactivate_user,
)
from tests.unit.conftest import (
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)


def _make_user(**overrides):
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": uuid.uuid4(),
        "email": "user@example.com",
        "role": UserRole.VIEWER,
        "status": UserStatus.ACTIVE,
        "supabase_user_id": f"supa-{uuid.uuid4()}",
        "email_verified": True,
        "employee_id": None,
        "last_login_at": None,
        "mfa_enabled": False,
        "locale": "fr-FR",
        "timezone": "Europe/Paris",
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class TestListOrgUsers:
    """Tests for list_org_users()."""

    @pytest.mark.asyncio
    async def test_basic_list(self) -> None:
        user = _make_user()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([user]),
        )
        items, total = await list_org_users(session, user.organization_id)
        assert total == 1
        assert len(items) == 1

    @pytest.mark.asyncio
    async def test_pagination(self) -> None:
        session = make_mock_session(
            make_scalar_result(50),
            make_scalars_result([]),
        )
        _, total = await list_org_users(session, uuid.uuid4(), page=3, page_size=10)
        assert total == 50

    @pytest.mark.asyncio
    async def test_empty_org_returns_zero(self) -> None:
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        items, total = await list_org_users(session, uuid.uuid4())
        assert total == 0
        assert items == []


class TestInviteUser:
    """Tests for invite_user()."""

    @pytest.mark.asyncio
    async def test_success(self) -> None:
        session = make_mock_session(
            make_scalar_result(None),  # email uniqueness check
        )

        org_id = uuid.uuid4()
        await invite_user(
            session,
            org_id=org_id,
            email="new@example.com",
            role=UserRole.VIEWER,
            invited_by=str(uuid.uuid4()),
        )
        session.add.assert_called_once()
        session.flush.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_email_lowercased(self) -> None:
        session = make_mock_session(
            make_scalar_result(None),  # email uniqueness check
        )

        await invite_user(
            session,
            org_id=uuid.uuid4(),
            email="UPPER@EXAMPLE.COM",
            role=UserRole.VIEWER,
            invited_by=str(uuid.uuid4()),
        )

        added_user = session.add.call_args[0][0]
        assert added_user.email == "upper@example.com"

    @pytest.mark.asyncio
    async def test_status_is_pending(self) -> None:
        session = make_mock_session(
            make_scalar_result(None),  # email uniqueness
        )

        await invite_user(
            session,
            org_id=uuid.uuid4(),
            email="new@test.com",
            role=UserRole.MANAGER,
            invited_by=str(uuid.uuid4()),
        )

        added_user = session.add.call_args[0][0]
        assert added_user.status == UserStatus.PENDING

    @pytest.mark.asyncio
    async def test_email_conflict_raises(self) -> None:
        session = make_mock_session(
            make_scalar_result(uuid.uuid4()),  # email exists
        )

        with pytest.raises(ConflictError, match="email"):
            await invite_user(
                session,
                org_id=uuid.uuid4(),
                email="existing@example.com",
                role=UserRole.VIEWER,
                invited_by=str(uuid.uuid4()),
            )

    @pytest.mark.asyncio
    async def test_super_admin_blocked(self) -> None:
        session = make_mock_session()

        with pytest.raises(ForbiddenError, match="super_admin"):
            await invite_user(
                session,
                org_id=uuid.uuid4(),
                email="hack@example.com",
                role=UserRole.SUPER_ADMIN,
                invited_by=str(uuid.uuid4()),
            )

    @pytest.mark.asyncio
    async def test_valid_roles_allowed(self) -> None:
        """All non-super_admin roles should be accepted."""
        allowed_roles = [
            UserRole.ORG_ADMIN,
            UserRole.HR_MANAGER,
            UserRole.MANAGER,
            UserRole.EMPLOYEE,
            UserRole.VIEWER,
        ]
        for role in allowed_roles:
            session = make_mock_session(
                make_scalar_result(None),  # email uniqueness
            )
            await invite_user(
                session,
                org_id=uuid.uuid4(),
                email=f"{role.value}@example.com",
                role=role,
                invited_by=str(uuid.uuid4()),
            )
            session.add.assert_called_once()


class TestGetOrgUser:
    """Tests for _get_org_user()."""

    @pytest.mark.asyncio
    async def test_found(self) -> None:
        user = _make_user()
        session = make_mock_session(make_scalar_result(user))
        result = await _get_org_user(session, user.organization_id, user.id)
        assert result.email == "user@example.com"

    @pytest.mark.asyncio
    async def test_not_found_raises(self) -> None:
        session = make_mock_session(make_scalar_result(None))
        with pytest.raises(NotFoundError):
            await _get_org_user(session, uuid.uuid4(), uuid.uuid4())

    @pytest.mark.asyncio
    async def test_wrong_org_returns_not_found(self) -> None:
        """User exists but in different org — should NOT be found."""
        session = make_mock_session(make_scalar_result(None))
        with pytest.raises(NotFoundError):
            await _get_org_user(session, uuid.uuid4(), uuid.uuid4())


class TestChangeUserRole:
    """Tests for change_user_role()."""

    @pytest.mark.asyncio
    async def test_success(self) -> None:
        org_id = uuid.uuid4()
        user = _make_user(organization_id=org_id, role=UserRole.VIEWER)
        session = make_mock_session(
            make_scalar_result(user),  # _get_org_user
            make_scalar_result(None),  # UPDATE execute
        )

        result = await change_user_role(
            session,
            org_id=org_id,
            user_id=user.id,
            new_role=UserRole.MANAGER,
        )
        assert result.role == UserRole.MANAGER
        session.flush.assert_awaited()

    @pytest.mark.asyncio
    async def test_super_admin_blocked(self) -> None:
        session = make_mock_session()

        with pytest.raises(ForbiddenError, match="super_admin"):
            await change_user_role(
                session,
                org_id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                new_role=UserRole.SUPER_ADMIN,
            )

    @pytest.mark.asyncio
    async def test_user_not_in_org_raises(self) -> None:
        session = make_mock_session(make_scalar_result(None))

        with pytest.raises(NotFoundError):
            await change_user_role(
                session,
                org_id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                new_role=UserRole.MANAGER,
            )


class TestDeactivateUser:
    """Tests for deactivate_user()."""

    @pytest.mark.asyncio
    async def test_success(self) -> None:
        org_id = uuid.uuid4()
        user = _make_user(organization_id=org_id, status=UserStatus.ACTIVE)
        session = make_mock_session(
            make_scalar_result(user),  # _get_org_user
            make_scalar_result(None),  # UPDATE execute
        )

        result = await deactivate_user(session, org_id=org_id, user_id=user.id)
        assert result.status == UserStatus.INACTIVE
        session.flush.assert_awaited()

    @pytest.mark.asyncio
    async def test_not_found_raises(self) -> None:
        session = make_mock_session(make_scalar_result(None))

        with pytest.raises(NotFoundError):
            await deactivate_user(session, org_id=uuid.uuid4(), user_id=uuid.uuid4())


class TestReactivateUser:
    """Tests for reactivate_user()."""

    @pytest.mark.asyncio
    async def test_success(self) -> None:
        org_id = uuid.uuid4()
        user = _make_user(organization_id=org_id, status=UserStatus.INACTIVE)
        session = make_mock_session(
            make_scalar_result(user),  # _get_org_user
            make_scalar_result(None),  # UPDATE execute
        )

        result = await reactivate_user(session, org_id=org_id, user_id=user.id)
        assert result.status == UserStatus.ACTIVE
        session.flush.assert_awaited()

    @pytest.mark.asyncio
    async def test_not_found_raises(self) -> None:
        session = make_mock_session(make_scalar_result(None))

        with pytest.raises(NotFoundError):
            await reactivate_user(session, org_id=uuid.uuid4(), user_id=uuid.uuid4())
