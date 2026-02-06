import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Praedixa",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vue d'ensemble de la capacite operationnelle
        </p>
      </div>

      <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-16">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">
            Section en construction
          </p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            KPI de couverture, alertes actives, graphiques de prevision a 14
            jours, et decisions en attente apparaitront ici.
          </p>
        </div>
      </div>
    </div>
  );
}
