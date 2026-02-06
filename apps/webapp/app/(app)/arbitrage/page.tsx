import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arbitrage — Praedixa",
};

export default function ArbitragePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Arbitrage</h1>
        <p className="mt-1 text-sm text-gray-500">
          Alertes et recommandations d'arbitrage economique
        </p>
      </div>

      <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-16">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">
            Section en construction
          </p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            Liste des alertes de sous-couverture avec cout d'inaction vs cout
            d'action, recommandations IA triees par priorite et ROI estime.
          </p>
        </div>
      </div>
    </div>
  );
}
