"""Schemas for public/admin contact request flows."""

import re
import uuid
from datetime import datetime

from pydantic import ConfigDict, Field, field_validator

from app.models.contact_request import ContactRequestStatus, ContactRequestType
from app.schemas.base import CamelModel

_EMAIL_RE = re.compile(
    r"^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?"
    r"@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$",
    re.IGNORECASE,
)


class ContactRequestCreate(CamelModel):
    """Payload accepted from the landing ingestion endpoint."""

    model_config = ConfigDict(
        alias_generator=CamelModel.model_config.get("alias_generator"),
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    locale: str = Field(default="fr", max_length=8)
    request_type: ContactRequestType
    company_name: str = Field(..., min_length=1, max_length=100)
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)
    role: str = Field(default="", max_length=80)
    email: str = Field(..., min_length=3, max_length=254)
    phone: str = Field(default="", max_length=30)
    subject: str = Field(..., min_length=2, max_length=120)
    message: str = Field(..., min_length=30, max_length=800)
    consent: bool
    source_ip: str | None = Field(default=None, max_length=64)
    metadata_json: dict[str, object] = Field(default_factory=dict)

    @field_validator(
        "company_name",
        "first_name",
        "last_name",
        "role",
        "phone",
        "subject",
        "message",
    )
    @classmethod
    def normalize_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("locale")
    @classmethod
    def validate_locale(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"fr", "en"}:
            raise ValueError("locale must be 'fr' or 'en'")
        return normalized

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not _EMAIL_RE.fullmatch(normalized):
            raise ValueError("invalid email format")
        return normalized

    @field_validator("consent")
    @classmethod
    def require_consent(cls, value: bool) -> bool:
        if not value:
            raise ValueError("consent must be true")
        return value

    @field_validator("source_ip")
    @classmethod
    def normalize_source_ip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ContactRequestRead(CamelModel):
    """Admin/read representation of a persisted contact request."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    locale: str
    request_type: ContactRequestType
    company_name: str
    first_name: str
    last_name: str
    role: str
    email: str
    phone: str
    subject: str
    message: str
    status: ContactRequestStatus
    consent: bool
    metadata_json: dict[str, object]


class ContactRequestStatusUpdate(CamelModel):
    """Status transition payload used by admin endpoints."""

    model_config = ConfigDict(
        alias_generator=CamelModel.model_config.get("alias_generator"),
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    status: ContactRequestStatus


class ContactRequestIngestAck(CamelModel):
    """Public ingestion acknowledgement."""

    id: uuid.UUID
    status: ContactRequestStatus
    created_at: datetime
