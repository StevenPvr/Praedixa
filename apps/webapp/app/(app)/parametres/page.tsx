"use client";

import { useState } from "react";
import type { CostParameter, Organization } from "@praedixa/shared-types";
import {
  TabBar,
  DataTable,
  Button,
  SkeletonTable,
  SkeletonCard,
} from "@praedixa/ui";
import type { Tab, DataTableColumn } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { SitesTable } from "@/components/donnees/sites-table";

const SETTINGS_TABS: Tab[] = [
  { id: "couts", label: "Baremes de couts" },
  { id: "shifts", label: "Horaires des postes" },
  { id: "seuils", label: "Seuils d'alerte" },
  { id: "sites", label: "Sites" },
  { id: "export", label: "Exporter les donnees" },
];

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState("couts");

  const {
    data: costParams,
    loading: costLoading,
    error: costError,
    refetch: refetchCost,
  } = useApiGet<CostParameter[]>("/api/v1/cost-parameters");

  const { data: effectiveParams, loading: effectiveLoading } =
    useApiGet<CostParameter>("/api/v1/cost-parameters/effective");

  const { data: org, loading: orgLoading } = useApiGet<Organization>(
    "/api/v1/organizations/me",
  );

  const costColumns: DataTableColumn<CostParameter>[] = [
    {
      key: "siteId",
      label: "Site",
      render: (row) => row.siteId ?? "Valeur par defaut",
    },
    { key: "version", label: "Version", align: "right" },
    { key: "cInt", label: "Cout horaire interne", align: "right" },
    { key: "majHs", label: "Majoration heures sup.", align: "right" },
    { key: "cInterim", label: "Cout horaire interim", align: "right" },
    { key: "capHsShift", label: "Plafond heures sup./poste", align: "right" },
    { key: "effectiveFrom", label: "En vigueur depuis" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Reglages</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configurez les couts, horaires, seuils d&apos;alerte et sites de votre
          organisation
        </p>
      </div>

      <TabBar
        tabs={SETTINGS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "couts" && (
        <section aria-label="Baremes de couts">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">
            Baremes de couts par site
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
              emptyMessage="Aucun bareme configure. Ajoutez vos premiers baremes de couts pour activer les calculs."
            />
          )}
        </section>
      )}

      {activeTab === "shifts" && (
        <section aria-label="Horaires des postes">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">
            Horaires des postes
          </h2>
          {effectiveLoading ? (
            <SkeletonCard />
          ) : (
            <div className="rounded-card border border-gray-200 bg-card p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 border-b border-gray-100 pb-3 text-xs font-semibold uppercase text-gray-500">
                  <span>Poste</span>
                  <span>Debut</span>
                  <span>Fin</span>
                  <span>Nom</span>
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
              {effectiveParams && (
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-500">
                    Limites operationnelles
                  </h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500">
                        Plafond heures sup. par poste
                      </p>
                      <p className="text-lg font-bold text-charcoal">
                        {effectiveParams.capHsShift}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        Plafond interim par site
                      </p>
                      <p className="text-lg font-bold text-charcoal">
                        {effectiveParams.capInterimSite}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        Delai de mobilisation interim
                      </p>
                      <p className="text-lg font-bold text-charcoal">
                        {effectiveParams.leadTimeJours}j
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === "seuils" && (
        <section aria-label="Seuils d'alerte">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">
            Seuils d&apos;alerte
          </h2>
          {orgLoading ? (
            <SkeletonCard />
          ) : org ? (
            <div className="rounded-card border border-gray-200 bg-card p-6">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-gray-500">
                    Seuil de risque sous-effectif
                  </p>
                  <p className="text-lg font-bold text-charcoal">
                    {org.settings.alertThresholds.understaffingRisk}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    Seuil d&apos;alerte absence
                  </p>
                  <p className="text-lg font-bold text-amber-600">
                    {org.settings.alertThresholds.absenceRate}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    Absences consecutives max.
                  </p>
                  <p className="text-lg font-bold text-red-500">
                    {org.settings.alertThresholds.consecutiveAbsences}j
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    Fiabilite minimale des previsions
                  </p>
                  <p className="text-lg font-bold text-charcoal">
                    {org.settings.alertThresholds.forecastAccuracy}%
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-12">
              <p className="text-sm text-gray-400">
                Parametres de l&apos;organisation non disponibles. Contactez
                votre administrateur.
              </p>
            </div>
          )}
        </section>
      )}

      {activeTab === "sites" && (
        <section aria-label="Configuration des sites">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">Sites</h2>
          <SitesTable />
        </section>
      )}

      {activeTab === "export" && (
        <section aria-label="Exporter les donnees">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">
            Exporter les donnees
          </h2>
          <div className="rounded-card border border-gray-200 bg-card p-6">
            <p className="mb-4 text-sm text-gray-500">
              Telechargez vos donnees au format tableur (CSV) ou document (PDF)
            </p>
            <div className="flex gap-3">
              <Button>Telecharger CSV</Button>
              <Button variant="outline">Telecharger PDF</Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
