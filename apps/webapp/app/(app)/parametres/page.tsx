import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parametres — Praedixa",
};

export default function ParametresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Parametres</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configuration de l'organisation et preferences
        </p>
      </div>

      <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-16">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">
            Section en construction
          </p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            Gestion des utilisateurs, seuils d'alerte, jours ouvres,
            configuration des sites et integration SSO.
          </p>
        </div>
      </div>
    </div>
  );
}
