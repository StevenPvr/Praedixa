"""Contact request model for public landing inquiries.

Security notes:
- source_ip_hash stores a one-way hash (never raw IP) to reduce personal data exposure.
- status is constrained to a short lifecycle (new -> in_progress -> closed).
- metadata_json stores only operational context
  (locale, source, request headers subset).
"""

import enum
import uuid

from sqlalchemy import Boolean, CheckConstraint, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ContactRequestType(str, enum.Enum):
    """Allowed contact request categories."""

    FOUNDING_PILOT = "founding_pilot"
    PRODUCT_DEMO = "product_demo"
    PARTNERSHIP = "partnership"
    PRESS_OTHER = "press_other"


class ContactRequestStatus(str, enum.Enum):
    """Lifecycle status for a contact request."""

    NEW = "new"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"


class ContactRequest(TimestampMixin, Base):
    """Public contact request persisted for ops follow-up."""

    __tablename__ = "contact_requests"
    __table_args__ = (
        CheckConstraint(
            "locale IN ('fr','en')",
            name="ck_contact_requests_locale",
        ),
        CheckConstraint(
            "request_type IN ("
            "'founding_pilot','product_demo','partnership','press_other'"
            ")",
            name="ck_contact_requests_type",
        ),
        CheckConstraint(
            "status IN ('new','in_progress','closed')",
            name="ck_contact_requests_status",
        ),
        Index("ix_contact_requests_created_at", "created_at"),
        Index("ix_contact_requests_status", "status"),
        Index("ix_contact_requests_request_type", "request_type"),
        Index("ix_contact_requests_email", "email"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    locale: Mapped[str] = mapped_column(String(8), nullable=False, default="fr")
    request_type: Mapped[str] = mapped_column(String(40), nullable=False)
    company_name: Mapped[str] = mapped_column(String(100), nullable=False)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    role: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    subject: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    source_ip_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=ContactRequestStatus.NEW.value,
        server_default=text("'new'"),
    )
    consent: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    metadata_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )

    def __repr__(self) -> str:
        return (
            f"<ContactRequest {self.id} "
            f"type={self.request_type} status={self.status}>"
        )
