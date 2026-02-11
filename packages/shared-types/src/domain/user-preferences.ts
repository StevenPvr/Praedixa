// User preference types — UX personalization for the client app

import type { UUID } from "../utils/common";

export type UserLanguage = "fr" | "en";
export type UiDensity = "comfortable" | "compact";

export interface UserUxPreferences {
  userId?: UUID;
  language: UserLanguage;
  density: UiDensity;
  defaultLanding: string;
  dismissedCoachmarks: string[];
}

export interface UserUxPreferencesPatch {
  language?: UserLanguage;
  density?: UiDensity;
  defaultLanding?: string;
  dismissedCoachmarks?: string[];
}
