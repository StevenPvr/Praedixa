"""Organization provisioning service.

Creates all operational artifacts needed so a new client organization
is immediately usable in admin/webapp after creation.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.core.exceptions import PraedixaError

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession


async def provision_new_organization(
    session: AsyncSession,
    *,
    organization_id: uuid.UUID,
) -> None:
    """Provision full client stack for a newly created organization.

    Strict mode:
    - any provisioning error aborts organization creation transaction.
    """
    try:
        from scripts.seed_full_demo import seed_all

        await seed_all(
            session,
            target_org_id=organization_id,
            strict_step4=True,
        )
    except Exception as exc:  # pragma: no cover - depends on DB privileges/runtime
        msg = (
            "Organization provisioning failed. Verify database DDL privileges "
            "(CREATE SCHEMA) for the API runtime role."
        )
        raise PraedixaError(
            message=msg,
            code="ORG_PROVISIONING_FAILED",
            status_code=500,
            details={"org_id": str(organization_id), "cause": str(exc)[:400]},
        ) from exc
