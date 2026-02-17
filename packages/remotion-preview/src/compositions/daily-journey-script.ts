import type { SidebarChildId, SidebarItemId } from "../components/Sidebar";
import type { ClickTargetId } from "./click-targets";

export type JourneyViewId =
  | "dashboard"
  | "previsions-alertes"
  | "actions-traitement"
  | "actions-historique"
  | "donnees-datasets"
  | "parametres";

export type JourneyView = {
  id: JourneyViewId;
  start: number;
  end: number;
  breadcrumbs: string[];
  dateLabel: string;
  updatedAtLabel: string;
};

export type JourneyNavState = {
  start: number;
  end: number;
  activeItemId: SidebarItemId;
  activeChildId?: SidebarChildId;
  expandedItemIds: SidebarItemId[];
};

export type CursorStep = {
  frame: number;
  target: ClickTargetId;
  action?: "move" | "click" | "scroll";
};

export const VIDEO_FPS = 30;
export const VIDEO_DURATION_FRAMES = 1350;
export const SHELL_INTRO_END = 90;
export const OUTRO_START = 1290;
export const NAV_REACTION_DELAY = 4;
export const VIEW_TRANSITION_DELAY = 6;

const PREVISIONS_NAV_CLICK_FRAME = 238;
const PREVISIONS_SUB_CLICK_FRAME = 270;
const ACTIONS_NAV_CLICK_FRAME = 514;
const ACTIONS_TRAITEMENT_SUB_CLICK_FRAME = 542;
const ACTIONS_HISTORIQUE_SUB_CLICK_FRAME = 722;
const DONNEES_NAV_CLICK_FRAME = 902;
const DONNEES_SUB_CLICK_FRAME = 932;
const PARAMETRES_NAV_CLICK_FRAME = 1098;

const PREVISIONS_NAV_OPEN_FRAME =
  PREVISIONS_NAV_CLICK_FRAME + NAV_REACTION_DELAY;
const PREVISIONS_VIEW_START_FRAME =
  PREVISIONS_SUB_CLICK_FRAME + VIEW_TRANSITION_DELAY;
const ACTIONS_NAV_OPEN_FRAME = ACTIONS_NAV_CLICK_FRAME + NAV_REACTION_DELAY;
const ACTIONS_TRAITEMENT_VIEW_START_FRAME =
  ACTIONS_TRAITEMENT_SUB_CLICK_FRAME + VIEW_TRANSITION_DELAY;
const ACTIONS_HISTORIQUE_VIEW_START_FRAME =
  ACTIONS_HISTORIQUE_SUB_CLICK_FRAME + VIEW_TRANSITION_DELAY;
const DONNEES_NAV_OPEN_FRAME = DONNEES_NAV_CLICK_FRAME + NAV_REACTION_DELAY;
const DONNEES_VIEW_START_FRAME =
  DONNEES_SUB_CLICK_FRAME + VIEW_TRANSITION_DELAY;
const PARAMETRES_NAV_OPEN_FRAME =
  PARAMETRES_NAV_CLICK_FRAME + NAV_REACTION_DELAY;
const PARAMETRES_VIEW_START_FRAME =
  PARAMETRES_NAV_CLICK_FRAME + VIEW_TRANSITION_DELAY;

export const JOURNEY_VIEWS: JourneyView[] = [
  {
    id: "dashboard",
    start: SHELL_INTRO_END,
    end: PREVISIONS_VIEW_START_FRAME,
    breadcrumbs: ["Tableau de bord"],
    dateLabel: "lundi 16 fevrier",
    updatedAtLabel: "23:10",
  },
  {
    id: "previsions-alertes",
    start: PREVISIONS_VIEW_START_FRAME,
    end: ACTIONS_TRAITEMENT_VIEW_START_FRAME,
    breadcrumbs: ["Anticipation", "Toutes les alertes"],
    dateLabel: "lundi 16 fevrier",
    updatedAtLabel: "23:12",
  },
  {
    id: "actions-traitement",
    start: ACTIONS_TRAITEMENT_VIEW_START_FRAME,
    end: ACTIONS_HISTORIQUE_VIEW_START_FRAME,
    breadcrumbs: ["Traitement", "Alertes a traiter"],
    dateLabel: "lundi 16 fevrier",
    updatedAtLabel: "23:15",
  },
  {
    id: "actions-historique",
    start: ACTIONS_HISTORIQUE_VIEW_START_FRAME,
    end: DONNEES_VIEW_START_FRAME,
    breadcrumbs: ["Traitement", "Decisions passees"],
    dateLabel: "lundi 16 fevrier",
    updatedAtLabel: "23:18",
  },
  {
    id: "donnees-datasets",
    start: DONNEES_VIEW_START_FRAME,
    end: PARAMETRES_VIEW_START_FRAME,
    breadcrumbs: ["Donnees operationnelles", "Fichiers importes"],
    dateLabel: "lundi 16 fevrier",
    updatedAtLabel: "23:21",
  },
  {
    id: "parametres",
    start: PARAMETRES_VIEW_START_FRAME,
    end: OUTRO_START,
    breadcrumbs: ["Reglages"],
    dateLabel: "lundi 16 fevrier",
    updatedAtLabel: "23:24",
  },
];

export const JOURNEY_NAV_STATES: JourneyNavState[] = [
  {
    start: SHELL_INTRO_END,
    end: PREVISIONS_NAV_OPEN_FRAME,
    activeItemId: "dashboard",
    expandedItemIds: ["dashboard"],
  },
  {
    start: PREVISIONS_NAV_OPEN_FRAME,
    end: PREVISIONS_VIEW_START_FRAME,
    activeItemId: "previsions",
    expandedItemIds: ["previsions"],
  },
  {
    start: PREVISIONS_VIEW_START_FRAME,
    end: ACTIONS_NAV_OPEN_FRAME,
    activeItemId: "previsions",
    activeChildId: "previsions-alertes",
    expandedItemIds: ["previsions"],
  },
  {
    start: ACTIONS_NAV_OPEN_FRAME,
    end: ACTIONS_TRAITEMENT_VIEW_START_FRAME,
    activeItemId: "actions",
    expandedItemIds: ["actions"],
  },
  {
    start: ACTIONS_TRAITEMENT_VIEW_START_FRAME,
    end: ACTIONS_HISTORIQUE_VIEW_START_FRAME,
    activeItemId: "actions",
    activeChildId: "actions-traitement",
    expandedItemIds: ["actions"],
  },
  {
    start: ACTIONS_HISTORIQUE_VIEW_START_FRAME,
    end: DONNEES_NAV_OPEN_FRAME,
    activeItemId: "actions",
    activeChildId: "actions-historique",
    expandedItemIds: ["actions"],
  },
  {
    start: DONNEES_NAV_OPEN_FRAME,
    end: DONNEES_VIEW_START_FRAME,
    activeItemId: "donnees",
    expandedItemIds: ["donnees"],
  },
  {
    start: DONNEES_VIEW_START_FRAME,
    end: PARAMETRES_NAV_OPEN_FRAME,
    activeItemId: "donnees",
    activeChildId: "donnees-datasets",
    expandedItemIds: ["donnees"],
  },
  {
    start: PARAMETRES_NAV_OPEN_FRAME,
    end: OUTRO_START,
    activeItemId: "parametres",
    expandedItemIds: ["parametres"],
  },
];

export const CURSOR_STEPS: CursorStep[] = [
  { frame: 110, target: "dashboard-kpi-alertes", action: "move" },
  { frame: 150, target: "dashboard-chart", action: "move" },
  { frame: 226, target: "nav-previsions", action: "move" },
  { frame: 238, target: "nav-previsions", action: "click" },
  { frame: 258, target: "sub-previsions-alertes", action: "move" },
  { frame: 270, target: "sub-previsions-alertes", action: "click" },
  { frame: 360, target: "previsions-filter-critical", action: "move" },
  { frame: 430, target: "previsions-table-scroll", action: "scroll" },
  { frame: 502, target: "nav-actions", action: "move" },
  { frame: 514, target: "nav-actions", action: "click" },
  { frame: 530, target: "sub-actions-traitement", action: "move" },
  { frame: 542, target: "sub-actions-traitement", action: "click" },
  { frame: 650, target: "actions-queue-item", action: "move" },
  { frame: 710, target: "sub-actions-historique", action: "move" },
  { frame: 722, target: "sub-actions-historique", action: "click" },
  { frame: 820, target: "historique-table-row", action: "move" },
  { frame: 890, target: "nav-donnees", action: "move" },
  { frame: 902, target: "nav-donnees", action: "click" },
  { frame: 920, target: "sub-donnees-datasets", action: "move" },
  { frame: 932, target: "sub-donnees-datasets", action: "click" },
  { frame: 1034, target: "datasets-upload-button", action: "move" },
  { frame: 1086, target: "nav-parametres", action: "move" },
  { frame: 1098, target: "nav-parametres", action: "click" },
  { frame: 1182, target: "settings-toggle-notifs", action: "click" },
  { frame: 1240, target: "settings-save-button", action: "click" },
];

export function getViewAtFrame(frame: number): JourneyView {
  const view =
    JOURNEY_VIEWS.find(
      (candidate) => frame >= candidate.start && frame < candidate.end,
    ) ?? JOURNEY_VIEWS[JOURNEY_VIEWS.length - 1];
  return view;
}

export function getNavStateAtFrame(frame: number): JourneyNavState {
  const navState =
    JOURNEY_NAV_STATES.find(
      (candidate) => frame >= candidate.start && frame < candidate.end,
    ) ?? JOURNEY_NAV_STATES[JOURNEY_NAV_STATES.length - 1];
  return navState;
}
