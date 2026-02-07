"""Employee schemas — request/response models.

Maps to shared-types: Employee, EmployeeSummary, EmploymentType,
ContractType, EmployeeStatus.
"""

import uuid
from datetime import date
from typing import Any

from pydantic import ConfigDict

from app.models.employee import ContractType, EmployeeStatus, EmploymentType
from app.schemas.base import CamelModel, TenantEntitySchema


class EmployeeRead(TenantEntitySchema):
    """Full employee response."""

    user_id: uuid.UUID | None = None
    employee_number: str
    first_name: str
    last_name: str
    display_name: str
    email: str
    personal_email: str | None = None
    phone: str | None = None
    job_title: str
    job_category: str | None = None
    department_id: uuid.UUID
    site_id: uuid.UUID | None = None
    manager_id: uuid.UUID | None = None
    employment_type: EmploymentType
    contract_type: ContractType
    fte: float
    hire_date: date
    end_date: date | None = None
    is_critical_role: bool
    skills: list[str] | None = None
    daily_cost: float | None = None
    absence_balance: dict[str, Any]
    status: EmployeeStatus


class EmployeeSummary(CamelModel):
    """Lightweight employee for listings."""

    id: uuid.UUID
    employee_number: str
    display_name: str
    email: str
    job_title: str
    department_id: uuid.UUID
    manager_id: uuid.UUID | None = None
    fte: float
    status: EmployeeStatus


class EmployeeCreate(CamelModel):
    """Create employee request."""

    model_config = ConfigDict(extra="forbid")

    employee_number: str
    first_name: str
    last_name: str
    email: str
    job_title: str
    department_id: uuid.UUID
    site_id: uuid.UUID | None = None
    manager_id: uuid.UUID | None = None
    employment_type: EmploymentType
    contract_type: ContractType
    fte: float = 1.0
    hire_date: date
    end_date: date | None = None
    is_critical_role: bool = False
    skills: list[str] | None = None
    daily_cost: float | None = None


class EmployeeUpdate(CamelModel):
    """Update employee request."""

    model_config = ConfigDict(extra="forbid")

    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    job_title: str | None = None
    department_id: uuid.UUID | None = None
    site_id: uuid.UUID | None = None
    manager_id: uuid.UUID | None = None
    employment_type: EmploymentType | None = None
    fte: float | None = None
    end_date: date | None = None
    is_critical_role: bool | None = None
    skills: list[str] | None = None
    daily_cost: float | None = None
