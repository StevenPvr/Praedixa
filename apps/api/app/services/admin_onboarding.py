"""Admin onboarding service — multi-step organization setup wizard.

5-step onboarding:
1. Create organization (org details)
2. Create sites + departments
3. Invite admin user for the org
4. Configure datasets
5. Upload initial data / finalize

Security notes:
- Steps cannot be skipped (validated server-side).
- Organization is created with status=TRIAL.
- OnboardingState has a unique constraint on organization_id (one per org).
- completed_at is set server-side (not from client).
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.core.validation import sanitize_text
from app.models.admin import OnboardingState, OnboardingStatus
from app.models.organization import (
    IndustrySector,
    Organization,
    OrganizationStatus,
    SubscriptionPlan,
)

_MAX_STEP = 5


async def create_onboarding(
    session: AsyncSession,
    *,
    org_name: str,
    org_slug: str,
    contact_email: str,
    sector: IndustrySector | None = None,
    plan: SubscriptionPlan = SubscriptionPlan.FREE,
    initiated_by: str,
) -> OnboardingState:
    """Initiate onboarding: create organization + onboarding state.

    Step 1 is automatically completed (org creation).
    """
    # Check slug uniqueness
    existing = await session.execute(
        select(Organization.id).where(Organization.slug == org_slug)
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError(f"Organization with slug '{org_slug}' already exists")

    now = datetime.now(UTC)

    # Create the organization
    org = Organization(
        name=sanitize_text(org_name, max_length=255),
        slug=org_slug,
        contact_email=contact_email,
        sector=sector,
        plan=plan,
        status=OrganizationStatus.TRIAL,
        settings={},
    )
    session.add(org)
    await session.flush()

    # Create onboarding state (step 1 completed)
    onboarding = OnboardingState(
        organization_id=org.id,
        initiated_by=uuid.UUID(initiated_by),
        status=OnboardingStatus.IN_PROGRESS,
        current_step=1,
        steps_completed=[{
            "step": 1,
            "completed_at": now.isoformat(),
            "action": "organization_created",
        }],
    )
    session.add(onboarding)
    await session.flush()
    return onboarding


async def list_onboardings(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
) -> tuple[list[OnboardingState], int]:
    """List all onboardings with pagination."""
    base_query = select(OnboardingState)
    count_query = select(func.count(OnboardingState.id))

    if status_filter:
        # Validate against enum values
        valid_statuses = {s.value for s in OnboardingStatus}
        if status_filter in valid_statuses:
            base_query = base_query.where(
                OnboardingState.status == OnboardingStatus(status_filter)
            )
            count_query = count_query.where(
                OnboardingState.status == OnboardingStatus(status_filter)
            )

    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0

    offset = (page - 1) * page_size
    query = (
        base_query
        .order_by(OnboardingState.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_onboarding(
    session: AsyncSession,
    onboarding_id: uuid.UUID,
) -> OnboardingState:
    """Fetch a single onboarding state."""
    result = await session.execute(
        select(OnboardingState).where(OnboardingState.id == onboarding_id)
    )
    onboarding = result.scalar_one_or_none()
    if onboarding is None:
        raise NotFoundError("OnboardingState", str(onboarding_id))
    return onboarding


async def complete_step(
    session: AsyncSession,
    onboarding_id: uuid.UUID,
    step: int,
    data: dict,
) -> OnboardingState:
    """Complete an onboarding step.

    Validates:
    - Step is the current step or next step (no skipping).
    - Step is within valid range (1-5).
    - Onboarding is still in_progress.

    Steps 2-5 process the data payload (POC: just records the step completion).
    Step 5 finalizes the onboarding (sets status=completed).
    """
    onboarding = await get_onboarding(session, onboarding_id)

    # Validate onboarding is in progress
    current_status = (
        onboarding.status
        if isinstance(onboarding.status, str)
        else onboarding.status.value
    )
    if current_status != OnboardingStatus.IN_PROGRESS.value:
        raise ConflictError(
            f"Onboarding is '{current_status}', cannot complete steps"
        )

    # Validate step number
    if step < 1 or step > _MAX_STEP:
        raise ConflictError(f"Invalid step {step}. Must be between 1 and {_MAX_STEP}")

    # Can only complete current step or next step (no skipping)
    if step > onboarding.current_step + 1:
        raise ConflictError(
            f"Cannot skip to step {step}. Current step is {onboarding.current_step}"
        )

    now = datetime.now(UTC)

    # Record step completion
    steps_completed = list(onboarding.steps_completed or [])
    steps_completed.append({
        "step": step,
        "completed_at": now.isoformat(),
        "data_keys": list(data.keys()) if data else [],
    })

    # Determine new values
    new_step = max(onboarding.current_step, step)
    new_status = OnboardingStatus.IN_PROGRESS
    completed_at = None

    if step == _MAX_STEP:
        new_status = OnboardingStatus.COMPLETED
        completed_at = now

    # Update
    stmt = (
        update(OnboardingState)
        .where(OnboardingState.id == onboarding_id)
        .values(
            current_step=new_step,
            steps_completed=steps_completed,
            status=new_status,
            completed_at=completed_at,
        )
    )
    await session.execute(stmt)
    await session.flush()

    # Refresh object
    onboarding.current_step = new_step
    onboarding.steps_completed = steps_completed
    onboarding.status = new_status
    onboarding.completed_at = completed_at

    return onboarding
