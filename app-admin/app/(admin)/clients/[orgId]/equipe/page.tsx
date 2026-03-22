"use client";

import { SkeletonCard } from "@praedixa/ui";

import {
  EquipeHeader,
  EquipeUsersTable,
  InviteUserCard,
} from "./equipe-sections";
import { useEquipePageModel } from "./equipe-page-model";

export default function EquipePage() {
  const model = useEquipePageModel();
  function handleToggleInviteForm() {
    model.setShowInviteForm((prev) => !prev);
  }

  async function handleInvite() {
    await model.handleInvite();
  }

  const usersTableContent = model.loading ? (
    <SkeletonCard />
  ) : (
    <EquipeUsersTable
      users={model.users}
      loading={model.loading}
      error={model.error}
      refetch={model.refetch}
    />
  );

  return (
    <div className="space-y-6">
      <EquipeHeader
        canManageUsers={model.canManageUsers}
        showInviteForm={model.showInviteForm}
        onToggleInviteForm={handleToggleInviteForm}
      />

      <InviteUserCard
        showInviteForm={model.showInviteForm}
        inviteEmail={model.inviteEmail}
        inviteRole={model.inviteRole}
        inviteSiteId={model.inviteSiteId}
        hierarchy={model.hierarchy}
        canManageUsers={model.canManageUsers}
        inviteLoading={model.inviteLoading}
        siteScopedInviteRole={model.siteScopedInviteRole}
        hasAvailableSites={model.hasAvailableSites}
        onInviteEmailChange={model.setInviteEmail}
        onInviteRoleChange={model.handleInviteRoleChange}
        onInviteSiteIdChange={model.setInviteSiteId}
        onInvite={handleInvite}
      />
      {usersTableContent}
    </div>
  );
}
