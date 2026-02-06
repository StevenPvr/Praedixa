"use client";

import Link from "next/link";
import { Database } from "lucide-react";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { SitesTable } from "@/components/donnees/sites-table";
import { DepartmentsTable } from "@/components/donnees/departments-table";

interface Site {
  id: string;
  name: string;
}

export default function DonneesPage() {
  const {
    data: sites,
    loading: sitesLoading,
    error: sitesError,
    refetch: refetchSites,
  } = useApiGet<Site[]>("/api/v1/sites");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Donnees</h1>
        <p className="mt-1 text-sm text-gray-500">
          Consultation des donnees importees (lecture seule)
        </p>
      </div>

      {/* Datasets link */}
      <Link
        href="/donnees/datasets"
        className="group flex items-center gap-3 rounded-card border border-gray-200 bg-card px-5 py-4 transition-colors hover:border-amber-300 hover:bg-amber-50/30"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:bg-amber-100 group-hover:text-amber-600">
          <Database className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-charcoal">Datasets</p>
          <p className="text-xs text-gray-500">
            Voir les datasets configures et leurs donnees
          </p>
        </div>
      </Link>

      <section aria-label="Sites">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">Sites</h2>
        {sitesError ? (
          <ErrorFallback message={sitesError} onRetry={refetchSites} />
        ) : (
          <SitesTable />
        )}
      </section>

      <section aria-label="Departements">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Departements
        </h2>
        <DepartmentsTable sites={sitesLoading ? [] : (sites ?? [])} />
      </section>
    </div>
  );
}
