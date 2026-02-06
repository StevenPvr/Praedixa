import type { Metadata } from "next";

interface DimensionPageProps {
  params: Promise<{ dimension: string }>;
}

const DIMENSION_LABELS: Record<string, string> = {
  humaine: "Capacite humaine",
  marchandise: "Capacite marchandise",
  globale: "Vue globale",
};

export async function generateMetadata({
  params,
}: DimensionPageProps): Promise<Metadata> {
  const { dimension } = await params;
  const label = DIMENSION_LABELS[dimension] ?? dimension;
  return {
    title: `${label} — Previsions — Praedixa`,
  };
}

export default async function DimensionPage({ params }: DimensionPageProps) {
  const { dimension } = await params;
  const label = DIMENSION_LABELS[dimension] ?? dimension;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">{label}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Previsions detaillees — {label.toLowerCase()}
        </p>
      </div>

      <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-16">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">
            Section en construction
          </p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            Graphiques Tremor de prevision a 3, 7 et 14 jours, filtres par site
            et departement, avec indicateurs de risque de sous-couverture.
          </p>
        </div>
      </div>
    </div>
  );
}
