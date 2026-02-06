"use client";

import { AlertsArbitrageList } from "@/components/arbitrage/alerts-arbitrage-list";

export default function ArbitragePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Arbitrage</h1>
        <p className="mt-1 text-sm text-gray-500">
          Alertes et recommandations d'arbitrage economique
        </p>
      </div>

      <AlertsArbitrageList />
    </div>
  );
}
