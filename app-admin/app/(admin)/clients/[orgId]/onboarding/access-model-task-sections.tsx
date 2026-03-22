"use client";

import { Button } from "@praedixa/ui";
import type {
  EmailDeliveryProof,
  OnboardingAccessInviteRecipient,
  OnboardingInviteRole,
} from "@praedixa/shared-types/api";

import type { SiteHierarchy } from "../client-context";

function deliveryProofLabel(
  proof: EmailDeliveryProof | null | undefined,
): string {
  if (!proof) {
    return "preuve provider en attente";
  }

  switch (proof.status) {
    case "pending":
      return "preuve provider en attente";
    case "provider_accepted":
      return "provider a accepte le message";
    case "delivery_delayed":
      return "livraison retardee";
    case "delivered":
      return "livraison prouvee";
    case "bounced":
      return "bounce provider";
    case "complained":
      return "plainte destinataire";
    case "failed":
      return "echec provider";
  }
}

function deliveryProofClassName(
  proof: EmailDeliveryProof | null | undefined,
): string {
  if (!proof) {
    return "text-ink-tertiary";
  }

  switch (proof.status) {
    case "delivered":
      return "text-success";
    case "bounced":
    case "complained":
    case "failed":
      return "text-danger";
    case "provider_accepted":
    case "delivery_delayed":
      return "text-warning";
    case "pending":
      return "text-ink-tertiary";
  }
}

export function AccessModelSecurityFields({
  ssoMode,
  roleModelConfirmed,
  siteScopesValidated,
  disabled,
  onSsoModeChange,
  onRoleModelConfirmedChange,
  onSiteScopesValidatedChange,
}: Readonly<{
  ssoMode: string;
  roleModelConfirmed: boolean;
  siteScopesValidated: boolean;
  disabled: boolean;
  onSsoModeChange: (value: string) => void;
  onRoleModelConfirmedChange: (value: boolean) => void;
  onSiteScopesValidatedChange: (value: boolean) => void;
}>) {
  const ssoModeId = "access-model-sso-mode";
  const roleModelConfirmedId = "access-model-role-model-confirmed";
  const siteScopesValidatedId = "access-model-site-scopes-validated";
  const isDisabled = disabled === true;
  return (
    <div className="grid gap-3">
      <label
        htmlFor={ssoModeId}
        className="space-y-1 text-xs text-ink-tertiary"
      >
        <span>Mode SSO</span>
        <select
          id={ssoModeId}
          value={ssoMode}
          disabled={isDisabled}
          onChange={(event) => onSsoModeChange(event.target.value)}
          className="min-h-[40px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
        >
          <option value="">Selectionner</option>
          <option value="manual">Invitation securisee par email</option>
          <option value="oidc">OIDC</option>
          <option value="saml">SAML</option>
        </select>
      </label>

      <label
        htmlFor={roleModelConfirmedId}
        className="flex items-center gap-2 text-sm text-ink-secondary"
      >
        <input
          id={roleModelConfirmedId}
          type="checkbox"
          checked={roleModelConfirmed}
          disabled={isDisabled}
          aria-label="Modele de roles confirme"
          onChange={(event) => onRoleModelConfirmedChange(event.target.checked)}
        />
        <span>Modele de roles confirme</span>
      </label>

      <label
        htmlFor={siteScopesValidatedId}
        className="flex items-center gap-2 text-sm text-ink-secondary"
      >
        <input
          id={siteScopesValidatedId}
          type="checkbox"
          checked={siteScopesValidated}
          disabled={isDisabled}
          aria-label="Scopes site verifies"
          onChange={(event) =>
            onSiteScopesValidatedChange(event.target.checked)
          }
        />
        <span>Scopes site verifies</span>
      </label>
    </div>
  );
}

export function AccessInviteRecipientsCard({
  disabled,
  hierarchy,
  inviteEmail,
  inviteRole,
  inviteSiteId,
  inviteRoleRequiresSite,
  recipients,
  invitationsReady,
  onInviteEmailChange,
  onInviteRoleChange,
  onInviteSiteIdChange,
  onAddRecipient,
  onRemoveRecipient,
  roleLabel,
  statusLabel,
  statusClassName,
}: Readonly<{
  disabled: boolean;
  hierarchy: SiteHierarchy[];
  inviteEmail: string;
  inviteRole: OnboardingInviteRole;
  inviteSiteId: string;
  inviteRoleRequiresSite: boolean;
  recipients: OnboardingAccessInviteRecipient[];
  invitationsReady: boolean;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: OnboardingInviteRole) => void;
  onInviteSiteIdChange: (value: string) => void;
  onAddRecipient: () => void;
  onRemoveRecipient: (recipient: OnboardingAccessInviteRecipient) => void;
  roleLabel: (role: OnboardingInviteRole) => string;
  statusLabel: (status: OnboardingAccessInviteRecipient["status"]) => string;
  statusClassName: (
    status: OnboardingAccessInviteRecipient["status"],
  ) => string;
}>) {
  const inviteEmailId = "access-invite-email";
  const inviteRoleId = "access-invite-role";
  const inviteSiteIdField = "access-invite-site";
  const isDisabled = disabled === true;
  const canSelectSite = isDisabled === false && inviteRoleRequiresSite;
  const canAddRecipient =
    isDisabled === false &&
    inviteEmail.trim().length > 0 &&
    (inviteRoleRequiresSite === false || inviteSiteId.length > 0);
  const invitationsReadyLabel = invitationsReady
    ? "invitations initialisees cote identite"
    : "au moins une invitation securisee doit etre initialisee avant completion";
  return (
    <div className="rounded-xl border border-border bg-surface-sunken/40 p-3">
      <p className="text-sm font-medium text-ink">
        Invitations securisees comptes client
      </p>
      <p className="mt-1 text-xs text-ink-tertiary">
        Praedixa n&apos;affiche ni n&apos;envoie aucun mot de passe. Chaque
        compte declenche une invitation Keycloak a usage limite pour definir son
        mot de passe lui-meme.
      </p>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto]">
        <label
          htmlFor={inviteEmailId}
          className="space-y-1 text-xs text-ink-tertiary"
        >
          <span>Email</span>
          <input
            id={inviteEmailId}
            type="email"
            value={inviteEmail}
            disabled={isDisabled}
            placeholder="nom@entreprise.com"
            onChange={(event) => onInviteEmailChange(event.target.value)}
            className="min-h-[40px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
          />
        </label>

        <label
          htmlFor={inviteRoleId}
          className="space-y-1 text-xs text-ink-tertiary"
        >
          <span>Role</span>
          <select
            id={inviteRoleId}
            value={inviteRole}
            disabled={isDisabled}
            onChange={(event) =>
              onInviteRoleChange(event.target.value as OnboardingInviteRole)
            }
            className="min-h-[40px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
          >
            <option value="viewer">Lecteur</option>
            <option value="employee">Employe</option>
            <option value="manager">Manager</option>
            <option value="hr_manager">RH</option>
            <option value="org_admin">Admin org</option>
          </select>
        </label>

        <label
          htmlFor={inviteSiteIdField}
          className="space-y-1 text-xs text-ink-tertiary"
        >
          <span>Site</span>
          <select
            id={inviteSiteIdField}
            value={inviteSiteId}
            disabled={canSelectSite === false}
            onChange={(event) => onInviteSiteIdChange(event.target.value)}
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
            disabled={canAddRecipient === false}
            onClick={onAddRecipient}
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
              key={`${recipient.email.toLowerCase()}::${recipient.role}::${recipient.siteId ?? "none"}`}
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
                    ? ` - initialisee le ${new Date(recipient.invitedAt).toLocaleString("fr-FR")}`
                    : ""}
                </p>
                <p
                  className={`text-xs ${deliveryProofClassName(
                    recipient.deliveryProof,
                  )}`}
                >
                  {deliveryProofLabel(recipient.deliveryProof)}
                  {recipient.deliveryProof?.occurredAt
                    ? ` - ${new Date(
                        recipient.deliveryProof.occurredAt,
                      ).toLocaleString("fr-FR")}`
                    : ""}
                </p>
                {recipient.deliveryProof?.summary ? (
                  <p className="text-xs text-ink-tertiary">
                    {recipient.deliveryProof.summary}
                  </p>
                ) : null}
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
                {isDisabled === false ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRemoveRecipient(recipient)}
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
        Etat de l&apos;etape: {invitationsReadyLabel}
      </p>
    </div>
  );
}
