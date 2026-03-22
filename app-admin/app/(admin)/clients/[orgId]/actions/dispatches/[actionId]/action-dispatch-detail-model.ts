"use client";

import type { ActionDispatchDetailResponse } from "@praedixa/shared-types/api";

export type DispatchViewModel = {
  hasTimeline: boolean;
  hasPayloadRefs: boolean;
  degradedReasons: string[];
};

export type DispatchExecutionMetadataItem = {
  label: string;
  value: string;
};

function normalizePermissionKey(value: string): string {
  return value.trim().toLowerCase();
}

function formatCapabilityKey(key: string): string {
  const normalizedKey = key.startsWith("supports")
    ? key.slice("supports".length)
    : key;

  return normalizedKey
    .replaceAll(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase();
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function collectMissingPermissions(
  granted: readonly string[] | undefined,
  required: readonly string[],
): string[] {
  const grantedSet = new Set(
    (granted ?? []).map((value) => normalizePermissionKey(value)),
  );
  return required.filter(
    (value) => !grantedSet.has(normalizePermissionKey(value)),
  );
}

export function joinCapabilities(
  capabilities: ActionDispatchDetailResponse["destination"]["capabilities"],
): string {
  const enabled = Object.entries(capabilities)
    .filter(([, enabledValue]) => enabledValue === true)
    .map(([key]) => formatCapabilityKey(key));
  return enabled.length > 0 ? enabled.join(", ") : "Aucune";
}

export function buildDispatchViewModel(
  data: ActionDispatchDetailResponse,
): DispatchViewModel {
  const degradedReasons: string[] = [];
  if (data.timeline.length === 0) {
    degradedReasons.push(
      "La timeline d'execution n'est pas encore archivee pour ce dispatch.",
    );
  }
  if (data.payloadRefs.length === 0) {
    degradedReasons.push(
      "Les references de payload et d'idempotence sont encore partielles.",
    );
  }

  return {
    hasTimeline: data.timeline.length > 0,
    hasPayloadRefs: data.payloadRefs.length > 0,
    degradedReasons,
  };
}

export function buildDispatchExecutionMetadata(
  data: ActionDispatchDetailResponse,
  contractAllowsWriteback: boolean,
): DispatchExecutionMetadataItem[] {
  return [
    { label: "Action", value: data.actionId },
    { label: "Contrat", value: `${data.contractId} v${data.contractVersion}` },
    {
      label: "Destination",
      value: `${data.destination.system} · ${data.destination.targetResourceType}`,
    },
    {
      label: "Write-back",
      value: contractAllowsWriteback ? "autorise" : "bloque",
    },
    {
      label: "Capacites",
      value: joinCapabilities(data.destination.capabilities),
    },
    {
      label: "Permissions requises",
      value:
        data.permissions.permissionKeys.length > 0
          ? data.permissions.permissionKeys.join(", ")
          : "Aucune",
    },
    { label: "Cree le", value: formatDateTime(data.createdAt) },
    { label: "Mis a jour", value: formatDateTime(data.updatedAt) },
  ];
}
