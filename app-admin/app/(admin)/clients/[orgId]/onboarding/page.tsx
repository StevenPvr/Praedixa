"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";
import { CaseListCard } from "./case-list-card";
import { CaseWorkspaceCard } from "./case-workspace-card";
import { CreateCaseCard } from "./create-case-card";
import {
  OnboardingLoadingCards,
  OnboardingNextStepCard,
  OnboardingStepFooter,
  OnboardingStepNavigation,
} from "./onboarding-step-shell";
import {
  firstRelevantStep,
  labelForActivationMode,
  labelForEnvironment,
  type OnboardingUiStepKey,
} from "./page-model";
import { useOnboardingPageModel } from "./use-onboarding-page-model";

export default function OnboardingPage() {
  const {
    orgId,
    orgName,
    hierarchy,
    page,
    setPage,
    total,
    cases,
    casesLoading,
    casesError,
    refetchCases,
    selectedCaseId,
    setSelectedCaseId,
    form,
    setForm,
    users,
    effectiveUsersLoading,
    effectiveUsersError,
    createCaseLoading,
    caseBundle,
    caseDetailLoading,
    caseDetailError,
    refetchCaseDetail,
    lifecycleAction,
    completingTaskId,
    savingTaskId,
    sendingInviteTaskId,
    activatingApiSourceTaskId,
    uploadingFileSourceTaskId,
    integrationOptions,
    canInviteOrgUsers,
    handleCreateCase,
    handleSaveTask,
    handleCompleteTask,
    handleActivateApiSource,
    handleUploadFileSource,
    handleSendSecureInvites,
    handleRecomputeReadiness,
    handleCancelCase,
    handleReopenCase,
  } = useOnboardingPageModel();

  const [currentStep, setCurrentStep] =
    useState<OnboardingUiStepKey>("dossier");

  useEffect(() => {
    if (!selectedCaseId) {
      setCurrentStep("dossier");
      return;
    }
    if (caseBundle) {
      setCurrentStep((step) =>
        step === "dossier" ? firstRelevantStep(caseBundle) : step,
      );
    }
  }, [selectedCaseId, caseBundle]);

  const loadingCards = casesLoading || effectiveUsersLoading;
  const hasPagination = total > 20;
  const selectedCaseSummary = useMemo(() => {
    if (!caseBundle?.case) {
      return null;
    }
    return {
      mode: labelForActivationMode(caseBundle.case.activationMode),
      environment: labelForEnvironment(caseBundle.case.environmentTarget),
      status: caseBundle.case.status,
      phase: caseBundle.case.phase.replaceAll("_", " "),
    };
  }, [caseBundle]);

  if (casesError) {
    return <ErrorFallback message={casesError} onRetry={refetchCases} />;
  }

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <section className="rounded-[2rem] border border-border bg-white px-5 py-6 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.16)] md:px-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-ink-tertiary">
              Onboarding client
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-ink">
              Un parcours pas a pas, etape par etape.
            </h2>
            <p className="max-w-[62ch] text-sm leading-relaxed text-ink-tertiary">
              Pour {orgName}, tu avances ecran par ecran. Chaque etape affiche
              seulement les actions utiles maintenant, avec des cases a cocher
              et des boutons clairs pour continuer.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-surface-sunken/28 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-ink-tertiary">
              Dossier actif
            </p>
            {selectedCaseSummary ? (
              <div className="mt-3 space-y-2 text-sm text-ink-secondary">
                <p className="font-medium text-ink">
                  {selectedCaseSummary.mode} / {selectedCaseSummary.environment}
                </p>
                <p>Etat: {selectedCaseSummary.status}</p>
                <p>Phase: {selectedCaseSummary.phase}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-tertiary">
                Aucun dossier selectionne pour le moment.
              </p>
            )}
          </div>
        </div>

        <OnboardingStepNavigation
          currentStep={currentStep}
          onSelectStep={setCurrentStep}
          selectedCaseId={selectedCaseId}
        />
      </section>

      {loadingCards ? <OnboardingLoadingCards /> : null}

      {currentStep === "dossier" ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
          <CreateCaseCard
            form={form}
            users={users ?? []}
            usersError={effectiveUsersError}
            disabled={
              createCaseLoading || casesLoading || effectiveUsersLoading
            }
            onCreate={handleCreateCase}
            onChange={setForm}
          />

          <div className="space-y-6">
            <CaseListCard
              cases={cases}
              selectedCaseId={selectedCaseId}
              onSelect={setSelectedCaseId}
            />

            <OnboardingNextStepCard
              disabled={!selectedCaseId}
              onClick={() => setCurrentStep("acces")}
            />
          </div>
        </section>
      ) : (
        <CaseWorkspaceCard
          orgId={orgId}
          hierarchy={hierarchy}
          bundle={caseBundle ?? null}
          loading={caseDetailLoading}
          error={caseDetailError}
          currentStep={currentStep}
          onRetry={refetchCaseDetail}
          onRecomputeReadiness={handleRecomputeReadiness}
          onCancelCase={handleCancelCase}
          onReopenCase={handleReopenCase}
          onSaveTask={handleSaveTask}
          lifecycleAction={lifecycleAction}
          completingTaskId={completingTaskId}
          savingTaskId={savingTaskId}
          sendingInviteTaskId={sendingInviteTaskId}
          activatingApiSourceTaskId={activatingApiSourceTaskId}
          uploadingFileSourceTaskId={uploadingFileSourceTaskId}
          canSendSecureInvites={canInviteOrgUsers}
          integrationOptions={integrationOptions}
          onCompleteTask={handleCompleteTask}
          onActivateApiSource={handleActivateApiSource}
          onUploadFileSource={handleUploadFileSource}
          onSendSecureInvites={handleSendSecureInvites}
        />
      )}

      <OnboardingStepFooter
        currentStep={currentStep}
        selectedCaseId={selectedCaseId}
        onSelectStep={setCurrentStep}
      />

      {hasPagination ? (
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
