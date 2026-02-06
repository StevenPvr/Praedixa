"""Employee model — HR data entity.

Maps to shared-types: Employee, EmploymentType, ContractType, EmployeeStatus.
"""

import enum
import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, sa_enum


class EmploymentType(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACTOR = "contractor"
    INTERN = "intern"
    TEMPORARY = "temporary"


class ContractType(str, enum.Enum):
    CDI = "cdi"
    CDD = "cdd"
    INTERIM = "interim"
    APPRENTICESHIP = "apprenticeship"
    INTERNSHIP = "internship"
    OTHER = "other"


class EmployeeStatus(str, enum.Enum):
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"
    PENDING = "pending"


class Employee(TenantMixin, Base):
    """Employee — HR record linked to a department and site.

    Employees may or may not have a User account. The user_id
    links to the auth identity if they have app access.
    """

    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    site_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sites.id", ondelete="SET NULL"),
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
    )
    employee_number: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    personal_email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(30))
    job_title: Mapped[str] = mapped_column(String(200), nullable=False)
    job_category: Mapped[str | None] = mapped_column(String(100))
    employment_type: Mapped[EmploymentType] = mapped_column(
        sa_enum(EmploymentType), nullable=False
    )
    contract_type: Mapped[ContractType] = mapped_column(
        sa_enum(ContractType), nullable=False
    )
    fte: Mapped[float] = mapped_column(Numeric(3, 2), default=1.0)
    hire_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_critical_role: Mapped[bool] = mapped_column(Boolean, default=False)
    skills: Mapped[list[str] | None] = mapped_column(ARRAY(String(100)))
    daily_cost: Mapped[float | None] = mapped_column(Numeric(10, 2))
    # Absence balance stored as JSONB (AbsenceBalance from shared-types)
    absence_balance: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )
    status: Mapped[EmployeeStatus] = mapped_column(
        sa_enum(EmployeeStatus),
        default=EmployeeStatus.ACTIVE,
    )

    def __repr__(self) -> str:
        return f"<Employee {self.display_name}>"
