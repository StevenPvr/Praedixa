"use client";

import {
  Card,
  CardContent,
  DataTable,
  type DataTableColumn,
} from "@praedixa/ui";
import { Share2 } from "lucide-react";

import { sanitizeHttpHref } from "@/lib/security/navigation";

import type { ProofPack, ShareLinkResponse } from "./rapports-page-model";

type ShareLinkPanelProps = {
  proofList: ProofPack[];
  effectiveProofId: string;
  selectedProofId: string;
  setSelectedProofId: (value: string) => void;
  shareLoading: boolean;
  shareError: string | null;
  shareData: ShareLinkResponse | null;
  onCreateShareLink: () => void;
};

function buildProofColumns(): DataTableColumn<ProofPack>[] {
  return [
    { key: "name", label: "Pack" },
    { key: "status", label: "Statut" },
    {
      key: "generatedAt",
      label: "Genere le",
      render: (row) =>
        row.generatedAt ? (
          <span className="text-xs text-ink-tertiary">
            {new Date(row.generatedAt).toLocaleDateString("fr-FR")}
          </span>
        ) : (
          <span className="text-xs text-ink-tertiary">-</span>
        ),
    },
    {
      key: "downloadUrl",
      label: "Export",
      render: (row) => {
        const safeHref = sanitizeHttpHref(row.downloadUrl);
        return safeHref ? (
          <a
            href={safeHref}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:text-primary-700"
          >
            Telecharger
          </a>
        ) : (
          <span className="text-xs text-ink-tertiary">Indisponible</span>
        );
      },
    },
  ];
}

function ShareLinkPanel(props: Readonly<ShareLinkPanelProps>) {
  const {
    proofList,
    effectiveProofId,
    selectedProofId,
    setSelectedProofId,
    shareLoading,
    shareError,
    shareData,
    onCreateShareLink,
  } = props;
  const proofPackFieldId = "rapports-proof-pack";
  const hasEffectiveProofId = effectiveProofId.length > 0;
  const canCreateShareLink = hasEffectiveProofId && shareLoading === false;
  return (
    <div className="rounded-lg border border-border bg-surface-sunken p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink">
          Partager avec le client
        </h4>
        <Share2 className="h-4 w-4 text-ink-secondary" />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label
          htmlFor={proofPackFieldId}
          className="min-w-[240px] flex-1 space-y-1"
        >
          <span className="text-xs font-medium text-ink-secondary">
            Proof pack
          </span>
          <select
            id={proofPackFieldId}
            value={selectedProofId}
            onChange={(event) => setSelectedProofId(event.target.value)}
            className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-ink"
          >
            {proofList.map((proof) => (
              <option key={proof.id} value={proof.id}>
                {proof.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={canCreateShareLink === false}
          onClick={onCreateShareLink}
          className="h-9 rounded-md bg-primary px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {shareLoading ? "Generation..." : "Generer lien securise"}
        </button>
      </div>
      {shareError ? (
        <p className="mt-2 text-xs text-danger">{shareError}</p>
      ) : null}
      {shareData ? (
        <div className="mt-3 rounded-md border border-border bg-card p-2">
          <p className="text-xs text-ink-secondary">
            Expire le {new Date(shareData.expiresAt).toLocaleString("fr-FR")}
          </p>
          <div className="mt-1 flex gap-2">
            <input
              readOnly
              value={shareData.url}
              className="h-8 flex-1 rounded-md border border-border bg-surface px-2 text-xs text-ink"
            />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(shareData.url);
              }}
              className="h-8 rounded-md border border-border px-2 text-xs font-medium text-ink"
            >
              Copier
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type RapportsProofPackPanelProps = {
  proofList: ProofPack[];
  selectedProofId: string;
  setSelectedProofId: (value: string) => void;
  effectiveProofId: string;
  shareLoading: boolean;
  shareError: string | null;
  shareData: ShareLinkResponse | null;
  onCreateShareLink: () => void;
};

export function RapportsProofPackPanel(
  props: Readonly<RapportsProofPackPanelProps>,
) {
  const {
    proofList,
    selectedProofId,
    setSelectedProofId,
    effectiveProofId,
    shareLoading,
    shareError,
    shareData,
    onCreateShareLink,
  } = props;
  const proofColumns = buildProofColumns();

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-4">
        <DataTable
          columns={proofColumns}
          data={proofList}
          getRowKey={(row) => row.id}
        />
        <ShareLinkPanel
          proofList={proofList}
          effectiveProofId={effectiveProofId}
          selectedProofId={selectedProofId}
          setSelectedProofId={setSelectedProofId}
          shareLoading={shareLoading}
          shareError={shareError}
          shareData={shareData}
          onCreateShareLink={onCreateShareLink}
        />
      </CardContent>
    </Card>
  );
}
