// User preference types — UX personalization for the client app

import type { UUID } from "../utils/common";

export type UserLanguage = "fr" | "en";
export type UiDensity = "comfortable" | "compact";

export interface SavedViewState {
  id: string;
  name: string;
  resource: string;
  scope: "personal" | "team";
  filters?: Record<string, unknown>;
  sort?: { key: string; direction: "asc" | "desc" };
  columns?: string[];
  groupBy?: string[];
  isDefault?: boolean;
  updatedAt?: string;
}

export interface NavUxPreferences {
  sidebarCollapsed?: boolean;
  sidebarWidth?: number;
  starredItems?: string[];
  recentItems?: string[];
}

export interface TableUxPreference {
  density?: UiDensity;
  pageSize?: number;
  columns?: string[];
  sort?: { key: string; direction: "asc" | "desc" };
}

export interface UserUxPreferences {
  userId?: UUID;
  language: UserLanguage;
  density: UiDensity;
  defaultLanding: string;
  dismissedCoachmarks: string[];
  nav?: NavUxPreferences;
  tables?: Record<string, TableUxPreference>;
  savedViews?: SavedViewState[];
  theme?: { mode?: "light" | "dark" | "system" };
}

export interface UserUxPreferencesPatch {
  language?: UserLanguage;
  density?: UiDensity;
  defaultLanding?: string;
  dismissedCoachmarks?: string[];
  nav?: NavUxPreferences;
  tables?: Record<string, TableUxPreference>;
  savedViews?: SavedViewState[];
  theme?: { mode?: "light" | "dark" | "system" };
}
