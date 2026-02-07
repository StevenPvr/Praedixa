"use client";

import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { IngestionLogEntry, RunStatus } from "@praedixa/shared-types";
import { StatusBadge } from "@praedixa/ui";

const STATUS_CONFIG: Record<
  RunStatus,
  { variant: "success" | "danger" | "info"; label: string; Icon: typeof Clock }
> = {
  success: { variant: "success", label: "Termine", Icon: CheckCircle2 },
  failed: { variant: "danger", label: "Echoue", Icon: XCircle },
  running: { variant: "info", label: "En cours", Icon: Loader2 },
};

interface IngestionHistoryListProps {
  entries: IngestionLogEntry[];
}

export function IngestionHistoryList({ entries }: IngestionHistoryListProps) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        Aucun historique d&apos;ingestion
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100" role="list">
      {entries.map((entry) => {
        const config = STATUS_CONFIG[entry.status];
        const Icon = config.Icon;
        const startDate = new Date(entry.startedAt);

        return (
          <li key={entry.id} className="flex items-center gap-4 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50">
              <Icon
                className={`h-4 w-4 ${entry.status === "running" ? "animate-spin text-blue-500" : entry.status === "success" ? "text-success-500" : "text-danger-500"}`}
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-charcoal capitalize">
                  {entry.mode === "full_refit"
                    ? "Refit complet"
                    : "Incrementiel"}
                </span>
                <StatusBadge
                  variant={config.variant}
                  label={config.label}
                  size="sm"
                />
              </div>
              <p className="text-xs text-gray-400">
                {startDate.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                a{" "}
                {startDate.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" — "}
                {entry.triggeredBy}
              </p>
            </div>

            <div className="text-right text-xs">
              <p className="text-charcoal">
                {entry.rowsReceived.toLocaleString("fr-FR")} lignes recues
              </p>
              <p className="text-gray-400">
                {entry.rowsTransformed.toLocaleString("fr-FR")} transformees
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
