"use client";

import { useMemo, useState } from "react";
import type {
  OnboardingAccessInviteRecipient,
  OnboardingInviteRole,
} from "@praedixa/shared-types/api";
import { Button } from "@praedixa/ui";

import type { SiteHierarchy } from "../client-context";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readTrimmedString(
  payload: Record<string, unknown>,
  key: string,
): string {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(payload: Record<string, unknown>, key: string): boolean {
  return payload[key] === true;
}

function isInviteRoleSiteScoped(role: OnboardingInviteRole): boolean {
  return role === "manager" || role === "hr_manager";
}

function recipientKey(
  recipient: Pick<OnboardingAccessInviteRecipient, "email" | "role" | "siteId">,
): string {
  return `${recipient.email.toLowerCase()}::${recipient.role}::${recipient.siteId ?? "none"}`;
}

export function readAccessInviteRecipients(
  payload: Record<string, unknown>,
): OnboardingAccessInviteRecipient[] {
  const rawValue = payload.inviteRecipients;
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue
    .map((entry) => asRecord(entry))
    .flatMap((entry) => {
      const email = readTrimmedString(entry, "email").toLowerCase();
      const role = readTrimmedString(entry, "role");
      const status = readTrimmedString(entry, "status");
      const delivery = readTrimmedString(entry, "delivery");
      const deliveryChannel = readTrimmedString(entry, "deliveryChannel");
      const passwordHandling = readTrimmedString(entry, "passwordHandling");

      if (
        email.length === 0 ||
        role.length === 0 ||
        status.length === 0 ||
        delivery !== "activation_link" ||
        deliveryChannel !== "keycloak_execute_actions_email" ||
        passwordHandling !== "client_sets_password"
      ) {
        return [];
      }

      return [
        {
          email,
          role: role as OnboardingInviteRole,
          siteId: readTrimmedString(entry, "siteId") || null,
          siteName: readTrimmedString(entry, "siteName") || null,
          status: status as OnboardingAccessInviteRecipient["status"],
          delivery: "activation_link",
          deliveryChannel: "keycloak_execute_actions_email",
          passwordHandling: "client_sets_password",
          invitedAt: readTrimmedString(entry, "invitedAt") || null,
          invitedUserId: readTrimmedString(entry, "invitedUserId") || null,
          errorMessage: readTrimmedString(entry, "errorMessage") || null,
        },
      ];
    });
}

export function hasPendingAccessInvites(
  payload: Record<string, unknown>,
): boolean {
  const recipients = readAccessInviteRecipients(payload);
  return recipients.some((recipient) => recipient.status !== "sent");
}

function roleLabel(role: OnboardingInviteRole): string {
  switch (role) {
    case "org_admin":
      return "Admin org";
    case "hr_manager":
      return "RH";
    case "manager":
      return "Manager";
    case "employee":
      return "Employe";
    case "viewer":
      return "Lecteur";
  }
  return role;
}

function statusLabel(
  status: OnboardingAccessInviteRecipient["status"],
): string {
  switch (status) {
    case "draft":
      return "A envoyer";
    case "sent":
      return "Envoye";
    case "failed":
      return "En echec";
  }
  return status;
}

function statusClassName(
  status: OnboardingAccessInviteRecipient["status"],
): string {
  switch (status) {
    case "sent":
      return "text-success";
    case "failed":
      return "text-danger";
    case "draft":
      return "text-warning";
  }
  return "text-ink-tertiary";
}

type AccessModelTaskFieldsProps = {
  payload: Record<string, unknown>;
  disabled: boolean;
  hierarchy: SiteHierarchy[];
  onChange: (next: Partial<Record<string, unknown>>) => void;
};

export function AccessModelTaskFields({
  payload,
  disabled,
  hierarchy,
  onChange,
}: AccessModelTaskFieldsProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OnboardingInviteRole>("viewer");
  const [inviteSiteId, setInviteSiteId] = useState("");
  const recipients = useMemo(
    () => readAccessInviteRecipients(payload),
    [payload],
  );
  const inviteRoleRequiresSite = isInviteRoleSiteScoped(inviteRole);
  const selectedSite =
    hierarchy.find((site) => site.id === inviteSiteId) ?? null;

  function updateRecipients(nextRecipients: OnboardingAccessInviteRecipient[]) {
    onChange({
      inviteRecipients: nextRecipients,
      invitationsReady:
        nextRecipients.length > 0 &&
        nextRecipients.every((recipient) => recipient.status === "sent"),
      invitedRecipientCount: nextRecipients.filter(
        (recipient) => recipient.status === "sent",
      ).length,
    });
  }

  function handleAddRecipient() {
    const email = inviteEmail.trim().toLowerCase();
    if (disabled || email.length === 0) {
      return;
    }
    if (inviteRoleRequiresSite && inviteSiteId.length === 0) {
      return;
    }

    const nextRecipient: OnboardingAccessInviteRecipient = {
      email,
      role: inviteRole,
      siteId: inviteRoleRequiresSite ? inviteSiteId : null,
      siteName: inviteRoleRequiresSite ? (selectedSite?.name ?? null) : null,
      status: "draft",
      delivery: "activation_link",
      deliveryChannel: "keycloak_execute_actions_email",
      passwordHandling: "client_sets_password",
      invitedAt: null,
      invitedUserId: null,
      errorMessage: null,
    };

    const nextRecipients = [
      ...recipients.filter(
        (recipient) => recipientKey(recipient) !== recipientKey(nextRecipient),
      ),
      nextRecipient,
    ];

    updateRecipients(nextRecipients);
    setInviteEmail("");
    setInviteRole("viewer");
    setInviteSiteId("");
  }

  function handleRemoveRecipient(recipient: OnboardingAccessInviteRecipient) {
    if (disabled) {
      return;
    }
    updateRecipients(
      recipients.filter(
        (entry) => recipientKey(entry) !== recipientKey(recipient),
      ),
    );
  }

  return (
    <div className="grid gap-3">
      <label className="space-y-1 text-xs text-ink-tertiary">
        <span>Mode SSO</span>
        <select
          value={readTrimmedString(payload, "ssoMode")}
          disabled={disabled}
          onChange={(event) => onChange({ ssoMode: event.target.value })}
          className="min-h-[40px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
        >
          <option value="">Selectionner</option>
          <option value="manual">Invitation securisee par email</option>
          <option value="oidc">OIDC</option>
          <option value="saml">SAML</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-secondary">
        <input
          type="checkbox"
          checked={readBoolean(payload, "roleModelConfirmed")}
          disabled={disabled}
          onChange={(event) =>
            onChange({ roleModelConfirmed: event.target.checked })
          }
        />
        <span>Modele de roles confirme</span>
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-secondary">
        <input
          type="checkbox"
          checked={readBoolean(payload, "siteScopesValidated")}
          disabled={disabled}
          onChange={(event) =>
            onChange({ siteScopesValidated: event.target.checked })
          }
        />
        <span>Scopes site verifies</span>
      </label>

      <div className="rounded-xl border border-border bg-surface-sunken/40 p-3">
        <p className="text-sm font-medium text-ink">
          Invitations securisees comptes client
        </p>
        <p className="mt-1 text-xs text-ink-tertiary">
          Praedixa n&apos;affiche ni n&apos;envoie aucun mot de passe. Chaque
          compte recoit un lien d&apos;activation Keycloak a usage limite pour
          definir son mot de passe lui-meme.
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto]">
          <label className="space-y-1 text-xs text-ink-tertiary">
            <span>Email</span>
            <input
              type="email"
              value={inviteEmail}
              disabled={disabled}
              placeholder="nom@entreprise.com"
              onChange={(event) => setInviteEmail(event.target.value)}
              className="min-h-[40px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
            />
          </label>

          <label className="space-y-1 text-xs text-ink-tertiary">
            <span>Role</span>
            <select
              value={inviteRole}
              disabled={disabled}
              onChange={(event) => {
                const nextRole = event.target.value as OnboardingInviteRole;
                setInviteRole(nextRole);
                if (!isInviteRoleSiteScoped(nextRole)) {
                  setInviteSiteId("");
                } else if (!inviteSiteId && hierarchy[0]?.id) {
                  setInviteSiteId(hierarchy[0].id);
                }
              }}
              className="min-h-[40px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
            >
              <option value="viewer">Lecteur</option>
              <option value="employee">Employe</option>
              <option value="manager">Manager</option>
              <option value="hr_manager">RH</option>
              <option value="org_admin">Admin org</option>
            </select>
          </label>

          <label className="space-y-1 text-xs text-ink-tertiary">
            <span>Site</span>
            <select
              value={inviteSiteId}
              disabled={disabled || !inviteRoleRequiresSite}
              onChange={(event) => setInviteSiteId(event.target.value)}
              className="min-h-[40px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
            >
              <option value="">Selectionner un site</option>
              {hierarchy.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.city ? `${site.name} - ${site.city}` : site.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <Button
              size="sm"
              variant="outline"
              disabled={
                disabled ||
                inviteEmail.trim().length === 0 ||
                (inviteRoleRequiresSite && inviteSiteId.length === 0)
              }
              onClick={handleAddRecipient}
            >
              Ajouter
            </Button>
          </div>
        </div>

        {recipients.length === 0 ? (
          <p className="mt-3 text-xs text-ink-tertiary">
            Aucun compte client prepare pour l&apos;instant.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {recipients.map((recipient) => (
              <div
                key={recipientKey(recipient)}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {recipient.email}
                  </p>
                  <p className="text-xs text-ink-tertiary">
                    {roleLabel(recipient.role)}
                    {recipient.siteName ? ` - ${recipient.siteName}` : ""}
                    {recipient.invitedAt
                      ? ` - envoye le ${new Date(recipient.invitedAt).toLocaleString("fr-FR")}`
                      : ""}
                  </p>
                  {recipient.errorMessage ? (
                    <p className="text-xs text-danger">
                      {recipient.errorMessage}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium ${statusClassName(recipient.status)}`}
                  >
                    {statusLabel(recipient.status)}
                  </span>
                  {!disabled ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveRecipient(recipient)}
                    >
                      Retirer
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-ink-tertiary">
          Etat de l&apos;etape:{" "}
          {readBoolean(payload, "invitationsReady")
            ? "invitations envoyees et evidence complete"
            : "au moins une invitation securisee doit etre envoyee avant completion"}
        </p>
      </div>
    </div>
  );
}
