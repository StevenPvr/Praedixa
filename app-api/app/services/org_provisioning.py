"""Organization provisioning service.

Creates all operational artifacts needed so a new client organization
is immediately usable in admin/webapp after creation.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.core.exceptions import PraedixaError
from app.services.organization_foundation import (
    provision_organization_foundation,
)

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession


async def provision_new_organization(
    session: AsyncSession,
    *,
    organization_id: uuid.UUID,
) -> None:
    """Provision the minimal persistent client foundation.

    Strict mode:
    - any provisioning error aborts organization creation transaction.
    """
    try:
        await provision_organization_foundation(
            session,
            organization_id=organization_id,
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
