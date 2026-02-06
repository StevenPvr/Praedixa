import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Decisions — Praedixa",
};

export default function DecisionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Decisions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Suivi et audit trail des decisions operationnelles
        </p>
      </div>

      <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-16">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">
            Section en construction
          </p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            Journal des decisions prises : approbations, rejets, couts reels,
            retours d'experience et suivi de l'efficacite des actions.
          </p>
        </div>
      </div>
    </div>
  );
}
