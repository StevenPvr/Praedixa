"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { Button, Card, CardContent } from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";
import { OnboardingStatusBadge } from "@/components/onboarding-status-badge";
import type { SiteHierarchy } from "../client-context";
import type { OnboardingCaseBundle } from "./page-model";
import { blockerTone, isTaskActionable, taskTone } from "./page-model";
import { TaskActionCard } from "./task-action-card";

type CaseWorkspaceCardProps = {
  orgId: string;
  hierarchy: SiteHierarchy[];
  bundle: OnboardingCaseBundle | null;
  loading: boolean;
  error: string | null;
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
  lifecycleAction: string | null;
  savingTaskId: string | null;
  completingTaskId: string | null;
  sendingInviteTaskId: string | null;
  canSendSecureInvites: boolean;
  onSendSecureInvites: (
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) => Promise<void>;
};

export function CaseWorkspaceCard({
  orgId,
  hierarchy,
  bundle,
  loading,
  error,
  onRetry,
  onRecomputeReadiness,
  onCancelCase,
  onReopenCase,
  onSaveTask,
  onCompleteTask,
  lifecycleAction,
  savingTaskId,
  completingTaskId,
  sendingInviteTaskId,
  canSendSecureInvites,
  onSendSecureInvites,
}: CaseWorkspaceCardProps) {
  if (error) {
    return <ErrorFallback message={error} onRetry={onRetry} />;
  }

  if (loading) {
    return null;
  }

  if (!bundle) {
    return (
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-5">
          <p className="text-sm text-ink-tertiary">
            Selectionne un case pour afficher ses taches, blockers et
            evenements.
          </p>
        </CardContent>
      </Card>
    );
  }

  const canReopen =
    bundle.case.status === "cancelled" || bundle.case.status === "completed";
  const canCancel = !canReopen;

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <OnboardingStatusBadge status={bundle.case.status} />
              <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs text-ink-tertiary">
                {bundle.case.phase.replaceAll("_", " ")}
              </span>
            </div>
            <h3 className="text-base font-semibold text-ink">
              Workspace du case selectionne
            </h3>
            <p className="text-sm text-ink-tertiary">
              Readiness {bundle.case.lastReadinessStatus} - score{" "}
              {bundle.case.lastReadinessScore}/100
            </p>
          </div>

          <div className="grid gap-2 text-xs text-ink-tertiary">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>
                Demarre le{" "}
                {new Date(bundle.case.startedAt).toLocaleDateString("fr-FR")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Region {bundle.case.dataResidencyRegion}</span>
            </div>
            <div className="flex items-center gap-2">
              <Rocket className="h-3.5 w-3.5" />
              <span>
                {bundle.case.activationMode} / {bundle.case.environmentTarget}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                disabled={lifecycleAction === "recompute"}
                onClick={() => void onRecomputeReadiness()}
              >
                {lifecycleAction === "recompute" ? "Recalcul..." : "Recalculer"}
              </Button>
              {canCancel ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={lifecycleAction === "cancel"}
                  onClick={() => void onCancelCase()}
                >
                  {lifecycleAction === "cancel" ? "Annulation..." : "Annuler"}
                </Button>
              ) : null}
              {canReopen ? (
                <Button
                  size="sm"
                  disabled={lifecycleAction === "reopen"}
                  onClick={() => void onReopenCase()}
                >
                  {lifecycleAction === "reopen" ? "Reouverture..." : "Rouvrir"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-border bg-surface-sunken/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <ClipboardList className="h-4 w-4 text-ink-tertiary" />
              Taches du case
            </div>
            <div className="space-y-3">
              {bundle.tasks.map((task) => {
                const tone = taskTone(task);
                const Icon = tone.icon;
                const actionable = isTaskActionable(task);
                return (
                  <div key={task.id} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Icon className={`h-4 w-4 ${tone.className}`} />
                      <span className="text-[11px] uppercase tracking-[0.18em] text-ink-tertiary">
                        {task.domain}
                      </span>
                      <span className="text-xs text-ink-tertiary">
                        {tone.label}
                      </span>
                    </div>
                    <TaskActionCard
                      orgId={orgId}
                      hierarchy={hierarchy}
                      task={task}
                      actionable={actionable}
                      saving={savingTaskId === task.id}
                      completing={completingTaskId === task.id}
                      sendingInvites={sendingInviteTaskId === task.id}
                      canSendSecureInvites={canSendSecureInvites}
                      onSaveTask={onSaveTask}
                      onCompleteTask={onCompleteTask}
                      onSendSecureInvites={onSendSecureInvites}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-surface-sunken/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Blockers et signaux
            </div>
            <div className="space-y-3">
              {bundle.blockers.map((blocker) => (
                <div
                  key={blocker.id}
                  className="rounded-xl border border-border bg-card px-3 py-3"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 ${blockerTone(blocker)}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink">
                          {blocker.title}
                        </p>
                        <span className="text-[11px] uppercase tracking-[0.18em] text-ink-tertiary">
                          {blocker.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink-tertiary">
                        {blocker.domain} - {blocker.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-sunken/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
            <Clock3 className="h-4 w-4 text-ink-tertiary" />
            Timeline recente
          </div>
          {bundle.events.length > 0 ? (
            <div className="space-y-3">
              {bundle.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-3"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-info-text" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {event.message}
                    </p>
                    <p className="mt-1 text-xs text-ink-tertiary">
                      {event.eventType} -{" "}
                      {new Date(event.occurredAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-tertiary">
              Aucun evenement n&apos;a encore ete projete pour ce case.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
