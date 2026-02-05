// Absence domain types - Core business entity

import type {
  TenantEntity,
  UUID,
  ISODateString,
  ISODateTimeString,
} from "../utils/common";
import type { DateRange, DayPortion, Duration } from "../utils/dates";

/** Absence type categories */
export type AbsenceCategory =
  | "planned" // Vacations, RTT, planned leave
  | "unplanned" // Sick leave, emergency
  | "statutory"; // Maternity, paternity, etc.

/** Standard absence types */
export type AbsenceType =
  | "paid_leave" // Congés payés
  | "rtt" // RTT (French specific)
  | "sick_leave" // Arrêt maladie
  | "sick_leave_workplace" // Accident du travail
  | "maternity" // Congé maternité
  | "paternity" // Congé paternité
  | "parental" // Congé parental
  | "bereavement" // Congé décès
  | "wedding" // Congé mariage
  | "moving" // Congé déménagement
  | "unpaid_leave" // Congé sans solde
  | "training" // Formation
  | "remote_work" // Télétravail (tracking only)
  | "other"; // Autre

/** Absence status workflow */
export type AbsenceStatus =
  | "draft" // Created but not submitted
  | "pending" // Awaiting approval
  | "approved" // Approved by manager
  | "rejected" // Rejected
  | "cancelled" // Cancelled by employee
  | "completed"; // Past absence

/** Absence entity */
export interface Absence extends TenantEntity {
  /** Employee taking the absence */
  employeeId: UUID;
  /** Absence type */
  type: AbsenceType;
  /** Category */
  category: AbsenceCategory;
  /** Start date */
  startDate: ISODateString;
  /** End date */
  endDate: ISODateString;
  /** Start day portion */
  startPortion: DayPortion;
  /** End day portion */
  endPortion: DayPortion;
  /** Duration calculation */
  duration: Duration;
  /** Status */
  status: AbsenceStatus;
  /** Employee comment/reason */
  reason?: string;
  /** Manager comment */
  managerComment?: string;
  /** Rejection reason */
  rejectionReason?: string;
  /** Approver (manager) */
  approverId?: UUID;
  /** Approved/Rejected timestamp */
  decisionAt?: ISODateTimeString;
  /** Medical certificate required */
  medicalCertificateRequired: boolean;
  /** Medical certificate uploaded */
  medicalCertificateUploaded: boolean;
  /** Replacement employee (if assigned) */
  replacementEmployeeId?: UUID;
  /** Source system (for imports) */
  sourceSystem?: string;
  /** External ID (for sync) */
  externalId?: string;
  /** Recurrence pattern (for recurring absences) */
  recurrencePattern?: RecurrencePattern;
}

/** Recurrence pattern for recurring absences */
export interface RecurrencePattern {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  daysOfWeek?: number[]; // ISO: 1=Monday
  endDate?: ISODateString;
  occurrences?: number;
}

/** Absence request (for creation/update) */
export interface AbsenceRequest {
  employeeId: UUID;
  type: AbsenceType;
  startDate: ISODateString;
  endDate: ISODateString;
  startPortion?: DayPortion;
  endPortion?: DayPortion;
  reason?: string;
  recurrencePattern?: RecurrencePattern;
}

/** Absence summary for listings */
export interface AbsenceSummary {
  id: UUID;
  employeeId: UUID;
  employeeName: string;
  type: AbsenceType;
  category: AbsenceCategory;
  startDate: ISODateString;
  endDate: ISODateString;
  duration: Duration;
  status: AbsenceStatus;
}

/** Absence with employee details (for manager views) */
export interface AbsenceWithEmployee extends Absence {
  employee: {
    id: UUID;
    displayName: string;
    email: string;
    jobTitle: string;
    departmentId: UUID;
    departmentName: string;
  };
}

/** Daily absence summary (for calendar views) */
export interface DailyAbsenceSummary {
  date: ISODateString;
  totalAbsent: number;
  byType: Record<AbsenceType, number>;
  byDepartment: Record<UUID, number>;
  absences: AbsenceSummary[];
}

/** Absence statistics */
export interface AbsenceStatistics {
  period: DateRange;
  totalDays: number;
  totalWorkingDays: number;
  byType: Record<AbsenceType, AbsenceTypeStats>;
  byCategory: Record<AbsenceCategory, number>;
  byDepartment: Record<UUID, DepartmentAbsenceStats>;
  trends: AbsenceTrend[];
}

/** Stats per absence type */
export interface AbsenceTypeStats {
  count: number;
  totalDays: number;
  avgDuration: number;
  percentOfTotal: number;
}

/** Department absence statistics */
export interface DepartmentAbsenceStats {
  departmentId: UUID;
  departmentName: string;
  headcount: number;
  totalAbsenceDays: number;
  absenceRate: number; // percentage
  byType: Record<AbsenceType, number>;
}

/** Absence trend data point */
export interface AbsenceTrend {
  period: string; // YYYY-MM or YYYY-WXX
  absenceRate: number;
  totalDays: number;
  byCategory: Record<AbsenceCategory, number>;
}

/** Absence conflict (overlapping absences) */
export interface AbsenceConflict {
  absenceId: UUID;
  conflictingAbsenceId: UUID;
  overlapDays: number;
  overlapRange: DateRange;
}

/** Absence calendar event (for UI) */
export interface AbsenceCalendarEvent {
  id: UUID;
  title: string;
  start: ISODateString;
  end: ISODateString;
  type: AbsenceType;
  status: AbsenceStatus;
  employeeId: UUID;
  employeeName: string;
  color?: string;
}
