import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rapports — Praedixa",
};

export default function RapportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Rapports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Exports et rapports de synthese
        </p>
      </div>

      <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-16">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">
            Section en construction
          </p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            Generation de rapports PDF/CSV : synthese hebdomadaire, precision
            des previsions, cout des decisions et tableau de bord mensuel pour
            la direction.
          </p>
        </div>
      </div>
    </div>
  );
}
