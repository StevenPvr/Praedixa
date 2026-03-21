"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import type {
  CompleteOnboardingCaseTaskRequest,
  CreateOnboardingCaseRequest,
  OnboardingCaseLifecycleRequest,
  OnboardingCaseBundle,
  OnboardingCaseDetail,
  OnboardingCaseSummary,
} from "@praedixa/shared-types/api";
import { Button, SkeletonCard, StatCard } from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";
import { useApiGet, useApiGetPaginated, useApiPost } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ApiError, apiPost } from "@/lib/api/client";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUserState, getValidAccessToken } from "@/lib/auth/client";
import {
  USERS_ACCESS,
  USERS_WRITE,
} from "@/lib/auth/admin-route-policy-shared";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { readAccessInviteRecipients } from "./access-model-task-fields";
import { CaseListCard } from "./case-list-card";
import { CaseWorkspaceCard } from "./case-workspace-card";
import { CreateCaseCard } from "./create-case-card";
import {
  DEFAULT_FORM_STATE,
  type OnboardingFormState,
  type OrgUserItem,
  normalizeIsoDate,
  statsSourceFromCases,
} from "./page-model";
import { useClientContext } from "../client-context";

export default function OnboardingPage() {
  const { orgId, orgName, hierarchy } = useClientContext();
  const toast = useToast();
  const { user: currentUser, loading: currentUserLoading } =
    useCurrentUserState();
  const [page, setPage] = useState(1);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [form, setForm] = useState<OnboardingFormState>(DEFAULT_FORM_STATE);
  const canReadOrgUsers = hasAnyPermission(
    currentUser?.permissions,
    USERS_ACCESS,
  );
  const canInviteOrgUsers = hasAnyPermission(
    currentUser?.permissions,
    USERS_WRITE,
  );

  const {
    data: cases,
    total,
    loading: casesLoading,
    error: casesError,
    refetch: refetchCases,
  } = useApiGetPaginated<OnboardingCaseSummary>(
    ADMIN_ENDPOINTS.orgOnboardingCases(orgId),
    page,
    20,
  );

  const {
    data: users,
    loading: usersLoading,
    error: usersError,
  } = useApiGet<OrgUserItem[]>(
    canReadOrgUsers ? ADMIN_ENDPOINTS.orgUsers(orgId) : null,
  );

  const {
    data: caseBundle,
    loading: caseDetailLoading,
    error: caseDetailError,
    refetch: refetchCaseDetail,
  } = useApiGet<OnboardingCaseBundle>(
    selectedCaseId
      ? ADMIN_ENDPOINTS.orgOnboardingCase(orgId, selectedCaseId)
      : null,
  );

  const createCase = useApiPost<
    CreateOnboardingCaseRequest,
    OnboardingCaseDetail
  >(ADMIN_ENDPOINTS.orgOnboardingCases(orgId));
  const [lifecycleAction, setLifecycleAction] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [sendingInviteTaskId, setSendingInviteTaskId] = useState<string | null>(
    null,
  );

  type InvitedUserResponse = {
    id: string;
    email: string;
    role: string;
    status: string;
    siteId?: string | null;
    siteName?: string | null;
    invitedAt: string;
  };

  useEffect(() => {
    if (createCase.error) {
      toast.error(createCase.error);
    }
  }, [createCase.error, toast]);

  useEffect(() => {
    if (cases.length === 0) {
      if (selectedCaseId != null) {
        setSelectedCaseId(null);
      }
      return;
    }

    const selectedStillExists = cases.some(
      (item) => item.id === selectedCaseId,
    );
    if (!selectedStillExists) {
      setSelectedCaseId(cases[0]?.id ?? null);
    }
  }, [cases, selectedCaseId]);

  const statsSource = statsSourceFromCases(caseBundle ?? null, cases);
  const effectiveUsersLoading =
    currentUserLoading || (canReadOrgUsers && usersLoading);
  const effectiveUsersError =
    !currentUserLoading && !canReadOrgUsers
      ? "Le profil courant ne peut pas charger les comptes client. Owner, sponsor et invitations restent masques tant que `admin:users:*` n'est pas accorde."
      : usersError;

  async function handleCreateCase() {
    if (form.sourceModes.length === 0) {
      toast.error("Selectionne au moins une source critique.");
      return;
    }
    if (form.subscriptionModules.length === 0) {
      toast.error("Selectionne au moins un module souscrit.");
      return;
    }
    if (form.selectedPacks.length === 0) {
      toast.error("Selectionne au moins un pack DecisionOps.");
      return;
    }

    const created = await createCase.mutate({
      ownerUserId: form.ownerUserId || null,
      sponsorUserId: form.sponsorUserId || null,
      activationMode: form.activationMode,
      environmentTarget: form.environmentTarget,
      dataResidencyRegion: form.dataResidencyRegion,
      subscriptionModules: form.subscriptionModules,
      selectedPacks: form.selectedPacks,
      sourceModes: form.sourceModes,
      targetGoLiveAt: normalizeIsoDate(form.targetGoLiveAt),
      metadataJson: {
        createdFrom: "client-onboarding-workspace",
      },
    });

    if (!created) {
      return;
    }

    setForm(DEFAULT_FORM_STATE);
    setSelectedCaseId(created.id);
    toast.success("Case onboarding cree");
    refetchCases();
    refetchCaseDetail();
  }

  async function handleSaveTask(
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) {
    if (!selectedCaseId) {
      return;
    }

    setSavingTaskId(taskId);
    try {
      await apiPost<OnboardingCaseBundle>(
        ADMIN_ENDPOINTS.orgOnboardingTaskSave(orgId, selectedCaseId, taskId),
        { note, payloadJson },
        async () => getValidAccessToken(),
      );
      toast.success("Brouillon onboarding enregistre");
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Impossible d'enregistrer le brouillon onboarding",
      );
    } finally {
      setSavingTaskId(null);
    }
  }

  async function handleCompleteTask(
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) {
    if (!selectedCaseId) {
      return;
    }

    setCompletingTaskId(taskId);
    try {
      await apiPost<OnboardingCaseBundle>(
        ADMIN_ENDPOINTS.orgOnboardingTaskComplete(
          orgId,
          selectedCaseId,
          taskId,
        ),
        { note, payloadJson } satisfies CompleteOnboardingCaseTaskRequest,
        async () => getValidAccessToken(),
      );
      toast.success("Tache onboarding completee");
      refetchCases();
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Impossible de completer la tache onboarding",
      );
    } finally {
      setCompletingTaskId(null);
    }
  }

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
          const invited = await apiPost<InvitedUserResponse>(
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
            errorMessage: null,
          });
        } catch (error) {
          nextRecipients.push({
            ...recipient,
            status: "failed" as const,
            errorMessage:
              error instanceof ApiError
                ? error.message
                : "Impossible d'envoyer l'invitation securisee",
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
          `${failedCount} invitation(s) n'ont pas pu etre envoyees. Le brouillon onboarding a ete mis a jour.`,
        );
      } else {
        toast.success("Invitations securisees envoyees");
      }
      refetchCases();
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Impossible d'enregistrer les invitations securisees dans l'onboarding",
      );
    } finally {
      setSendingInviteTaskId(null);
    }
  }

  async function handleRecomputeReadiness() {
    if (!selectedCaseId) {
      return;
    }

    setLifecycleAction("recompute");
    try {
      await apiPost<OnboardingCaseBundle>(
        ADMIN_ENDPOINTS.orgOnboardingCaseRecompute(orgId, selectedCaseId),
        {},
        async () => getValidAccessToken(),
      );
      toast.success("Readiness onboarding recalculee");
      refetchCases();
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Impossible de recalculer la readiness onboarding",
      );
    } finally {
      setLifecycleAction(null);
    }
  }

  async function handleCancelCase() {
    if (!selectedCaseId) {
      return;
    }

    setLifecycleAction("cancel");
    try {
      await apiPost<OnboardingCaseBundle>(
        ADMIN_ENDPOINTS.orgOnboardingCaseCancel(orgId, selectedCaseId),
        {
          reason: "Cancelled from admin onboarding workspace",
        } satisfies OnboardingCaseLifecycleRequest,
        async () => getValidAccessToken(),
      );
      toast.success("Case onboarding annule");
      refetchCases();
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Impossible d'annuler le case onboarding",
      );
    } finally {
      setLifecycleAction(null);
    }
  }

  async function handleReopenCase() {
    if (!selectedCaseId) {
      return;
    }

    setLifecycleAction("reopen");
    try {
      const response = await apiPost<OnboardingCaseDetail>(
        ADMIN_ENDPOINTS.orgOnboardingCaseReopen(orgId, selectedCaseId),
        {
          reason: "Reopened from admin onboarding workspace",
        } satisfies OnboardingCaseLifecycleRequest,
        async () => getValidAccessToken(),
      );
      setSelectedCaseId(response.data.id);
      toast.success("Nouveau case onboarding cree depuis la reouverture");
      refetchCases();
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Impossible de rouvrir le case onboarding",
      );
    } finally {
      setLifecycleAction(null);
    }
  }

  if (casesError) {
    return <ErrorFallback message={casesError} onRetry={refetchCases} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-lg font-semibold text-ink">
          Onboarding BPM
        </h2>
        <p className="text-sm text-ink-tertiary">
          Control plane d&apos;activation pour {orgName}: scope, sources,
          readiness, blockers et preparation go-live.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cases ouverts"
          value={String(total)}
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          label="Readiness"
          value={statsSource?.lastReadinessStatus ?? "absent"}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Taches ouvertes"
          value={String(statsSource?.openTaskCount ?? 0)}
          icon={<Workflow className="h-4 w-4" />}
        />
        <StatCard
          label="Blockers ouverts"
          value={String(statsSource?.openBlockerCount ?? 0)}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {casesLoading || effectiveUsersLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <CreateCaseCard
          form={form}
          users={users ?? []}
          usersError={effectiveUsersError}
          disabled={createCase.loading || casesLoading || effectiveUsersLoading}
          onCreate={handleCreateCase}
          onChange={setForm}
        />

        <div className="space-y-6">
          <CaseListCard
            cases={cases}
            selectedCaseId={selectedCaseId}
            onSelect={setSelectedCaseId}
          />

          {caseDetailLoading ? <SkeletonCard /> : null}
          <CaseWorkspaceCard
            orgId={orgId}
            hierarchy={hierarchy}
            bundle={caseBundle ?? null}
            loading={caseDetailLoading}
            error={caseDetailError}
            onRetry={refetchCaseDetail}
            onRecomputeReadiness={handleRecomputeReadiness}
            onCancelCase={handleCancelCase}
            onReopenCase={handleReopenCase}
            onSaveTask={handleSaveTask}
            lifecycleAction={lifecycleAction}
            completingTaskId={completingTaskId}
            savingTaskId={savingTaskId}
            sendingInviteTaskId={sendingInviteTaskId}
            canSendSecureInvites={canInviteOrgUsers}
            onCompleteTask={handleCompleteTask}
            onSendSecureInvites={handleSendSecureInvites}
          />
        </div>
      </div>

      {total > 20 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
          >
            Precedent
          </Button>
          <span className="text-xs text-ink-tertiary">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => value + 1)}
          >
            Suivant
          </Button>
        </div>
      ) : null}
    </div>
  );
}
