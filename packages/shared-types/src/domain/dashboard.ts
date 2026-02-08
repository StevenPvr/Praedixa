import type { ISODateString } from "../utils/common";

/** Dashboard summary from /api/v1/dashboard/summary */
export interface DashboardSummary {
  coverageHuman: number;
  coverageMerchandise: number;
  activeAlertsCount: number;
  forecastAccuracy: number | null;
  lastForecastDate: ISODateString | null;
}
