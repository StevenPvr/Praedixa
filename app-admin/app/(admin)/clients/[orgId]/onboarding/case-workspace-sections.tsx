"use client";

import { Card, CardContent } from "@praedixa/ui";

import type { SiteHierarchy } from "../client-context";
import type { OnboardingCaseBundle, OnboardingUiStepKey } from "./page-model";
import { isTaskActionable, tasksForStep, taskTone } from "./page-model";
import { TaskActionCard } from "./task-action-card";

type CaseWorkspaceTaskPanelProps = {
  orgId: string;
  hierarchy: SiteHierarchy[];
  bundle: OnboardingCaseBundle;
  currentStep: OnboardingUiStepKey;
  savingTaskId: string | null;
  completingTaskId: string | null;
  sendingInviteTaskId: string | null;
  activatingApiSourceTaskId: string | null;
  uploadingFileSourceTaskId: string | null;
  canSendSecureInvites: boolean;
  integrationOptions: Array<{ value: string; label: string }>;
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
  onSendSecureInvites: (
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) => Promise<void>;
  onUploadFileSource: (
    taskId: string,
    payloadJson: Record<string, unknown>,
    file: File | null,
  ) => Promise<void>;
  onActivateApiSource: (
    taskId: string,
    payloadJson: Record<string, unknown>,
  ) => Promise<void>;
};

export function CaseWorkspaceEmptyState() {
  return (
    <Card className="rounded-[2rem] border border-border bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.12)]">
      <CardContent className="p-6">
        <div className="rounded-[1.5rem] border border-dashed border-border bg-surface-sunken/25 px-5 py-8">
          <p className="text-sm font-medium text-ink">
            Choisis d&apos;abord un dossier pour afficher l&apos;etape en cours.
          </p>
          <p className="mt-2 max-w-[52ch] text-sm text-ink-tertiary">
            L&apos;assistant affichera ensuite seulement les taches utiles pour
            cette etape.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CaseWorkspaceTaskPanel({
  orgId,
  hierarchy,
  bundle,
  currentStep,
  savingTaskId,
  completingTaskId,
  sendingInviteTaskId,
  activatingApiSourceTaskId,
  uploadingFileSourceTaskId,
  canSendSecureInvites,
  integrationOptions,
  onSaveTask,
  onCompleteTask,
  onSendSecureInvites,
  onUploadFileSource,
  onActivateApiSource,
}: Readonly<CaseWorkspaceTaskPanelProps>) {
  const visibleTasks = tasksForStep(bundle.tasks, currentStep);

  return (
    <div className="space-y-4 rounded-[1.75rem] border border-border bg-[linear-gradient(180deg,rgba(250,250,250,0.95),rgba(245,247,249,0.9))] p-4 md:p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-ink-tertiary">
          Actions de cette etape
        </p>
        <h4 className="mt-2 text-lg font-semibold tracking-tight text-ink">
          Une seule etape, quelques cases a cocher, puis on avance.
        </h4>
      </div>

      {visibleTasks.length > 0 ? (
        <div className="space-y-3">
          {visibleTasks.map((task, index) => {
            const tone = taskTone(task);
            const Icon = tone.icon;
            const actionable = isTaskActionable(task);

            return (
              <section
                key={task.id}
                className="rounded-[1.5rem] border border-border bg-white p-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
                  <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-ink-tertiary">
                    Tache {index + 1}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-ink-secondary">
                    <Icon className={`h-3.5 w-3.5 ${tone.className}`} />
                    {tone.label}
                  </span>
                  {actionable ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                      Action disponible
                    </span>
                  ) : null}
                </div>

                <TaskActionCard
                  orgId={orgId}
                  hierarchy={hierarchy}
                  task={task}
                  actionable={actionable}
                  saving={savingTaskId === task.id}
                  completing={completingTaskId === task.id}
                  sendingInvites={sendingInviteTaskId === task.id}
                  activatingApiSource={activatingApiSourceTaskId === task.id}
                  uploadingFileSource={uploadingFileSourceTaskId === task.id}
                  canSendSecureInvites={canSendSecureInvites}
                  integrationOptions={integrationOptions}
                  onSaveTask={onSaveTask}
                  onCompleteTask={onCompleteTask}
                  onSendSecureInvites={onSendSecureInvites}
                  onUploadFileSource={onUploadFileSource}
                  onActivateApiSource={onActivateApiSource}
                />
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-white px-4 py-6">
          <p className="text-sm font-medium text-ink">
            Cette etape ne contient aucune tache pour ce dossier.
          </p>
          <p className="mt-2 text-sm text-ink-tertiary">
            Passe a l&apos;etape suivante ou reviens au dossier si tu veux
            ouvrir un autre parcours.
          </p>
        </div>
      )}
    </div>
  );
}
