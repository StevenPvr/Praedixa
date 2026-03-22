"use client";

import { useState } from "react";
import type {
  OnboardingAccessInviteRecipient,
  OnboardingCaseBundle,
} from "@praedixa/shared-types/api";

import { apiPost } from "@/lib/api/client";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { getValidAccessToken } from "@/lib/auth/client";
import { readAccessInviteRecipients } from "./access-model-task-fields";
import {
  getErrorMessage,
  type OnboardingCaseActionContext,
} from "./onboarding-case-actions.shared";

type UseOnboardingCaseInviteActionsArgs = OnboardingCaseActionContext & {
  canInviteOrgUsers: boolean;
};

export function useOnboardingCaseInviteActions({
  orgId,
  selectedCaseId,
  canInviteOrgUsers,
  refetchCases,
  refetchCaseDetail,
  toast,
}: UseOnboardingCaseInviteActionsArgs) {
  const [sendingInviteTaskId, setSendingInviteTaskId] = useState<string | null>(
    null,
  );

  async function handleSendSecureInvites(
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) {
    if (!selectedCaseId) {
      return;
    }
    if (!canInviteOrgUsers) {
      toast.error(
        "Le profil courant ne peut pas envoyer d'invitations securisees.",
      );
      return;
    }

    const recipients = readAccessInviteRecipients(payloadJson);
    if (recipients.length === 0) {
      toast.error("Ajoute au moins un compte client avant l'envoi.");
      return;
    }

    setSendingInviteTaskId(taskId);
    try {
      const nextRecipients = [];
      for (const recipient of recipients) {
        if (recipient.status === "sent") {
          nextRecipients.push(recipient);
          continue;
        }

        try {
          const invited = await apiPost<{
            id: string;
            invitedAt: string;
            siteName?: string | null;
            deliveryProof?: OnboardingAccessInviteRecipient["deliveryProof"];
          }>(
            ADMIN_ENDPOINTS.orgUserInvite(orgId),
            {
              email: recipient.email,
              role: recipient.role,
              ...(recipient.siteId ? { site_id: recipient.siteId } : {}),
            },
            async () => getValidAccessToken(),
          );

          nextRecipients.push({
            ...recipient,
            status: "sent" as const,
            siteName: invited.data.siteName ?? recipient.siteName ?? null,
            invitedAt: invited.data.invitedAt ?? new Date().toISOString(),
            invitedUserId: invited.data.id,
            deliveryProof: invited.data.deliveryProof ?? null,
            errorMessage: null,
          });
        } catch (error) {
          nextRecipients.push({
            ...recipient,
            status: "failed" as const,
            deliveryProof: null,
            errorMessage: getErrorMessage(
              error,
              "Impossible d'envoyer l'invitation securisee",
            ),
          });
        }
      }

      const nextPayload = {
        ...payloadJson,
        invitationDelivery: "activation_link" as const,
        invitationChannel: "keycloak_execute_actions_email" as const,
        passwordHandling: "client_sets_password" as const,
        inviteRecipients: nextRecipients,
        invitationsReady:
          nextRecipients.length > 0 &&
          nextRecipients.every((recipient) => recipient.status === "sent"),
        invitedRecipientCount: nextRecipients.filter(
          (recipient) => recipient.status === "sent",
        ).length,
      };

      await apiPost<OnboardingCaseBundle>(
        ADMIN_ENDPOINTS.orgOnboardingTaskSave(orgId, selectedCaseId, taskId),
        { note, payloadJson: nextPayload },
        async () => getValidAccessToken(),
      );

      const failedCount = nextRecipients.filter(
        (recipient) => recipient.status === "failed",
      ).length;
      if (failedCount > 0) {
        toast.error(
          `${failedCount} invitation(s) n'ont pas pu etre initialisees. Le brouillon onboarding a ete mis a jour.`,
        );
      } else {
        toast.success("Invitations securisees initialisees");
      }
      refetchCases();
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Impossible d'enregistrer les invitations securisees dans l'onboarding",
        ),
      );
    } finally {
      setSendingInviteTaskId(null);
    }
  }

  return {
    sendingInviteTaskId,
    handleSendSecureInvites,
  };
}
