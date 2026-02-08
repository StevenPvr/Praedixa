"use client";

import { useState } from "react";
import type { CostParameter } from "@praedixa/shared-types";
import { TabBar, DataTable, Button, SkeletonTable } from "@praedixa/ui";
import type { Tab, DataTableColumn } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

const SETTINGS_TABS: Tab[] = [
  { id: "couts", label: "Couts" },
  { id: "shifts", label: "Shifts" },
  { id: "seuils", label: "Seuils d'alerte" },
  { id: "sites", label: "Sites" },
  { id: "export", label: "Export" },
];

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState("couts");

  const {
    data: costParams,
    loading: costLoading,
    error: costError,
    refetch: refetchCost,
  } = useApiGet<CostParameter[]>("/api/v1/cost-parameters");

  const costColumns: DataTableColumn<CostParameter>[] = [
    {
      key: "siteId",
      label: "Site",
      render: (row) => row.siteId ?? "Defaut org",
    },
    { key: "version", label: "Version", align: "right" },
    { key: "cInt", label: "C. interne", align: "right" },
    { key: "majHs", label: "Maj HS", align: "right" },
    { key: "cInterim", label: "C. interim", align: "right" },
    { key: "capHsShift", label: "Cap HS/shift", align: "right" },
    { key: "effectiveFrom", label: "Effectif depuis" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Parametres</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configuration des couts, shifts, seuils et sites
        </p>
      </div>

      <TabBar
        tabs={SETTINGS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "couts" && (
        <section aria-label="Parametres de cout">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">
            Parametres de cout
          </h2>
          {costError ? (
            <ErrorFallback message={costError} onRetry={refetchCost} />
          ) : costLoading ? (
            <SkeletonTable rows={5} columns={7} />
          ) : (
            <DataTable<CostParameter>
              columns={costColumns}
              data={costParams ?? []}
              getRowKey={(row) => row.id}
              emptyMessage="Aucun parametre de cout"
            />
          )}
        </section>
      )}

      {activeTab === "shifts" && (
        <section aria-label="Configuration des shifts">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">
            Configuration des shifts
          </h2>
          <div className="rounded-card border border-gray-200 bg-card p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 border-b border-gray-100 pb-3 text-xs font-semibold uppercase text-gray-500">
                <span>Shift</span>
                <span>Debut</span>
                <span>Fin</span>
                <span>Label</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm text-charcoal">
                <span>AM</span>
                <span>06:00</span>
                <span>14:00</span>
                <span>Matin</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm text-charcoal">
                <span>PM</span>
                <span>14:00</span>
                <span>22:00</span>
                <span>Apres-midi</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "seuils" && (
        <section aria-label="Seuils d'alerte">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">
            Seuils d&apos;alerte
          </h2>
          <div className="rounded-card border border-gray-200 bg-card p-6">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <p className="text-xs text-gray-500">Low</p>
                <p className="text-lg font-bold text-charcoal">0.2</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Medium</p>
                <p className="text-lg font-bold text-amber-600">0.4</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">High</p>
                <p className="text-lg font-bold text-red-500">0.6</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Critical</p>
                <p className="text-lg font-bold text-red-700">0.8</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Max alertes/sem.</p>
                <p className="text-lg font-bold text-charcoal">50</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "sites" && (
        <section aria-label="Configuration des sites">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">Sites</h2>
          <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-12">
            <p className="text-sm text-gray-400">
              Configuration des sites (a venir)
            </p>
          </div>
        </section>
      )}

      {activeTab === "export" && (
        <section aria-label="Export">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">Export</h2>
          <div className="rounded-card border border-gray-200 bg-card p-6">
            <p className="mb-4 text-sm text-gray-500">
              Exportez les donnees au format CSV ou PDF
            </p>
            <div className="flex gap-3">
              <Button>Exporter CSV</Button>
              <Button variant="outline">Exporter PDF</Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
