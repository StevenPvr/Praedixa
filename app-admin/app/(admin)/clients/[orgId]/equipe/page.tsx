"use client";

import { useState } from "react";
import { useClientContext } from "../client-context";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
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
  super_admin: "bg-violet-100 text-violet-700",
  org_admin: "bg-blue-100 text-blue-700",
  hr_manager: "bg-amber-100 text-amber-700",
  manager: "bg-emerald-100 text-emerald-700",
  employee: "bg-gray-100 text-gray-600",
  viewer: "bg-gray-100 text-gray-500",
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
  const toast = useToast();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");

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
    if (!inviteEmail) return;
    const result = await invite({ email: inviteEmail, role: inviteRole });
    if (result) {
      toast.success("Invitation envoyee");
      setInviteEmail("");
      setShowInviteForm(false);
      refetch();
    } else {
      toast.error("Impossible d'envoyer l'invitation");
    }
  }

  const columns: DataTableColumn<UserItem>[] = [
    {
      key: "fullName",
      label: "Nom",
      render: (row) => (
        <div>
          <p className="font-medium text-neutral-900">{row.fullName ?? "-"}</p>
          <p className="text-xs text-neutral-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[row.role] ?? "bg-gray-100 text-gray-600"}`}
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
              ? "text-green-600"
              : row.status === "deactivated"
                ? "text-red-500"
                : "text-neutral-500"
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
        <span className="text-xs text-neutral-500">
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
        <h2 className="font-serif text-lg font-semibold text-neutral-900">
          Equipe
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInviteForm(!showInviteForm)}
        >
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Inviter
        </Button>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="nom@entreprise.com"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              disabled={inviteLoading || !inviteEmail}
            >
              Envoyer
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
