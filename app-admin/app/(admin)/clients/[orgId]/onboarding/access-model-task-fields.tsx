"use client";

import { useMemo, useState } from "react";
import type {
  EmailDeliveryProof,
  OnboardingAccessInviteRecipient,
  OnboardingInviteRole,
} from "@praedixa/shared-types/api";

import type { SiteHierarchy } from "../client-context";
import {
  AccessInviteRecipientsCard,
  AccessModelSecurityFields,
} from "./access-model-task-sections";

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

function readDeliveryProof(
  payload: Record<string, unknown>,
  key: string,
): EmailDeliveryProof | null {
  const value = asRecord(payload[key]);
  const status = readTrimmedString(value, "status");
  const initiatedAt = readTrimmedString(value, "initiatedAt");
  if (!status || !initiatedAt) {
    return null;
  }

  return {
    provider: "resend",
    channel: "keycloak_execute_actions_email",
    delivery: "activation_link",
    status: status as EmailDeliveryProof["status"],
    initiatedAt,
    eventType: readTrimmedString(value, "eventType") || null,
    occurredAt: readTrimmedString(value, "occurredAt") || null,
    observedAt: readTrimmedString(value, "observedAt") || null,
    summary: readTrimmedString(value, "summary") || null,
  };
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
  const rawValue = payload["inviteRecipients"];
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
          deliveryProof: readDeliveryProof(entry, "deliveryProof"),
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
    default: {
      const unreachable: never = role;
      throw new TypeError(`Unhandled invite role: ${unreachable}`);
    }
  }
}

function statusLabel(
  status: OnboardingAccessInviteRecipient["status"],
): string {
  switch (status) {
    case "draft":
      return "A envoyer";
    case "sent":
      return "Initialisee";
    case "failed":
      return "En echec";
    default: {
      const unreachable: never = status;
      throw new TypeError(`Unhandled invite status: ${unreachable}`);
    }
  }
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
    default: {
      const unreachable: never = status;
      throw new TypeError(`Unhandled invite status class: ${unreachable}`);
    }
  }
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
}: Readonly<AccessModelTaskFieldsProps>) {
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
      deliveryProof: null,
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
      <AccessModelSecurityFields
        ssoMode={readTrimmedString(payload, "ssoMode")}
        roleModelConfirmed={readBoolean(payload, "roleModelConfirmed")}
        siteScopesValidated={readBoolean(payload, "siteScopesValidated")}
        disabled={disabled}
        onSsoModeChange={(value) => onChange({ ssoMode: value })}
        onRoleModelConfirmedChange={(value) =>
          onChange({ roleModelConfirmed: value })
        }
        onSiteScopesValidatedChange={(value) =>
          onChange({ siteScopesValidated: value })
        }
      />

      <AccessInviteRecipientsCard
        disabled={disabled}
        hierarchy={hierarchy}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        inviteSiteId={inviteSiteId}
        inviteRoleRequiresSite={inviteRoleRequiresSite}
        recipients={recipients}
        invitationsReady={readBoolean(payload, "invitationsReady")}
        onInviteEmailChange={setInviteEmail}
        onInviteRoleChange={(nextRole) => {
          setInviteRole(nextRole);
          if (!isInviteRoleSiteScoped(nextRole)) {
            setInviteSiteId("");
          } else if (!inviteSiteId && hierarchy[0]?.id) {
            setInviteSiteId(hierarchy[0].id);
          }
        }}
        onInviteSiteIdChange={setInviteSiteId}
        onAddRecipient={handleAddRecipient}
        onRemoveRecipient={handleRemoveRecipient}
        roleLabel={roleLabel}
        statusLabel={statusLabel}
        statusClassName={statusClassName}
      />
    </div>
  );
}
