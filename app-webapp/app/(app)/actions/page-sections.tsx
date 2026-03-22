"use client";

type ActionsTab = "treatment" | "history";

interface ActionsPageTabsProps {
  activeTab: ActionsTab;
  setActiveTab: (tab: ActionsTab) => void;
}

export { ActionsHistorySection } from "./history-section";
export { ActionsTreatmentSection } from "./treatment-section";

export function ActionsPageHeader() {
  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-secondary">
        Traitement
      </p>
      <h1 className="text-2xl font-semibold text-ink">Centre Actions</h1>
      <p className="text-sm text-ink-secondary">
        Validez les decisions recommandees puis suivez leur historique.
      </p>
    </section>
  );
}

export function ActionsPageTabs({
  activeTab,
  setActiveTab,
}: ActionsPageTabsProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-1">
      <button
        type="button"
        onClick={() => setActiveTab("treatment")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          activeTab === "treatment"
            ? "bg-primary text-white"
            : "text-ink-secondary hover:bg-surface-sunken"
        }`}
      >
        A traiter
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("history")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          activeTab === "history"
            ? "bg-primary text-white"
            : "text-ink-secondary hover:bg-surface-sunken"
        }`}
      >
        Historique
      </button>
    </div>
  );
}
