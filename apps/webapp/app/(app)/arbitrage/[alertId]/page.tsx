import type { Metadata } from "next";

interface AlertDetailPageProps {
  params: Promise<{ alertId: string }>;
}

export async function generateMetadata({
  params,
}: AlertDetailPageProps): Promise<Metadata> {
  const { alertId } = await params;
  return {
    title: `Alerte ${alertId} — Arbitrage — Praedixa`,
  };
}

export default async function AlertDetailPage({
  params,
}: AlertDetailPageProps) {
  const { alertId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Detail de l'alerte
        </h1>
        <p className="mt-1 text-sm text-gray-500">Alerte #{alertId}</p>
      </div>

      <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-16">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">
            Section en construction
          </p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            Detail de l'alerte avec analyse de risque, options d'arbitrage,
            historique des decisions et actions recommandees.
          </p>
        </div>
      </div>
    </div>
  );
}
