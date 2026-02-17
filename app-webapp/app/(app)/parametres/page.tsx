"use client";

import { useMemo, useState } from "react";
import type {
  CanonicalRecord,
  CostParameter,
  Organization,
  ProofPack,
} from "@praedixa/shared-types";
import { DataTable, Button, SkeletonTable, SkeletonCard } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import { TabBar, type Tab } from "@/components/ui/tab-bar";
import { PageHeader } from "@/components/ui/page-header";
import { useApiGet } from "@/hooks/use-api";
import { apiGetPaginated } from "@/lib/api/client";
import { getValidAccessToken } from "@/lib/auth/client";
import { ErrorFallback } from "@/components/error-fallback";
import { AnimatedSection } from "@/components/animated-section";
import { PageTransition } from "@/components/page-transition";
import { Card } from "@/components/ui/card";

interface SiteRow {
  id: string;
  name: string;
  city: string;
  employeeCount: number;
}

interface ShiftDefinition {
  code: string;
  start: string;
  end: string;
  label: string;
}

const siteColumns: DataTableColumn<SiteRow>[] = [
  { key: "name", label: "Nom du site" },
  { key: "city", label: "Ville" },
  { key: "employeeCount", label: "Effectif", align: "right" },
];

const SETTINGS_TABS: Tab[] = [
  { id: "couts", label: "Barèmes de coûts" },
  { id: "shifts", label: "Horaires des postes" },
  { id: "seuils", label: "Seuils d'alerte" },
  { id: "sites", label: "Sites" },
  { id: "export", label: "Exporter les données" },
];

const EXPORT_PAGE_SIZE = 200;
const MAX_EXPORT_PAGES = 25;

function toCsvCell(value: unknown): string {
  if (value == null) return "";
  const raw = String(value);
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function downloadBlob(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

function canonicalRowsToCsv(rows: CanonicalRecord[]): string {
  const headers = [
    "siteId",
    "date",
    "shift",
    "capacitePlanH",
    "realiseH",
    "absH",
    "hsH",
    "interimH",
    "backlogH",
    "safetyIncidents",
    "qualityBlocking",
  ];

  const body = rows.map((row) =>
    [
      row.siteId,
      row.date,
      row.shift,
      row.capacitePlanH,
      row.realiseH,
      row.absH,
      row.hsH,
      row.interimH,
      row.backlogH,
      row.safetyIncidents,
      row.qualityBlocking,
    ]
      .map(toCsvCell)
      .join(","),
  );

  return `${headers.join(",")}\n${body.join("\n")}`;
}

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState("couts");
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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

  const {
    data: siteRows,
    loading: sitesLoading,
    error: sitesError,
    refetch: refetchSites,
  } = useApiGet<SiteRow[]>("/api/v1/sites");

  const orgSettings = (org?.settings ?? {}) as Record<string, unknown>;

  const shiftDefinitions = useMemo<ShiftDefinition[]>(() => {
    const raw = orgSettings["shiftDefinitions"];
    if (!Array.isArray(raw)) return [];

    return raw.flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        typeof (item as Record<string, unknown>).code !== "string" ||
        typeof (item as Record<string, unknown>).start !== "string" ||
        typeof (item as Record<string, unknown>).end !== "string" ||
        typeof (item as Record<string, unknown>).label !== "string"
      ) {
        return [];
      }

      return [
        {
          code: (item as Record<string, string>).code,
          start: (item as Record<string, string>).start,
          end: (item as Record<string, string>).end,
          label: (item as Record<string, string>).label,
        },
      ];
    });
  }, [org]);

  const activeWorkingDays = useMemo<string[]>(() => {
    const raw = orgSettings["workingDays"];
    if (!raw || typeof raw !== "object") return [];

    const dayLabels: Record<string, string> = {
      monday: "Lundi",
      tuesday: "Mardi",
      wednesday: "Mercredi",
      thursday: "Jeudi",
      friday: "Vendredi",
      saturday: "Samedi",
      sunday: "Dimanche",
    };

    return Object.entries(raw as Record<string, unknown>)
      .filter(([, value]) => value === true)
      .map(([key]) => dayLabels[key] ?? key);
  }, [org]);

  const costColumns: DataTableColumn<CostParameter>[] = [
    {
      key: "siteId",
      label: "Site",
      render: (row) => row.siteId ?? "Valeur par défaut",
    },
    { key: "version", label: "Version", align: "right" },
    { key: "cInt", label: "Cout horaire interne", align: "right" },
    { key: "majHs", label: "Majoration heures sup.", align: "right" },
    { key: "cInterim", label: "Cout horaire interim", align: "right" },
    { key: "capHsShift", label: "Plafond heures sup./poste", align: "right" },
    { key: "effectiveFrom", label: "En vigueur depuis" },
  ];

  const getAccessToken = () => getValidAccessToken({ minTtlSeconds: 0 });

  async function fetchAllCanonicalRows(): Promise<CanonicalRecord[]> {
    const allRows: CanonicalRecord[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;

    while (page <= MAX_EXPORT_PAGES && allRows.length < total) {
      const response = await apiGetPaginated<CanonicalRecord>(
        `/api/v1/live/canonical?page=${page}&page_size=${EXPORT_PAGE_SIZE}`,
        getAccessToken,
      );
      allRows.push(...response.data);
      total = response.pagination.total;
      if (response.data.length === 0) break;
      page += 1;
    }

    return allRows;
  }

  async function handleExportCsv(): Promise<void> {
    if (isExportingCsv) return;
    setExportError(null);
    setIsExportingCsv(true);

    try {
      const rows = await fetchAllCanonicalRows();
      if (rows.length === 0) {
        throw new Error("Aucune donnee canonique disponible a exporter.");
      }

      const csv = canonicalRowsToCsv(rows);
      const dateStamp = new Date().toISOString().slice(0, 10);
      downloadBlob(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        `praedixa-canonical-${dateStamp}.csv`,
      );
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Impossible d'exporter le CSV.",
      );
    } finally {
      setIsExportingCsv(false);
    }
  }

  async function handleExportPdf(): Promise<void> {
    if (isExportingPdf) return;
    setExportError(null);
    setIsExportingPdf(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_API_URL non configuree.");
      }

      let siteId: string | null = null;
      let month = "";

      const latestProof = await apiGetPaginated<ProofPack>(
        "/api/v1/live/proof?page=1&page_size=1",
        getAccessToken,
      );

      if (latestProof.data.length > 0) {
        siteId = latestProof.data[0].siteId;
        month = latestProof.data[0].month.slice(0, 10);
      } else {
        siteId = siteRows?.[0]?.id ?? null;
        if (!siteId) {
          throw new Error("Aucun site disponible pour generer un export PDF.");
        }
        const now = new Date();
        month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      }

      const token = await getAccessToken();
      const headers: Record<string, string> = {
        "X-Request-ID": crypto.randomUUID(),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const query = new URLSearchParams({ site_id: siteId, month });
      const response = await fetch(`${baseUrl}/api/v1/proof/pdf?${query}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Echec du telechargement PDF (${response.status}).`);
      }

      const blob = await response.blob();
      const dateStamp = month.slice(0, 7);
      downloadBlob(blob, `praedixa-proof-pack-${siteId}-${dateStamp}.pdf`);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Impossible d'exporter le PDF.",
      );
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <PageTransition>
      <div className="gradient-mesh min-h-full space-y-8">
        <PageHeader
          eyebrow="Gouvernance"
          title="Gouvernance et reglages"
          subtitle="Cadrez les couts, seuils et parametres operationnels de votre organisation."
        />

        <TabBar
          tabs={SETTINGS_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === "couts" && (
          <AnimatedSection>
            <section aria-label="Baremes de couts" className="space-y-6">
              <h2 className="text-heading-sm text-ink">
                Baremes de couts par site
              </h2>
              {costError ? (
                <ErrorFallback message={costError} onRetry={refetchCost} />
              ) : costLoading ? (
                <SkeletonTable rows={5} columns={7} />
              ) : (
                <Card variant="elevated" noPadding>
                  <DataTable<CostParameter>
                    columns={costColumns}
                    data={costParams ?? []}
                    getRowKey={(row) => row.id}
                    emptyMessage="Aucun bareme configure. Ajoutez vos premiers baremes de couts pour activer les calculs."
                  />
                </Card>
              )}
            </section>
          </AnimatedSection>
        )}

        {activeTab === "shifts" && (
          <AnimatedSection>
            <section aria-label="Horaires des postes" className="space-y-6">
              <h2 className="text-heading-sm text-ink">Horaires des postes</h2>
              {effectiveLoading || orgLoading ? (
                <SkeletonCard />
              ) : (
                <Card variant="elevated">
                  {shiftDefinitions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-surface-sunken p-4 text-body-sm text-ink-secondary">
                      Aucun horaire de poste configure dans la base.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-4 border-b border-border pb-3 text-overline text-ink-secondary">
                        <span>Poste</span>
                        <span>Debut</span>
                        <span>Fin</span>
                        <span>Nom</span>
                      </div>
                      {shiftDefinitions.map((shift) => (
                        <div
                          key={shift.code}
                          className="grid grid-cols-4 gap-4 text-body-sm text-ink"
                        >
                          <span>{shift.code}</span>
                          <span>{shift.start}</span>
                          <span>{shift.end}</span>
                          <span>{shift.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {effectiveParams && (
                    <div className="mt-6 border-t border-border pt-4">
                      <h3 className="mb-3 text-title-sm text-ink-secondary">
                        Limites operationnelles
                      </h3>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-caption text-ink-secondary">
                            Plafond heures sup. par poste
                          </p>
                          <p className="text-metric-sm text-ink">
                            {effectiveParams.capHsShift}h
                          </p>
                        </div>
                        <div>
                          <p className="text-caption text-ink-secondary">
                            Plafond interim par site
                          </p>
                          <p className="text-metric-sm text-ink">
                            {effectiveParams.capInterimSite}h
                          </p>
                        </div>
                        <div>
                          <p className="text-caption text-ink-secondary">
                            Delai de mobilisation interim
                          </p>
                          <p className="text-metric-sm text-ink">
                            {effectiveParams.leadTimeJours}j
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 border-t border-border pt-4">
                    <h3 className="mb-3 text-title-sm text-ink-secondary">
                      Jours d&apos;activite
                    </h3>
                    {activeWorkingDays.length === 0 ? (
                      <p className="text-body-sm text-ink-secondary">
                        Aucun jour configure.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {activeWorkingDays.map((day) => (
                          <span
                            key={day}
                            className="rounded-full bg-surface-sunken px-3 py-1 text-caption font-semibold text-ink"
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </section>
          </AnimatedSection>
        )}

        {activeTab === "seuils" && (
          <AnimatedSection>
            <section aria-label="Seuils d'alerte" className="space-y-6">
              <h2 className="text-heading-sm text-ink">Seuils d&apos;alerte</h2>
              {orgLoading ? (
                <SkeletonCard />
              ) : org ? (
                <Card variant="elevated">
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                    <div>
                      <p className="text-caption text-ink-secondary">
                        Seuil de risque sous-effectif
                      </p>
                      <p className="text-metric-sm text-ink">
                        {org.settings.alertThresholds.understaffingRisk}%
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-ink-secondary">
                        Seuil d&apos;alerte absence
                      </p>
                      <p className="text-metric-sm text-primary">
                        {org.settings.alertThresholds.absenceRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-ink-secondary">
                        Absences consecutives max.
                      </p>
                      <p className="text-metric-sm text-red-500">
                        {org.settings.alertThresholds.consecutiveAbsences}j
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-ink-secondary">
                        Fiabilite minimale des previsions
                      </p>
                      <p className="text-metric-sm text-ink">
                        {org.settings.alertThresholds.forecastAccuracy}%
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-card p-12">
                  <p className="text-body-sm text-ink-secondary">
                    Parametres de l&apos;organisation non disponibles. Contactez
                    votre administrateur.
                  </p>
                </div>
              )}
            </section>
          </AnimatedSection>
        )}

        {activeTab === "sites" && (
          <AnimatedSection>
            <section aria-label="Configuration des sites" className="space-y-6">
              <h2 className="text-heading-sm text-ink">Sites</h2>
              {sitesError ? (
                <ErrorFallback message={sitesError} onRetry={refetchSites} />
              ) : sitesLoading ? (
                <SkeletonTable rows={3} columns={3} />
              ) : (
                <Card variant="elevated" noPadding>
                  <DataTable<SiteRow>
                    columns={siteColumns}
                    data={siteRows ?? []}
                    getRowKey={(row) => row.id}
                    emptyMessage="Aucun site configure."
                  />
                </Card>
              )}
            </section>
          </AnimatedSection>
        )}

        {activeTab === "export" && (
          <AnimatedSection>
            <section aria-label="Exporter les donnees" className="space-y-6">
              <h2 className="text-heading-sm text-ink">Exporter les donnees</h2>
              <Card variant="elevated">
                <p className="mb-4 text-body-sm text-ink-secondary">
                  Telechargez vos donnees au format tableur (CSV) ou document
                  (PDF)
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      void handleExportCsv();
                    }}
                    disabled={isExportingCsv}
                  >
                    {isExportingCsv ? "Export CSV..." : "Telecharger CSV"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void handleExportPdf();
                    }}
                    disabled={isExportingPdf}
                  >
                    {isExportingPdf ? "Export PDF..." : "Telecharger PDF"}
                  </Button>
                </div>
                {exportError ? (
                  <p className="mt-3 text-body-sm text-danger-text">
                    {exportError}
                  </p>
                ) : null}
              </Card>
            </section>
          </AnimatedSection>
        )}
      </div>
    </PageTransition>
  );
}
