import type { Dictionary } from "../../lib/i18n/types";

export interface PilotFormData {
  companyName: string;
  sector: string;
  employeeRange: string;
  siteCount: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  timeline: string;
  currentStack: string;
  painPoint: string;
  consent: boolean;
  website: string;
}

export interface PilotPageUi {
  backToSite: string;
  formKicker: string;
  optionFallback: string;
  missingTitle: string;
  missingBody: string;
  requiredHint: string;
  legalJoinA: string;
  legalJoinB: string;
  unknownError: string;
  networkError: string;
  protocolHint: string;
}

export interface PilotFormOptions {
  sectors: string[];
  employeeRanges: string[];
  siteCounts: string[];
  roles: string[];
  timelines: string[];
  valuePoints: string[];
}

export type PilotFormDictionary = Dictionary["form"];
