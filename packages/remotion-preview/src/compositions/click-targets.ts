export type ClickTargetId =
  | "nav-dashboard"
  | "nav-donnees"
  | "sub-donnees-datasets"
  | "nav-previsions"
  | "sub-previsions-alertes"
  | "nav-actions"
  | "sub-actions-traitement"
  | "sub-actions-historique"
  | "nav-parametres"
  | "dashboard-kpi-alertes"
  | "dashboard-chart"
  | "previsions-filter-critical"
  | "previsions-table-scroll"
  | "actions-queue-item"
  | "historique-table-row"
  | "datasets-upload-button"
  | "settings-toggle-notifs"
  | "settings-save-button";

export const CLICK_TARGETS: Record<ClickTargetId, { x: number; y: number }> = {
  "nav-dashboard": { x: 132, y: 121 },
  "nav-donnees": { x: 132, y: 200 },
  "sub-donnees-datasets": { x: 156, y: 263 },
  "nav-previsions": { x: 132, y: 274 },
  "sub-previsions-alertes": { x: 156, y: 339 },
  "nav-actions": { x: 132, y: 406 },
  "sub-actions-traitement": { x: 156, y: 387 },
  "sub-actions-historique": { x: 156, y: 415 },
  "nav-parametres": { x: 132, y: 610 },
  "dashboard-kpi-alertes": { x: 522, y: 329 },
  "dashboard-chart": { x: 774, y: 556 },
  "previsions-filter-critical": { x: 1482, y: 286 },
  "previsions-table-scroll": { x: 1022, y: 630 },
  "actions-queue-item": { x: 786, y: 542 },
  "historique-table-row": { x: 931, y: 570 },
  "datasets-upload-button": { x: 1486, y: 278 },
  "settings-toggle-notifs": { x: 1700, y: 388 },
  "settings-save-button": { x: 1707, y: 178 },
};
