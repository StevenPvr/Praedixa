// User and employee domain types

import type { TenantEntity, UUID, ISODateString } from "../utils/common";

/** User role in the system */
export type UserRole =
  | "super_admin" // Praedixa internal
  | "org_admin" // Organization administrator
  | "hr_manager" // HR department manager
  | "manager" // Team/department manager
  | "employee" // Regular employee
  | "viewer"; // Read-only access

/** User status */
export type UserStatus = "active" | "inactive" | "pending" | "suspended";

/** Employment type */
export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contractor"
  | "intern"
  | "temporary";

/** Contract type */
export type ContractType =
  | "cdi"
  | "cdd"
  | "interim"
  | "apprenticeship"
  | "internship"
  | "other";

/** User entity (authentication + authorization) */
export interface User extends TenantEntity {
  email: string;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  /** Employee profile link (if applicable) */
  employeeId?: UUID;
  /** Last login timestamp */
  lastLoginAt?: ISODateString;
  /** MFA enabled */
  mfaEnabled: boolean;
  /** Preferred locale */
  locale?: string;
  /** Preferred timezone */
  timezone?: string;
}

/** Employee entity (HR data) */
export interface Employee extends TenantEntity {
  /** Linked user account */
  userId?: UUID;
  /** Employee ID/Number */
  employeeNumber: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Display name */
  displayName: string;
  /** Work email */
  email: string;
  /** Personal email */
  personalEmail?: string;
  /** Phone number */
  phone?: string;
  /** Job title */
  jobTitle: string;
  /** Job category/family */
  jobCategory?: string;
  /** Department */
  departmentId: UUID;
  /** Site/Location */
  siteId?: UUID;
  /** Direct manager */
  managerId?: UUID;
  /** Employment type */
  employmentType: EmploymentType;
  /** Contract type */
  contractType: ContractType;
  /** FTE (Full-Time Equivalent) */
  fte: number;
  /** Hire date */
  hireDate: ISODateString;
  /** End date (if applicable) */
  endDate?: ISODateString;
  /** Seniority in days */
  seniorityDays: number;
  /** Is critical role */
  isCriticalRole: boolean;
  /** Skills/Competencies */
  skills: string[];
  /** Cost per day (for replacement calculations) */
  dailyCost?: number;
  /** Absence balance */
  absenceBalance: AbsenceBalance;
  /** Status */
  status: EmployeeStatus;
}

/** Employee status */
export type EmployeeStatus = "active" | "on_leave" | "terminated" | "pending";

/** Absence balance per type */
export interface AbsenceBalance {
  /** Paid leave balance (days) */
  paidLeave: number;
  /** RTT balance (French specific) */
  rtt: number;
  /** Sick leave taken this year */
  sickLeaveTaken: number;
  /** Other balances by type */
  other: Record<string, number>;
  /** Last updated */
  updatedAt: ISODateString;
}

/** Employee summary for listings */
export interface EmployeeSummary {
  id: UUID;
  employeeNumber: string;
  displayName: string;
  email: string;
  jobTitle: string;
  departmentId: UUID;
  departmentName?: string;
  managerId?: UUID;
  managerName?: string;
  fte: number;
  status: EmployeeStatus;
}

/** Team/Manager view of direct reports */
export interface TeamMember extends EmployeeSummary {
  /** Current absence (if any) */
  currentAbsence?: {
    type: string;
    endDate: ISODateString;
  };
  /** Upcoming absences count */
  upcomingAbsencesCount: number;
  /** Days absent this month */
  daysAbsentThisMonth: number;
}

/** Permission set for RBAC */
export interface Permission {
  resource: string;
  action: "create" | "read" | "update" | "delete" | "manage";
  scope: "own" | "team" | "department" | "organization";
}

/** Role with permissions */
export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}
