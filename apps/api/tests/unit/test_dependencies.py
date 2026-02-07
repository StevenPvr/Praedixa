"""Tests for app.core.dependencies — FastAPI dependency functions."""

from unittest.mock import MagicMock, patch

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_tenant_filter
from app.core.security import TenantFilter


class TestGetCurrentUser:
    """Test get_current_user dependency."""

    @patch("app.core.dependencies.verify_jwt")
    @patch("app.core.dependencies.extract_token")
    def test_extracts_token_and_verifies(self, mock_extract, mock_verify):
        mock_extract.return_value = "the-token"
        expected = JWTPayload(
            user_id="u1",
            email="test@example.com",
            organization_id="org-1",
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
    def test_stores_audit_on_request_state(self, mock_extract, mock_verify):
        mock_extract.return_value = "tok"
        mock_verify.return_value = JWTPayload(
            user_id="user-42",
            email="e@x.com",
            organization_id="org-99",
            role="admin",
        )

        request = MagicMock()
        request.state = MagicMock()

        get_current_user(request)

        assert request.state.audit_user_id == "user-42"
        assert request.state.audit_org_id == "org-99"


class TestGetTenantFilter:
    """Test get_tenant_filter dependency."""

    def test_returns_tenant_filter_with_org_id(self):
        user = JWTPayload(
            user_id="u1",
            email="e@x.com",
            organization_id="org-42",
            role="viewer",
        )
        result = get_tenant_filter(current_user=user)
        assert isinstance(result, TenantFilter)
        assert result.organization_id == "org-42"

    def test_different_org_ids(self):
        for org_id in ["org-1", "org-2", "org-abc"]:
            user = JWTPayload(
                user_id="u1",
                email="e@x.com",
                organization_id=org_id,
                role="viewer",
            )
            result = get_tenant_filter(current_user=user)
            assert result.organization_id == org_id
