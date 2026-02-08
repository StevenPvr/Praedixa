"use client";

import { useState } from "react";
import { Rocket } from "lucide-react";
import { DataTable, type DataTableColumn } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";
import {
  OnboardingStatusBadge,
  type OnboardingStatus,
} from "@/components/onboarding-status-badge";

interface OnboardingListItem {
  id: string;
  organizationId: string;
  status: OnboardingStatus;
  currentStep: number;
  stepsCompleted: unknown[];
  initiatedBy: string;
  createdAt: string;
  completedAt: string | null;
}

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const [page, setPage] = useState(1);

  const { data, total, error, refetch } =
    useApiGetPaginated<OnboardingListItem>(
      ADMIN_ENDPOINTS.onboardingList,
      page,
      20,
    );

  const columns: DataTableColumn<OnboardingListItem>[] = [
    {
      key: "organizationId",
      label: "Organisation",
      render: (row) => (
        <span className="font-mono text-xs text-gray-500">
          {row.organizationId.substring(0, 8)}...
        </span>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => <OnboardingStatusBadge status={row.status} />,
    },
    {
      key: "currentStep",
      label: "Progression",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{
                width: `${(row.currentStep / TOTAL_STEPS) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {row.currentStep}/{TOTAL_STEPS}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Demarre le",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.createdAt).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
    {
      key: "completedAt",
      label: "Termine le",
      render: (row) =>
        row.completedAt ? (
          <span className="text-sm text-gray-500">
            {new Date(row.completedAt).toLocaleDateString("fr-FR")}
          </span>
        ) : (
          <span className="text-sm text-gray-300">En cours</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Rocket className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">Onboarding</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Suivi des parcours d&apos;onboarding des organisations ({total}{" "}
          parcours)
        </p>
      </div>

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          getRowKey={(row) => row.id}
          pagination={{
            page,
            pageSize: 20,
            total,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
