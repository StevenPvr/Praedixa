// Date-related types for absence management

import type { ISODateString } from "./common";

/** Day of week (ISO 8601: 1=Monday, 7=Sunday) */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Month (1-12) */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Quarter (1-4) */
export type Quarter = 1 | 2 | 3 | 4;

/** Year (4 digits) */
export type Year = number;

/** Date range */
export interface DateRange {
  startDate: ISODateString;
  endDate: ISODateString;
}

/** Date range with optional bounds */
export interface PartialDateRange {
  startDate?: ISODateString;
  endDate?: ISODateString;
}

/** Time period granularity */
export type TimeGranularity = "day" | "week" | "month" | "quarter" | "year";

/** Calendar period identifier */
export interface CalendarPeriod {
  year: Year;
  month?: Month;
  quarter?: Quarter;
  week?: number;
}

/** Working days configuration */
export interface WorkingDaysConfig {
  /** Days considered as working days (ISO: 1=Mon, 7=Sun) */
  workingDays: DayOfWeek[];
  /** Public holidays (ISO dates) */
  holidays: ISODateString[];
  /** Company-specific non-working days */
  companyClosures: ISODateString[];
}

/** Duration in different units */
export interface Duration {
  days: number;
  workingDays: number;
  calendarDays: number;
  hours?: number;
}

/** Time slot for partial day absences */
export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

/** Day portion for half-day absences */
export type DayPortion = "full" | "morning" | "afternoon";
