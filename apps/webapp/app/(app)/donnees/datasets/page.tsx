"use client";

import { useState } from "react";
import { PageHeader, SkeletonCard } from "@praedixa/ui";
import type { DatasetSummary } from "@praedixa/shared-types";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { DatasetCard } from "@/components/donnees/dataset-card";

const PAGE_SIZE = 12;

const BREADCRUMBS = [
  { label: "Donnees", href: "/donnees" },
  { label: "Datasets", href: "/donnees/datasets" },
];

export default function DatasetsPage() {
  const [page, setPage] = useState(1);
  const { data, total, loading, error, refetch } =
    useApiGetPaginated<DatasetSummary>("/api/v1/datasets", page, PAGE_SIZE);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader title="Datasets" breadcrumbs={BREADCRUMBS} />

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <ErrorFallback
          variant="empty"
          message="Aucun dataset configure pour cette organisation."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((dataset) => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">
                Page {page} sur {totalPages} ({total} datasets)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  className="rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Precedent
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
