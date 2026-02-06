import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Donnees — Praedixa",
};

export default function DonneesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Donnees</h1>
        <p className="mt-1 text-sm text-gray-500">
          Consultation des donnees importees (lecture seule)
        </p>
      </div>

      <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-16">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">
            Section en construction
          </p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            Tables des employes, absences historiques, sites et departements.
            Filtrage, recherche et export des donnees brutes.
          </p>
        </div>
      </div>
    </div>
  );
}
