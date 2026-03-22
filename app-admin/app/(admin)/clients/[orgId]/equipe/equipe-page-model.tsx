"use client";

import { useState } from "react";
import type { EmailDeliveryProof } from "@praedixa/shared-types/api";

import { useApiGet, useApiPost } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";

import { useClientContext } from "../client-context";

export interface UserItem {
  id: string;
  fullName?: string;
  email: string;
  role: string;
  status: string;
  siteId?: string | null;
  siteName?: string;
  lastLoginAt?: string;
  deliveryProof?: EmailDeliveryProof | null;
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

export function getRoleBadgeClass(role: string) {
  return ROLE_COLORS[role] ?? "bg-surface-sunken text-ink-secondary";
}

export function getRoleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

export function getStatusLabel(status: string) {
  if (status === "active") {
    return "Actif";
  }
  if (status === "deactivated") {
    return "Desactive";
  }
  return status;
}

export function getStatusClassName(status: string) {
  if (status === "active") {
    return "text-success";
  }
  if (status === "deactivated") {
    return "text-danger";
  }
  return "text-ink-tertiary";
}

export function useEquipePageModel() {
  const { orgId, hierarchy, selectedSiteId } = useClientContext();
  const currentUser = useCurrentUser();
  const toast = useToast();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviteSiteId, setInviteSiteId] = useState("");
  const canManageUsers = hasAnyPermission(currentUser?.permissions, [
    "admin:users:write",
  ]);
  const siteScopedInviteRole =
    inviteRole === "manager" || inviteRole === "hr_manager";
  const hasAvailableSites = hierarchy.length > 0;

  const {
    data: users,
    loading,
    error,
    refetch,
  } = useApiGet<UserItem[]>(ADMIN_ENDPOINTS.orgUsers(orgId));

  const { mutate: invite, loading: inviteLoading } = useApiPost<
    { email: string; role: string; site_id?: string },
    unknown
  >(ADMIN_ENDPOINTS.orgUserInvite(orgId));

  async function handleInvite() {
    if (!canManageUsers) {
      toast.error("Permission requise: admin:users:write");
      return;
    }
    if (!inviteEmail) {
      return;
    }
    if (siteScopedInviteRole && !inviteSiteId) {
      toast.error("Selectionne un site pour ce role");
      return;
    }

    const result = await invite({
      email: inviteEmail,
      role: inviteRole,
      ...(siteScopedInviteRole ? { site_id: inviteSiteId } : {}),
    });
    if (result) {
      toast.success("Invitation initialisee. Preuve provider en attente.");
      setInviteEmail("");
      setInviteSiteId("");
      setInviteRole("viewer");
      setShowInviteForm(false);
      refetch();
      return;
    }

    toast.error("Impossible de provisionner le compte");
  }

  function handleInviteRoleChange(nextRole: string) {
    setInviteRole(nextRole);
    if (nextRole === "manager" || nextRole === "hr_manager") {
      setInviteSiteId(selectedSiteId || hierarchy[0]?.id || inviteSiteId);
      return;
    }
    setInviteSiteId("");
  }

  return {
    users: users ?? [],
    loading,
    error,
    refetch,
    canManageUsers,
    showInviteForm,
    setShowInviteForm,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    inviteSiteId,
    setInviteSiteId,
    siteScopedInviteRole,
    hasAvailableSites,
    hierarchy,
    inviteLoading,
    handleInvite,
    handleInviteRoleChange,
  };
}
