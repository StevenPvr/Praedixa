"""Security tests: schema hardening — extra="forbid" on all mutation schemas.

Validates that ALL admin create/update schemas reject unexpected fields
via Pydantic's extra="forbid" setting. This prevents mass-assignment attacks
where an attacker injects fields like organization_id, admin_user_id, status,
reviewed_by, etc. into request bodies.

Threat model:
- Mass assignment: attacker adds "status": "approved" to a create body.
- Privilege injection: attacker adds "role": "super_admin" to invite body.
- Audit spoofing: attacker adds "admin_user_id" to audit log body.
- Plan escalation: attacker changes plan without reason.

Strategy:
- For each mutation schema, construct a valid body + one extra field.
- Assert Pydantic raises ValidationError with extra_forbidden.
- Also test super_admin role blocking in invite/change-role schemas.
- Test text field bounds (max_length enforcement).
"""

import uuid

import pytest
from pydantic import ValidationError

from app.models.organization import IndustrySector, OrganizationSize, SubscriptionPlan
from app.models.user import UserRole
from app.schemas.admin import (
    AdminChangePlan,
    AdminChangeRole,
    AdminInviteUser,
    AdminOnboardingCreate,
    AdminOnboardingStepUpdate,
    AdminOrgCreate,
    AdminOrgListParams,
    AdminOrgUpdate,
    AuditLogParams,
)

# ── 1. extra="forbid" on ALL mutation schemas ────────────────────────


class TestExtraForbidEnforcement:
    """Every mutation schema must reject unexpected fields."""

    def test_admin_org_list_params_rejects_extra(self) -> None:
        """AdminOrgListParams rejects unexpected query params."""
        with pytest.raises(ValidationError) as exc_info:
            AdminOrgListParams(
                page=1,
                page_size=10,
                is_admin=True,  # INJECTED
            )
        assert "extra_forbidden" in str(exc_info.value)

    def test_admin_org_create_rejects_extra(self) -> None:
        """AdminOrgCreate rejects extra fields (e.g. status injection)."""
        with pytest.raises(ValidationError) as exc_info:
            AdminOrgCreate(
                name="Test Corp",
                slug="test-corp",
                contact_email="admin@test.com",
                status="active",  # INJECTED — should be server-set
            )
        assert "extra_forbidden" in str(exc_info.value)

    def test_admin_org_create_rejects_id_injection(self) -> None:
        """Cannot inject id field into org creation."""
        with pytest.raises(ValidationError) as exc_info:
            AdminOrgCreate(
                name="Test Corp",
                slug="test-corp",
                contact_email="admin@test.com",
                id=str(uuid.uuid4()),  # INJECTED
            )
        assert "extra_forbidden" in str(exc_info.value)

    def test_admin_org_update_rejects_extra(self) -> None:
        """AdminOrgUpdate rejects extra fields."""
        with pytest.raises(ValidationError) as exc_info:
            AdminOrgUpdate(
                name="New Name",
                status="suspended",  # INJECTED — status changes are separate
            )
        assert "extra_forbidden" in str(exc_info.value)

    def test_admin_org_update_rejects_slug(self) -> None:
        """Cannot change slug via update (it's not in the update schema)."""
        with pytest.raises(ValidationError) as exc_info:
            AdminOrgUpdate(
                slug="new-slug",  # INJECTED — slug is immutable
            )
        assert "extra_forbidden" in str(exc_info.value)

    def test_admin_invite_user_rejects_extra(self) -> None:
        """AdminInviteUser rejects extra fields."""
        with pytest.raises(ValidationError) as exc_info:
            AdminInviteUser(
                email="user@test.com",
                role=UserRole.VIEWER,
                organization_id=str(uuid.uuid4()),  # INJECTED
            )
        assert "extra_forbidden" in str(exc_info.value)

    def test_admin_invite_user_rejects_status_injection(self) -> None:
        """Cannot inject status=active into invite (bypassing pending)."""
        with pytest.raises(ValidationError) as exc_info:
            AdminInviteUser(
                email="user@test.com",
                role=UserRole.VIEWER,
                status="active",  # INJECTED
            )
        assert "extra_forbidden" in str(exc_info.value)

    def test_admin_change_role_rejects_extra(self) -> None:
        """AdminChangeRole rejects extra fields."""
        with pytest.raises(ValidationError) as exc_info:
            AdminChangeRole(
                role=UserRole.VIEWER,
                user_id=str(uuid.uuid4()),  # INJECTED
            )
        assert "extra_forbidden" in str(exc_info.value)

    def test_admin_change_plan_rejects_extra(self) -> None:
        """AdminChangePlan rejects extra fields."""
        with pytest.raises(ValidationError) as exc_info:
            AdminChangePlan(
                new_plan=SubscriptionPlan.PROFESSIONAL,
                reason="Customer upgrade",
                effective_at="2026-02-07T00:00:00Z",  # INJECTED
            )
        assert "extra_forbidden" in str(exc_info.value)

    def test_admin_onboarding_create_rejects_extra(self) -> None:
        """AdminOnboardingCreate rejects extra fields."""
        with pytest.raises(ValidationError) as exc_info:
            AdminOnboardingCreate(
                org_name="New Org",
                org_slug="new-org",
                contact_email="contact@neworg.com",
                initiated_by=str(uuid.uuid4()),  # INJECTED
            )
        assert "extra_forbidden" in str(exc_info.value)

    def test_admin_onboarding_step_update_rejects_extra(self) -> None:
        """AdminOnboardingStepUpdate rejects extra fields."""
        with pytest.raises(ValidationError) as exc_info:
            AdminOnboardingStepUpdate(
                data={"step_1": True},
                completed_at="2026-02-07T00:00:00Z",  # INJECTED
            )
        assert "extra_forbidden" in str(exc_info.value)

    def test_audit_log_params_rejects_extra(self) -> None:
        """AuditLogParams rejects extra query params."""
        with pytest.raises(ValidationError) as exc_info:
            AuditLogParams(
                page=1,
                severity="CRITICAL",  # INJECTED — not a filter param
            )
        assert "extra_forbidden" in str(exc_info.value)


# ── 2. super_admin role blocking ─────────────────────────────────────


class TestSuperAdminRoleBlocking:
    """super_admin role cannot be assigned via any schema."""

    def test_invite_user_blocks_super_admin(self) -> None:
        """AdminInviteUser validator rejects role=super_admin."""
        with pytest.raises(ValidationError) as exc_info:
            AdminInviteUser(
                email="admin@test.com",
                role=UserRole.SUPER_ADMIN,
            )
        errors = exc_info.value.errors()
        # Find the role validation error
        role_errors = [e for e in errors if "role" in str(e.get("loc", []))]
        assert len(role_errors) > 0
        assert "super_admin" in str(role_errors[0]["msg"]).lower()

    def test_change_role_blocks_super_admin(self) -> None:
        """AdminChangeRole validator rejects role=super_admin."""
        with pytest.raises(ValidationError) as exc_info:
            AdminChangeRole(role=UserRole.SUPER_ADMIN)
        errors = exc_info.value.errors()
        role_errors = [e for e in errors if "role" in str(e.get("loc", []))]
        assert len(role_errors) > 0
        assert "super_admin" in str(role_errors[0]["msg"]).lower()

    @pytest.mark.parametrize(
        "allowed_role",
        [
            UserRole.ORG_ADMIN,
            UserRole.HR_MANAGER,
            UserRole.MANAGER,
            UserRole.EMPLOYEE,
            UserRole.VIEWER,
        ],
    )
    def test_invite_user_allows_non_admin_roles(self, allowed_role: UserRole) -> None:
        """AdminInviteUser accepts all non-super_admin roles."""
        user = AdminInviteUser(
            email="user@test.com",
            role=allowed_role,
        )
        assert user.role == allowed_role

    @pytest.mark.parametrize(
        "allowed_role",
        [
            UserRole.ORG_ADMIN,
            UserRole.HR_MANAGER,
            UserRole.MANAGER,
            UserRole.EMPLOYEE,
            UserRole.VIEWER,
        ],
    )
    def test_change_role_allows_non_admin_roles(self, allowed_role: UserRole) -> None:
        """AdminChangeRole accepts all non-super_admin roles."""
        change = AdminChangeRole(role=allowed_role)
        assert change.role == allowed_role

    def test_invite_super_admin_via_string(self) -> None:
        """Even passing 'super_admin' as string is blocked."""
        with pytest.raises(ValidationError):
            AdminInviteUser(
                email="admin@test.com",
                role="super_admin",
            )

    def test_change_role_super_admin_via_string(self) -> None:
        """Even passing 'super_admin' as string is blocked."""
        with pytest.raises(ValidationError):
            AdminChangeRole(role="super_admin")


# ── 3. Email validation ──────────────────────────────────────────────


class TestEmailValidation:
    """Email fields must be properly validated."""

    @pytest.mark.parametrize(
        "bad_email",
        [
            "",
            "@test.com",
            "user@",
            "no-at-sign",
            "a" * 321,
        ],
        ids=["empty", "no_local", "no_domain", "no_at", "too_long"],
    )
    def test_org_create_rejects_bad_emails(self, bad_email: str) -> None:
        """AdminOrgCreate rejects malformed emails."""
        with pytest.raises(ValidationError):
            AdminOrgCreate(
                name="Test",
                slug="test",
                contact_email=bad_email,
            )

    @pytest.mark.parametrize(
        "bad_email",
        [
            "@test.com",
            "user@",
            "no-at-sign",
        ],
        ids=["no_local", "no_domain", "no_at"],
    )
    def test_invite_user_rejects_bad_emails(self, bad_email: str) -> None:
        """AdminInviteUser rejects malformed emails."""
        with pytest.raises(ValidationError):
            AdminInviteUser(
                email=bad_email,
                role=UserRole.VIEWER,
            )

    @pytest.mark.parametrize(
        "bad_email",
        [
            "@test.com",
            "user@",
            "no-at-sign",
        ],
        ids=["no_local", "no_domain", "no_at"],
    )
    def test_onboarding_create_rejects_bad_emails(self, bad_email: str) -> None:
        """AdminOnboardingCreate rejects malformed emails."""
        with pytest.raises(ValidationError):
            AdminOnboardingCreate(
                org_name="Test",
                org_slug="test",
                contact_email=bad_email,
            )

    def test_email_is_normalized_to_lowercase(self) -> None:
        """Email addresses are normalized to lowercase."""
        user = AdminInviteUser(
            email="Admin@TEST.com",
            role=UserRole.VIEWER,
        )
        assert user.email == "admin@test.com"

    def test_email_is_stripped(self) -> None:
        """Email addresses are stripped of whitespace."""
        user = AdminInviteUser(
            email="  user@test.com  ",
            role=UserRole.VIEWER,
        )
        assert user.email == "user@test.com"


# ── 3b. AdminOrgUpdate email validation ─────────────────────────────


class TestAdminOrgUpdateEmailValidation:
    """AdminOrgUpdate.validate_email covers None passthrough and validation."""

    def test_none_email_passes_through(self) -> None:
        """Setting contact_email=None returns None (not validated)."""
        update = AdminOrgUpdate(contact_email=None)
        assert update.contact_email is None

    def test_valid_email_normalized(self) -> None:
        """Valid email is stripped and lowercased."""
        update = AdminOrgUpdate(contact_email="  Admin@Test.COM  ")
        assert update.contact_email == "admin@test.com"

    def test_no_at_sign_rejected(self) -> None:
        """Email without @ is rejected."""
        with pytest.raises(ValidationError, match="Invalid email"):
            AdminOrgUpdate(contact_email="no-at-sign")

    def test_starts_with_at_rejected(self) -> None:
        """Email starting with @ is rejected."""
        with pytest.raises(ValidationError, match="Invalid email"):
            AdminOrgUpdate(contact_email="@domain.com")

    def test_ends_with_at_rejected(self) -> None:
        """Email ending with @ is rejected."""
        with pytest.raises(ValidationError, match="Invalid email"):
            AdminOrgUpdate(contact_email="user@")

    def test_omitted_email_is_none(self) -> None:
        """When contact_email is not provided, it defaults to None."""
        update = AdminOrgUpdate(name="Updated Name")
        assert update.contact_email is None

    def test_valid_email_accepted(self) -> None:
        """Normal valid email is accepted and normalized."""
        update = AdminOrgUpdate(contact_email="user@example.com")
        assert update.contact_email == "user@example.com"


# ── 4. Slug validation ──────────────────────────────────────────────


class TestSlugValidation:
    """Slug fields enforce safe patterns."""

    @pytest.mark.parametrize(
        "bad_slug",
        [
            "UPPERCASE",
            "has spaces",
            "1starts-with-number",
            "special!chars",
            "",
            "a" * 101,
            "'; DROP TABLE--",
            "<script>alert(1)</script>",
        ],
        ids=[
            "uppercase",
            "spaces",
            "starts_number",
            "special_chars",
            "empty",
            "too_long",
            "sql_injection",
            "xss",
        ],
    )
    def test_org_create_rejects_bad_slugs(self, bad_slug: str) -> None:
        """AdminOrgCreate rejects invalid slug patterns."""
        with pytest.raises(ValidationError):
            AdminOrgCreate(
                name="Test",
                slug=bad_slug,
                contact_email="admin@test.com",
            )

    @pytest.mark.parametrize(
        "good_slug",
        [
            "test",
            "test-org",
            "test_org",
            "a1b2c3",
            "logistics-paris",
        ],
    )
    def test_org_create_accepts_good_slugs(self, good_slug: str) -> None:
        """AdminOrgCreate accepts valid slugs."""
        org = AdminOrgCreate(
            name="Test",
            slug=good_slug,
            contact_email="admin@test.com",
        )
        assert org.slug == good_slug


# ── 5. Text field boundaries ────────────────────────────────────────


class TestTextFieldBounds:
    """Text fields respect max_length constraints."""

    def test_org_name_max_length(self) -> None:
        """Name exceeding 255 chars is rejected."""
        with pytest.raises(ValidationError):
            AdminOrgCreate(
                name="x" * 256,
                slug="test",
                contact_email="a@b.com",
            )

    def test_change_plan_reason_max_length(self) -> None:
        """Reason exceeding 1000 chars is rejected."""
        with pytest.raises(ValidationError):
            AdminChangePlan(
                new_plan=SubscriptionPlan.PROFESSIONAL,
                reason="x" * 1001,
            )

    def test_change_plan_reason_required(self) -> None:
        """Reason is required for plan changes (not empty)."""
        with pytest.raises(ValidationError):
            AdminChangePlan(
                new_plan=SubscriptionPlan.PROFESSIONAL,
                reason="",
            )

    def test_search_max_length(self) -> None:
        """Search query exceeding 200 chars is rejected."""
        with pytest.raises(ValidationError):
            AdminOrgListParams(
                search="x" * 201,
            )


# ── 6. Enum validation ──────────────────────────────────────────────


class TestEnumValidation:
    """Enum fields reject invalid values."""

    def test_org_create_rejects_invalid_sector(self) -> None:
        """Invalid sector value is rejected."""
        with pytest.raises(ValidationError):
            AdminOrgCreate(
                name="Test",
                slug="test",
                contact_email="a@b.com",
                sector="fake_sector",
            )

    def test_org_create_rejects_invalid_size(self) -> None:
        """Invalid size value is rejected."""
        with pytest.raises(ValidationError):
            AdminOrgCreate(
                name="Test",
                slug="test",
                contact_email="a@b.com",
                size="gigantic",
            )

    def test_org_list_rejects_invalid_status(self) -> None:
        """Invalid status filter is rejected."""
        with pytest.raises(ValidationError):
            AdminOrgListParams(
                status="deleted",  # Not a valid OrganizationStatus
            )

    def test_invite_rejects_invalid_role(self) -> None:
        """Invalid role value is rejected."""
        with pytest.raises(ValidationError):
            AdminInviteUser(
                email="user@test.com",
                role="god_mode",
            )

    def test_change_plan_rejects_invalid_plan(self) -> None:
        """Invalid plan value is rejected."""
        with pytest.raises(ValidationError):
            AdminChangePlan(
                new_plan="unlimited",
                reason="Testing",
            )

    def test_org_create_accepts_valid_enums(self) -> None:
        """Verify all valid enum combinations are accepted."""
        org = AdminOrgCreate(
            name="Test",
            slug="test",
            contact_email="a@b.com",
            sector=IndustrySector.LOGISTICS,
            size=OrganizationSize.MEDIUM,
            plan=SubscriptionPlan.STARTER,
        )
        assert org.sector == IndustrySector.LOGISTICS
        assert org.size == OrganizationSize.MEDIUM
        assert org.plan == SubscriptionPlan.STARTER


# ── 7. Pagination boundaries ────────────────────────────────────────


class TestPaginationBounds:
    """Pagination params enforce valid ranges."""

    def test_page_zero_rejected(self) -> None:
        """Page 0 is rejected (minimum is 1)."""
        with pytest.raises(ValidationError):
            AdminOrgListParams(page=0)

    def test_negative_page_rejected(self) -> None:
        """Negative page numbers are rejected."""
        with pytest.raises(ValidationError):
            AdminOrgListParams(page=-1)

    def test_page_size_zero_rejected(self) -> None:
        """Page size 0 is rejected."""
        with pytest.raises(ValidationError):
            AdminOrgListParams(page_size=0)

    def test_page_size_exceeds_max_rejected(self) -> None:
        """Page size exceeding 100 is rejected."""
        with pytest.raises(ValidationError):
            AdminOrgListParams(page_size=101)

    def test_valid_pagination(self) -> None:
        """Valid pagination params are accepted."""
        params = AdminOrgListParams(page=5, page_size=50)
        assert params.page == 5
        assert params.page_size == 50

    def test_audit_log_page_size_max(self) -> None:
        """Audit log page size also capped at 100."""
        with pytest.raises(ValidationError):
            AuditLogParams(page_size=101)
