"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@praedixa/ui";
import { Skeleton } from "@praedixa/ui";
import { X } from "lucide-react";
import { apiPatch, ApiError } from "@/lib/api/client";
import { getValidAccessToken } from "@/lib/auth/client";

interface Alert {
  id: string;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  createdAt: string;
  dismissedAt: string | null;
}

interface AlertsListProps {
  alerts: Alert[] | null;
  loading: boolean;
  onDismissed: () => void;
}

const severityVariant: Record<
  Alert["severity"],
  "neutral" | "warning" | "danger"
> = {
  info: "neutral",
  warning: "warning",
  error: "danger",
  critical: "danger",
};

const severityLabel: Record<Alert["severity"], string> = {
  info: "Info",
  warning: "Attention",
  error: "Erreur",
  critical: "Critique",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Il y a ${diffD}j`;
}

export function AlertsList({ alerts, loading, onDismissed }: AlertsListProps) {
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const handleDismiss = useCallback(
    async (alertId: string) => {
      setDismissingId(alertId);
      try {
        /* v8 ignore next -- helper is mocked in tests */
        const getToken = async () => getValidAccessToken();
        await apiPatch(
          `/api/v1/alerts/${encodeURIComponent(alertId)}/dismiss`,
          {},
          getToken,
        );
        onDismissed();
      } catch (err) {
        if (err instanceof ApiError) {
          // eslint-disable-next-line no-console
          console.error("Failed to dismiss alert:", err.message);
        }
      } finally {
        setDismissingId(null);
      }
    },
    [onDismissed],
  );

  if (loading) {
    return (
      <section aria-label="Alertes recentes">
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <Skeleton className="h-5 w-36" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      </section>
    );
  }

  const activeAlerts = alerts?.filter((a) => !a.dismissedAt) ?? [];

  return (
    <section aria-label="Alertes recentes">
      <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
        <h2 className="text-base font-semibold text-charcoal">
          Alertes recentes
        </h2>
        {activeAlerts.length === 0 ? (
          <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-gray-300 p-8">
            <p className="text-sm text-gray-400">Aucune alerte active</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-nowrap sm:gap-3"
              >
                <StatusBadge
                  variant={severityVariant[alert.severity]}
                  label={severityLabel[alert.severity]}
                  size="sm"
                />
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <p className="text-sm font-medium text-charcoal">
                    {alert.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {alert.message}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {timeAgo(alert.createdAt)}
                </span>
                {alert.type === "risk" && (
                  <Link
                    href={`/arbitrage/${encodeURIComponent(alert.id)}`}
                    className="shrink-0 text-sm font-medium text-amber-600 transition-colors hover:text-amber-700"
                  >
                    Arbitrer
                  </Link>
                )}
                <button
                  onClick={() => void handleDismiss(alert.id)}
                  disabled={dismissingId === alert.id}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:opacity-50"
                  aria-label={`Ignorer l'alerte: ${alert.title}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
