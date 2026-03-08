"use client";

import { useState } from "react";
import { useClientContext } from "../client-context";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import {
  Card,
  CardContent,
  DataTable,
  Button,
  SkeletonCard,
  type DataTableColumn,
} from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface UserItem {
  id: string;
  fullName?: string;
  email: string;
  role: string;
  status: string;
  siteName?: string;
  lastLoginAt?: string;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-primary-100 text-primary-700",
  org_admin: "bg-info-light text-info-text",
  hr_manager: "bg-primary-100 text-primary-700",
  manager: "bg-success-light text-success-text",
  employee: "bg-surface-sunken text-ink-secondary",
  viewer: "bg-surface-sunken text-ink-tertiary",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  org_admin: "Admin Org",
  hr_manager: "RH",
  manager: "Manager",
  employee: "Employe",
  viewer: "Lecteur",
};

export default function EquipePage() {
  const { orgId } = useClientContext();
  const currentUser = useCurrentUser();
  const toast = useToast();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const canManageUsers = hasAnyPermission(currentUser?.permissions, [
    "admin:users:write",
  ]);

  const {
    data: users,
    loading,
    error,
    refetch,
  } = useApiGet<UserItem[]>(ADMIN_ENDPOINTS.orgUsers(orgId));

  const { mutate: invite, loading: inviteLoading } = useApiPost<
    { email: string; role: string },
    unknown
  >(ADMIN_ENDPOINTS.orgUserInvite(orgId));

  async function handleInvite() {
    if (!canManageUsers) {
      toast.error("Permission requise: admin:users:write");
      return;
    }
    if (!inviteEmail) return;
    const result = await invite({ email: inviteEmail, role: inviteRole });
    if (result) {
      toast.success("Compte cree");
      setInviteEmail("");
      setShowInviteForm(false);
      refetch();
    } else {
      toast.error("Impossible de creer le compte");
    }
  }

  const columns: DataTableColumn<UserItem>[] = [
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
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[row.role] ?? "bg-surface-sunken text-ink-secondary"}`}
        >
          {ROLE_LABELS[row.role] ?? row.role}
        </span>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => (
        <span
          className={
            row.status === "active"
              ? "text-success"
              : row.status === "deactivated"
                ? "text-danger"
                : "text-ink-tertiary"
          }
        >
          {row.status === "active"
            ? "Actif"
            : row.status === "deactivated"
              ? "Desactive"
              : row.status}
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
      render: (row) => (
        <span className="text-xs text-ink-tertiary">
          {row.lastLoginAt
            ? new Date(row.lastLoginAt).toLocaleDateString("fr-FR")
            : "Jamais"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-ink">Equipe</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={!canManageUsers}
          onClick={() => setShowInviteForm(!showInviteForm)}
        >
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Creer un compte
        </Button>
      </div>

      {!canManageUsers ? (
        <p className="text-sm text-ink-tertiary">
          Mode lecture seule. Permission requise pour inviter un utilisateur:
          {" "}
          <span className="font-medium text-ink">admin:users:write</span>
        </p>
      ) : null}

      {/* Invite form */}
      {showInviteForm && (
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-ink-tertiary">
                Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="nom@entreprise.com"
                className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-tertiary">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="viewer">Lecteur</option>
                <option value="employee">Employe</option>
                <option value="manager">Manager</option>
                <option value="hr_manager">RH</option>
                <option value="org_admin">Admin Org</option>
              </select>
            </div>
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={!canManageUsers || inviteLoading || !inviteEmail}
            >
              Creer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      {loading ? (
        <SkeletonCard />
      ) : error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : (
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={users ?? []}
              getRowKey={(row) => row.id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
