"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@praedixa/ui";

import { ReadOnlyStateCard } from "../../../read-only-detail";

export interface MutationReadOnlyState {
  tone?: "empty" | "warning";
  title: string;
  message: string;
}

export function getDispatchPermissionReadOnlyState({
  canManageDispatch,
  contractAllowsWriteback,
  missingWritebackPermissions,
  restrictedTitle,
  restrictedMessage,
  contractBlockedTitle,
  contractBlockedMessage,
  missingPermissionsMessage,
}: {
  canManageDispatch: boolean;
  contractAllowsWriteback: boolean;
  missingWritebackPermissions: readonly string[];
  restrictedTitle: string;
  restrictedMessage: string;
  contractBlockedTitle: string;
  contractBlockedMessage: string;
  missingPermissionsMessage: string;
}): MutationReadOnlyState | null {
  if (!canManageDispatch) {
    return {
      tone: "warning",
      title: restrictedTitle,
      message: restrictedMessage,
    };
  }
  if (!contractAllowsWriteback) {
    return {
      tone: "warning",
      title: contractBlockedTitle,
      message: contractBlockedMessage,
    };
  }
  if (missingWritebackPermissions.length > 0) {
    return {
      tone: "warning",
      title: "Permissions de write-back manquantes",
      message: `${missingPermissionsMessage}: ${missingWritebackPermissions.join(", ")}.`,
    };
  }
  return null;
}

export function MutationReadOnlyCard(props: MutationReadOnlyState) {
  return <ReadOnlyStateCard {...props} />;
}

export function MutationPanelHeader({
  title,
  description,
  statusLabel,
}: {
  title: string;
  description: string;
  statusLabel: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-sm font-medium text-ink-secondary">{title}</h3>
        <p className="text-xs text-ink-tertiary">{description}</p>
      </div>
      {statusLabel ? (
        <span className="rounded-full bg-success-50 px-3 py-1 text-xs text-success-700">
          {statusLabel}
        </span>
      ) : null}
    </div>
  );
}

export function MutationCommentField({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">
        Commentaire optionnel
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-24 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[color:var(--brand)]/20"
      />
    </label>
  );
}

export function MutationErrorText({ message }: { message: string | null }) {
  return message ? <p className="text-sm text-danger-text">{message}</p> : null;
}

export function MutationPanelShell({ children }: { children: ReactNode }) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-5">{children}</CardContent>
    </Card>
  );
}
