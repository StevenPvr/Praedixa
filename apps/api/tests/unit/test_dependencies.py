"""Tests for app.core.dependencies — FastAPI dependency functions."""

from unittest.mock import MagicMock, patch

from app.core.auth import JWTPayload
from app.core.database import get_rls_org_id, set_rls_org_id
from app.core.dependencies import (
    get_admin_tenant_filter,
    get_current_user,
    get_tenant_filter,
)
from app.core.security import TenantFilter


class TestGetCurrentUser:
    """Test get_current_user dependency."""

    def setup_method(self) -> None:
        """Reset RLS context before each test."""
        set_rls_org_id(None)

    def teardown_method(self) -> None:
        """Clean RLS context after each test."""
        set_rls_org_id(None)

    @patch("app.core.dependencies.verify_jwt")
    @patch("app.core.dependencies.extract_token")
    def test_extracts_token_and_verifies(self, mock_extract, mock_verify) -> None:
        mock_extract.return_value = "the-token"
        expected = JWTPayload(
            user_id="u1",
            email="test@example.com",
            organization_id="11111111-1111-1111-1111-111111111111",
            role="manager",
        )
        mock_verify.return_value = expected

        request = MagicMock()
        request.state = MagicMock()

        result = get_current_user(request)

        mock_extract.assert_called_once_with(request)
        mock_verify.assert_called_once_with("the-token")
        assert result is expected

    @patch("app.core.dependencies.verify_jwt")
    @patch("app.core.dependencies.extract_token")
    def test_stores_audit_on_request_state(self, mock_extract, mock_verify) -> None:
        mock_extract.return_value = "tok"
        mock_verify.return_value = JWTPayload(
            user_id="user-42",
            email="e@x.com",
            organization_id="22222222-2222-2222-2222-222222222222",
            role="org_admin",
        )

        request = MagicMock()
        request.state = MagicMock()

        get_current_user(request)

        assert request.state.audit_user_id == "user-42"
        assert request.state.audit_org_id == "22222222-2222-2222-2222-222222222222"

    @patch("app.core.dependencies.verify_jwt")
    @patch("app.core.dependencies.extract_token")
    def test_sets_rls_org_id(self, mock_extract, mock_verify) -> None:
        """get_current_user must set the RLS ContextVar for DB session."""
        mock_extract.return_value = "tok"
        org_id = "33333333-3333-3333-3333-333333333333"
        mock_verify.return_value = JWTPayload(
            user_id="user-1",
            email="e@x.com",
            organization_id=org_id,
            role="viewer",
        )

        request = MagicMock()
        request.state = MagicMock()

        get_current_user(request)

        assert get_rls_org_id() == org_id


class TestGetTenantFilter:
    """Test get_tenant_filter dependency."""

    def test_returns_tenant_filter_with_org_id(self) -> None:
        user = JWTPayload(
            user_id="u1",
            email="e@x.com",
            organization_id="44444444-4444-4444-4444-444444444444",
            role="viewer",
        )
        result = get_tenant_filter(current_user=user)
        assert isinstance(result, TenantFilter)
        assert result.organization_id == "44444444-4444-4444-4444-444444444444"

    def test_different_org_ids(self) -> None:
        for org_id in [
            "11111111-1111-1111-1111-111111111111",
            "22222222-2222-2222-2222-222222222222",
            "33333333-3333-3333-3333-333333333333",
        ]:
            user = JWTPayload(
                user_id="u1",
                email="e@x.com",
                organization_id=org_id,
                role="viewer",
            )
            result = get_tenant_filter(current_user=user)
            assert result.organization_id == org_id


class TestGetAdminTenantFilter:
    """Test get_admin_tenant_filter dependency."""

    def setup_method(self) -> None:
        set_rls_org_id(None)

    def teardown_method(self) -> None:
        set_rls_org_id(None)

    def test_sets_rls_to_target_org(self) -> None:
        """Admin filter must override RLS org_id to target org."""
        import uuid

        target = uuid.UUID("55555555-5555-5555-5555-555555555555")
        admin_user = JWTPayload(
            user_id="admin-1",
            email="admin@x.com",
            organization_id="00000000-0000-0000-0000-000000000000",
            role="super_admin",
        )

        result = get_admin_tenant_filter(target_org_id=target, _current_user=admin_user)

        assert isinstance(result, TenantFilter)
        assert result.organization_id == str(target)
        assert get_rls_org_id() == str(target)
