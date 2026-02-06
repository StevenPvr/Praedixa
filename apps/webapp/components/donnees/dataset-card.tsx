"use client";

import Link from "next/link";
import { Database } from "lucide-react";
import type { DatasetSummary } from "@praedixa/shared-types";
import { DatasetStatusBadge } from "./dataset-status-badge";

interface DatasetCardProps {
  dataset: DatasetSummary;
}

export function DatasetCard({ dataset }: DatasetCardProps) {
  const formattedDate = dataset.lastIngestionAt
    ? new Date(dataset.lastIngestionAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Jamais";

  return (
    <Link
      href={`/donnees/datasets/${encodeURIComponent(dataset.id)}`}
      className="group block rounded-card border border-gray-200 bg-card p-5 transition-colors hover:border-amber-300 hover:bg-amber-50/30"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:bg-amber-100 group-hover:text-amber-600">
            <Database className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-charcoal">
              {dataset.name}
            </h3>
            {dataset.tableName !== dataset.name && (
              <p className="text-xs text-gray-500">{dataset.tableName}</p>
            )}
          </div>
        </div>
        <DatasetStatusBadge status={dataset.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
        <div>
          <p className="text-gray-400">Lignes</p>
          <p className="font-medium text-charcoal">
            {dataset.rowCount.toLocaleString("fr-FR")}
          </p>
        </div>
        <div>
          <p className="text-gray-400">Colonnes</p>
          <p className="font-medium text-charcoal">{dataset.columnCount}</p>
        </div>
        <div>
          <p className="text-gray-400">Derniere maj</p>
          <p className="font-medium text-charcoal">{formattedDate}</p>
        </div>
      </div>
    </Link>
  );
}
