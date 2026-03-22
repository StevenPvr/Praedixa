"use client";

import { UserPlus } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  type DataTableColumn,
} from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";
import type { SiteHierarchy } from "../client-context";
import {
  getRoleBadgeClass,
  getRoleLabel,
  getStatusClassName,
  getStatusLabel,
  type UserItem,
} from "./equipe-page-model";

function deliveryProofLabel(user: UserItem): string {
  const proof = user.deliveryProof;
  if (!proof) {
    return user.status === "pending_invite"
      ? "En attente du webhook provider"
      : "-";
  }

  switch (proof.status) {
    case "pending":
      return "En attente du webhook provider";
    case "provider_accepted":
      return "Accepte par le provider";
    case "delivery_delayed":
      return "Livraison retardee";
    case "delivered":
      return "Livraison prouvee";
    case "bounced":
      return "Bounce";
    case "complained":
      return "Plainte";
    case "failed":
      return "Echec";
    default:
      return proof.status;
  }
}

const USER_COLUMNS: DataTableColumn<UserItem>[] = [
  {
    key: "fullName",
    label: "Nom",
    render: (row) => (
      <div>
        <p className="font-medium text-ink">{row.fullName ?? "-"}</p>
        <p className="text-xs text-ink-tertiary">{row.email}</p>
      </div>
    ),
  },
  {
    key: "role",
    label: "Role",
    render: (row) => {
      const badgeClassName = getRoleBadgeClass(row.role);
      const className = `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClassName}`;
      return <span className={className}>{getRoleLabel(row.role)}</span>;
    },
  },
  {
    key: "status",
    label: "Statut",
    render: (row) => (
      <span className={getStatusClassName(row.status)}>
        {getStatusLabel(row.status)}
      </span>
    ),
  },
  {
    key: "siteName",
    label: "Site",
    render: (row) => <span>{row.siteName ?? "-"}</span>,
  },
  {
    key: "lastLoginAt",
    label: "Derniere connexion",
    render: (row) => {
      const lastLoginLabel = row.lastLoginAt
        ? new Date(row.lastLoginAt).toLocaleDateString("fr-FR")
        : "Jamais";
      return (
        <span className="text-xs text-ink-tertiary">{lastLoginLabel}</span>
      );
    },
  },
  {
    key: "deliveryProof",
    label: "Preuve mail",
    render: (row) => (
      <span className="text-xs text-ink-tertiary">
        {deliveryProofLabel(row)}
      </span>
    ),
  },
];

type EquipeHeaderProps = {
  canManageUsers: boolean;
  showInviteForm: boolean;
  onToggleInviteForm: () => void;
};

type InviteUserCardProps = {
  showInviteForm: boolean;
  inviteEmail: string;
  inviteRole: string;
  inviteSiteId: string;
  hierarchy: SiteHierarchy[];
  canManageUsers: boolean;
  inviteLoading: boolean;
  siteScopedInviteRole: boolean;
  hasAvailableSites: boolean;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: string) => void;
  onInviteSiteIdChange: (value: string) => void;
  onInvite: () => Promise<void>;
};

type EquipeUsersTableProps = {
  users: UserItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function EquipeHeader(props: Readonly<EquipeHeaderProps>) {
  const { canManageUsers, onToggleInviteForm } = props;
  const hasManageUsersPermission = canManageUsers;
  const permissionNotice =
    hasManageUsersPermission === false ? (
      <p className="text-sm text-ink-tertiary">
        <span>
          Mode lecture seule. Permission requise pour inviter un
          utilisateur:{" "}
        </span>
        <span className="font-medium text-ink">admin:users:write</span>
      </p>
    ) : null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-ink">Equipe</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={hasManageUsersPermission === false}
          onClick={onToggleInviteForm}
        >
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Creer un compte
        </Button>
      </div>
      {permissionNotice}
    </div>
  );
}

export function InviteUserCard(props: Readonly<InviteUserCardProps>) {
  const {
    showInviteForm,
    inviteEmail,
    inviteRole,
    inviteSiteId,
    hierarchy,
    canManageUsers,
    inviteLoading,
    siteScopedInviteRole,
    hasAvailableSites,
    onInviteEmailChange,
    onInviteRoleChange,
    onInviteSiteIdChange,
    onInvite,
  } = props;
  if (!showInviteForm) {
    return null;
  }
  const hasManageUsersPermission = canManageUsers;
  const hasInviteEmail = inviteEmail.length > 0;
  const hasSelectedInviteSite = inviteSiteId.length > 0;
  const needsSiteSelection = siteScopedInviteRole;
  const canSubmitInvite =
    hasManageUsersPermission &&
    inviteLoading === false &&
    hasInviteEmail &&
    (needsSiteSelection === false || hasSelectedInviteSite);
  const isMissingAvailableSites = hasAvailableSites === false;
  const inviteEmailId = "invite-user-email";
  const inviteRoleId = "invite-user-role";
  const inviteSiteIdField = "invite-user-site";

  async function handleInviteClick() {
    await onInvite();
  }

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1">
          <label
            htmlFor={inviteEmailId}
            className="mb-1 block text-xs font-medium text-ink-tertiary"
          >
            Email
          </label>
          <input
            id={inviteEmailId}
            type="email"
            value={inviteEmail}
            onChange={(e) => onInviteEmailChange(e.target.value)}
            placeholder="nom@entreprise.com"
            className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label
            htmlFor={inviteRoleId}
            className="mb-1 block text-xs font-medium text-ink-tertiary"
          >
            Role
          </label>
          <select
            id={inviteRoleId}
            value={inviteRole}
            onChange={(e) => onInviteRoleChange(e.target.value)}
            className="rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="viewer">Lecteur</option>
            <option value="employee">Employe</option>
            <option value="manager">Manager</option>
            <option value="hr_manager">RH</option>
            <option value="org_admin">Admin Org</option>
          </select>
        </div>
        {siteScopedInviteRole ? (
          <div>
            <label
              htmlFor={inviteSiteIdField}
              className="mb-1 block text-xs font-medium text-ink-tertiary"
            >
              Site
            </label>
            <select
              id={inviteSiteIdField}
              value={inviteSiteId}
              onChange={(e) => onInviteSiteIdChange(e.target.value)}
              className="rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selectionner un site</option>
              {hierarchy.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.city ? `${site.name} - ${site.city}` : site.name}
                </option>
              ))}
            </select>
            {isMissingAvailableSites ? (
              <p className="mt-1 text-xs text-danger">
                Cree d&apos;abord un site pour provisionner un Manager ou un
                compte RH.
              </p>
            ) : null}
          </div>
        ) : null}
        <Button
          size="sm"
          onClick={handleInviteClick}
          disabled={canSubmitInvite === false}
        >
          Creer
        </Button>
      </CardContent>
    </Card>
  );
}

export function EquipeUsersTable(props: Readonly<EquipeUsersTableProps>) {
  const { users, loading, error, refetch } = props;
  if (loading) {
    return <div data-testid="skeleton-card" />;
  }

  if (error) {
    return <ErrorFallback message={error} onRetry={refetch} />;
  }

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="p-0">
        <DataTable
          columns={USER_COLUMNS}
          data={users}
          getRowKey={(row) => row.id}
        />
      </CardContent>
    </Card>
  );
}
