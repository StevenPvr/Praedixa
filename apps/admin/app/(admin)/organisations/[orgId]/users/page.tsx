"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
  StatusBadge,
} from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";

interface UserListItem {
  id: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  viewer: "Lecteur",
  super_admin: "Super Admin",
};

const STATUS_VARIANTS: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "neutral"; label: string }
> = {
  active: { variant: "success", label: "Actif" },
  invited: { variant: "info", label: "Invite" },
  suspended: { variant: "warning", label: "Suspendu" },
  disabled: { variant: "danger", label: "Desactive" },
};

export default function OrgUsersPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [page, setPage] = useState(1);

  const { data, total, error, refetch } =
    useApiGetPaginated<UserListItem>(
      ADMIN_ENDPOINTS.orgUsers(orgId),
      page,
      20,
    );

  const columns: DataTableColumn<UserListItem>[] = [
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-charcoal">{row.email}</span>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (row) => (
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {ROLE_LABELS[row.role] ?? row.role}
        </span>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => {
        const mapping = STATUS_VARIANTS[row.status] ?? {
          variant: "neutral" as const,
          label: row.status,
        };
        return (
          <StatusBadge variant={mapping.variant} label={mapping.label} />
        );
      },
    },
    {
      key: "lastLoginAt",
      label: "Derniere connexion",
      render: (row) =>
        row.lastLoginAt ? (
          <span className="text-sm text-gray-500">
            {new Date(row.lastLoginAt).toLocaleDateString("fr-FR")}
          </span>
        ) : (
          <span className="text-sm text-gray-300">Jamais</span>
        ),
    },
    {
      key: "createdAt",
      label: "Inscrit le",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.createdAt).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() =>
            router.push(`/organisations/${encodeURIComponent(orgId)}`)
          }
          className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm text-gray-500 transition-colors hover:text-charcoal"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a l&apos;organisation
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-charcoal">
              Utilisateurs
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {total} utilisateur{total !== 1 ? "s" : ""}
            </p>
          </div>
          <button className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600">
            <UserPlus className="h-4 w-4" />
            Inviter
          </button>
        </div>
      </div>

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          getRowKey={(row) => row.id}
          pagination={{
            page,
            pageSize: 20,
            total,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
