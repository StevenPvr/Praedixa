import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Previsions — Praedixa",
};

export default function PrevisionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Previsions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Previsions de capacite humaine et marchandise
        </p>
      </div>

      <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-16">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">
            Section en construction
          </p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            Vue globale des previsions ML : courbes de tendance, intervalles de
            confiance, et comparaison realise vs prevu. Selectionnez une
            dimension ci-dessous.
          </p>
        </div>
      </div>
    </div>
  );
}
