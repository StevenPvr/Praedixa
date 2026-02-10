// Date utility types

import type { ISODateString } from "./common";

/** Date range with start and end */
export interface DateRange {
  startDate: ISODateString;
  endDate: ISODateString;
}

/** Time granularity for forecasts and reports */
export type TimeGranularity = "daily" | "weekly" | "monthly";

/** Working days configuration */
export interface WorkingDaysConfig {
  /** Working days (0=Sunday, 1=Monday, ...) */
  workingDays: number[];
  /** Public holidays */
  holidays: ISODateString[];
  /** Company-specific closures */
  companyClosures?: ISODateString[];
}
