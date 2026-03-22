"use client";

import { Card, CardContent } from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";
import type { SiteHierarchy } from "../client-context";
import type { OnboardingCaseBundle, OnboardingUiStepKey } from "./page-model";
import { CaseWorkspaceAside } from "./case-workspace-aside";
import { CaseWorkspaceHeader } from "./case-workspace-header";
import {
  CaseWorkspaceEmptyState,
  CaseWorkspaceTaskPanel,
} from "./case-workspace-sections";

type CaseWorkspaceCardProps = {
  orgId: string;
  hierarchy: SiteHierarchy[];
  bundle: OnboardingCaseBundle | null;
  loading: boolean;
  error: string | null;
  currentStep: OnboardingUiStepKey;
  onRetry: () => void;
  onRecomputeReadiness: () => Promise<void>;
  onCancelCase: () => Promise<void>;
  onReopenCase: () => Promise<void>;
  onSaveTask: (
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) => Promise<void>;
  onCompleteTask: (
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) => Promise<void>;
  integrationOptions: Array<{ value: string; label: string }>;
  lifecycleAction: string | null;
  savingTaskId: string | null;
  completingTaskId: string | null;
  sendingInviteTaskId: string | null;
  activatingApiSourceTaskId: string | null;
  uploadingFileSourceTaskId: string | null;
  canSendSecureInvites: boolean;
  onSendSecureInvites: (
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) => Promise<void>;
  onActivateApiSource: (
    taskId: string,
    payloadJson: Record<string, unknown>,
  ) => Promise<void>;
  onUploadFileSource: (
    taskId: string,
    payloadJson: Record<string, unknown>,
    file: File | null,
  ) => Promise<void>;
};

export function CaseWorkspaceCard(props: Readonly<CaseWorkspaceCardProps>) {
  const {
    orgId,
    hierarchy,
    bundle,
    loading,
    error,
    currentStep,
    onRetry,
    onRecomputeReadiness,
    onCancelCase,
    onReopenCase,
    onSaveTask,
    onCompleteTask,
    integrationOptions,
    lifecycleAction,
    savingTaskId,
    completingTaskId,
    sendingInviteTaskId,
    activatingApiSourceTaskId,
    uploadingFileSourceTaskId,
    canSendSecureInvites,
    onSendSecureInvites,
    onActivateApiSource,
    onUploadFileSource,
  } = props;

  if (error) {
    return <ErrorFallback message={error} onRetry={onRetry} />;
  }

  if (loading) {
    return null;
  }

  if (bundle == null) {
    return <CaseWorkspaceEmptyState />;
  }

  return (
    <Card className="rounded-[2rem] border border-border bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.18)]">
      <CardContent className="space-y-6 p-5 md:p-6">
        <CaseWorkspaceHeader
          bundle={bundle}
          currentStep={currentStep}
          lifecycleAction={lifecycleAction}
          onRecomputeReadiness={onRecomputeReadiness}
          onCancelCase={onCancelCase}
          onReopenCase={onReopenCase}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <CaseWorkspaceTaskPanel
            orgId={orgId}
            hierarchy={hierarchy}
            bundle={bundle}
            currentStep={currentStep}
            savingTaskId={savingTaskId}
            completingTaskId={completingTaskId}
            sendingInviteTaskId={sendingInviteTaskId}
            activatingApiSourceTaskId={activatingApiSourceTaskId}
            uploadingFileSourceTaskId={uploadingFileSourceTaskId}
            canSendSecureInvites={canSendSecureInvites}
            integrationOptions={integrationOptions}
            onSaveTask={onSaveTask}
            onCompleteTask={onCompleteTask}
            onSendSecureInvites={onSendSecureInvites}
            onActivateApiSource={onActivateApiSource}
            onUploadFileSource={onUploadFileSource}
          />

          <CaseWorkspaceAside bundle={bundle} currentStep={currentStep} />
        </div>
      </CardContent>
    </Card>
  );
}
