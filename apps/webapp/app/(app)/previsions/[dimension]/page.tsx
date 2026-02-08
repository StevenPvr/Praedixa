import type { Metadata } from "next";
import { DimensionDetail } from "@/components/previsions/dimension-detail";

interface DimensionPageProps {
  params: Promise<{ dimension: string }>;
}

const DIMENSION_LABELS: Record<string, string> = {
  humaine: "Disponibilite des equipes",
  marchandise: "Capacite de traitement",
  globale: "Vue d'ensemble",
};

export async function generateMetadata({
  params,
}: DimensionPageProps): Promise<Metadata> {
  const { dimension } = await params;
  const label = DIMENSION_LABELS[dimension] ?? dimension;
  return {
    title: `${label} — Anticipation — Praedixa`,
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
          Previsions detaillees sur la {label.toLowerCase()}
        </p>
      </div>

      <DimensionDetail dimension={dimension} />
    </div>
  );
}
