"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { ArrowRight, Link2, Save, Send, Upload, Wand2 } from "lucide-react";
import type { OnboardingCaseTask } from "@praedixa/shared-types/api";
import { Button } from "@praedixa/ui";

import type { SiteHierarchy } from "../client-context";
import { hasPendingAccessInvites } from "./access-model-task-fields";
import { taskSurfaceLink } from "./page-model";
import { TextAreaField } from "./task-action-form-fields";
import { TaskActionEditor } from "./task-action-editors";
import { asRecord } from "./task-action-payload";

type TaskActionCardProps = {
  orgId: string;
  hierarchy: SiteHierarchy[];
  task: OnboardingCaseTask;
  actionable: boolean;
  saving: boolean;
  completing: boolean;
  sendingInvites: boolean;
  activatingApiSource: boolean;
  uploadingFileSource: boolean;
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

export function TaskActionCard(props: Readonly<TaskActionCardProps>) {
  const {
    orgId,
    hierarchy,
    task,
    actionable,
    saving,
    completing,
    sendingInvites,
    activatingApiSource,
    uploadingFileSource,
    canSendSecureInvites,
    integrationOptions,
    onSaveTask,
    onCompleteTask,
    onSendSecureInvites,
    onUploadFileSource,
    onActivateApiSource,
  } = props;
  const [note, setNote] = useState("");
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const surfaceLink = taskSurfaceLink(orgId, task.taskKey);
  const disabled = task.status === "done";
  const lastSavedAt =
    typeof task.detailsJson["lastSavedAt"] === "string"
      ? task.detailsJson["lastSavedAt"]
      : null;
  const secureInvitesDisabled =
    disabled ||
    sendingInvites ||
    canSendSecureInvites === false ||
    hasPendingAccessInvites(payload) === false;
  const canCompleteTask =
    disabled === false && completing === false && actionable;
  const saveDisabled = disabled || saving;
  const title = taskTitle(task.taskKey, task.title);
  const summary = taskSummary(task.taskKey);
  const lastSavedAtLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleString("fr-FR")
    : null;
  const hasTaskKey = (key: string) => task.taskKey === key;

  useEffect(() => {
    const draftPayload = asRecord(task.detailsJson["draftPayload"]);
    const completionPayload = asRecord(task.detailsJson["completionPayload"]);
    setPayload(
      Object.keys(draftPayload).length > 0 ? draftPayload : completionPayload,
    );
    setNote(
      typeof task.detailsJson["lastDraftNote"] === "string"
        ? task.detailsJson["lastDraftNote"]
        : "",
    );
  }, [task.id, task.detailsJson]);

  function patchPayload(next: Partial<Record<string, unknown>>) {
    setPayload((current) => ({ ...current, ...next }));
  }

  async function handleSendSecureInvitesClick() {
    await onSendSecureInvites(task.id, payload, note || null);
  }

  async function handleSaveTaskClick() {
    await onSaveTask(task.id, payload, note || null);
  }

  async function handleCompleteTaskClick() {
    await onCompleteTask(task.id, payload, note || null);
  }

  async function handleUploadFileSelection(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    await onUploadFileSource(task.id, payload, file);
  }

  async function handleActivateApiSourceClick() {
    await onActivateApiSource(task.id, payload);
  }

  return (
    <div className="space-y-4 rounded-[1.25rem] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,250,250,0.94))] p-4">
      <TaskHeader
        summary={summary}
        surfaceLink={surfaceLink}
        taskType={task.taskType}
        title={title}
      />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-[1.15rem] border border-border bg-white p-3">
          <TaskActionEditor
            taskKey={task.taskKey}
            payload={payload}
            patchPayload={patchPayload}
            disabled={disabled}
            hierarchy={hierarchy}
            integrationOptions={integrationOptions}
          />
        </div>

        <TaskOperatorState
          actionable={actionable}
          canSendSecureInvites={canSendSecureInvites}
          disabled={disabled}
          lastSavedAtLabel={lastSavedAtLabel}
          note={note}
          setNote={setNote}
          taskKey={task.taskKey}
          taskStatus={task.status}
        />
      </div>

      <TaskPrimaryActions
        activatingApiSource={activatingApiSource}
        canCompleteTask={canCompleteTask}
        completing={completing}
        disabled={disabled}
        hasTaskKey={hasTaskKey}
        fileInputRef={fileInputRef}
        saveDisabled={saveDisabled}
        saving={saving}
        secureInvitesDisabled={secureInvitesDisabled}
        sendingInvites={sendingInvites}
        uploadingFileSource={uploadingFileSource}
        onActivateApiSource={handleActivateApiSourceClick}
        onCompleteTask={handleCompleteTaskClick}
        onSaveTask={handleSaveTaskClick}
        onSendSecureInvites={handleSendSecureInvitesClick}
        onUploadFileSelection={handleUploadFileSelection}
      />
    </div>
  );
}

function TaskHeader(
  props: Readonly<{
    summary: string;
    surfaceLink: { href: string; label: string } | null;
    taskType: string;
    title: string;
  }>,
) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold tracking-tight text-ink">
            {props.title}
          </p>
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-ink-tertiary">
            {props.taskType}
          </span>
        </div>
        <p className="max-w-[62ch] text-sm leading-relaxed text-ink-tertiary">
          {props.summary}
        </p>
      </div>

      {props.surfaceLink ? (
        <Link
          href={props.surfaceLink.href}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-2 text-xs font-medium text-ink-secondary transition hover:border-primary/35 hover:text-primary"
        >
          <Link2 className="h-3.5 w-3.5" />
          {props.surfaceLink.label}
        </Link>
      ) : null}
    </div>
  );
}

function TaskOperatorState(
  props: Readonly<{
    actionable: boolean;
    canSendSecureInvites: boolean;
    disabled: boolean;
    lastSavedAtLabel: string | null;
    note: string;
    setNote: (value: string) => void;
    taskKey: string;
    taskStatus: string;
  }>,
) {
  return (
    <div className="space-y-3 rounded-[1.15rem] border border-border bg-surface-sunken/28 p-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-tertiary">
          Etat operateur
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <TaskMetaPill label="Statut" value={props.taskStatus} />
          <TaskMetaPill
            label="Disponibilite"
            value={props.actionable ? "ouverte" : "en attente"}
          />
        </div>
      </div>

      <TextAreaField
        label="Note operateur"
        value={props.note}
        disabled={props.disabled}
        placeholder="Contexte, preuve, points d'attention..."
        onChange={props.setNote}
      />

      <p className="text-xs text-ink-tertiary">
        {props.lastSavedAtLabel
          ? `Brouillon enregistre le ${props.lastSavedAtLabel}`
          : "Aucun brouillon enregistre pour cette tache."}
      </p>

      {props.canSendSecureInvites === false &&
      props.taskKey === "access-model" ? (
        <InlineNotice>
          Les invitations securisees exigent le droit `admin:users:write`.
        </InlineNotice>
      ) : null}

      {props.actionable === false && props.disabled === false ? (
        <InlineNotice>
          Cette tache deviendra completable quand le moteur de workflow la
          rendra active.
        </InlineNotice>
      ) : null}
    </div>
  );
}

function TaskPrimaryActions(
  props: Readonly<{
    activatingApiSource: boolean;
    canCompleteTask: boolean;
    completing: boolean;
    disabled: boolean;
    hasTaskKey: (key: string) => boolean;
    fileInputRef: RefObject<HTMLInputElement | null>;
    saveDisabled: boolean;
    saving: boolean;
    secureInvitesDisabled: boolean;
    sendingInvites: boolean;
    uploadingFileSource: boolean;
    onActivateApiSource: () => Promise<void>;
    onCompleteTask: () => Promise<void>;
    onSaveTask: () => Promise<void>;
    onSendSecureInvites: () => Promise<void>;
    onUploadFileSelection: (
      event: ChangeEvent<HTMLInputElement>,
    ) => Promise<void>;
  }>,
) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
      {props.hasTaskKey("configure-file-sources") ? (
        <>
          <input
            ref={props.fileInputRef}
            type="file"
            accept=".csv,.tsv,.xlsx"
            aria-label="Selectionner un CSV, TSV ou XLSX source"
            className="hidden"
            onChange={props.onUploadFileSelection}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={props.disabled || props.uploadingFileSource}
            className="rounded-xl"
            onClick={() => props.fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {props.uploadingFileSource ? "Upload..." : "Charger CSV/XLSX"}
          </Button>
        </>
      ) : null}

      {props.hasTaskKey("activate-api-sources") ? (
        <Button
          size="sm"
          variant="outline"
          disabled={props.disabled || props.activatingApiSource}
          className="rounded-xl"
          onClick={props.onActivateApiSource}
        >
          <Wand2 className="mr-1.5 h-4 w-4" />
          {props.activatingApiSource
            ? "Activation..."
            : "Tester et lancer la premiere sync"}
        </Button>
      ) : null}

      {props.hasTaskKey("access-model") ? (
        <Button
          size="sm"
          variant="outline"
          disabled={props.secureInvitesDisabled}
          className="rounded-xl"
          onClick={props.onSendSecureInvites}
        >
          <Send className="mr-1.5 h-4 w-4" />
          {props.sendingInvites ? "Envoi..." : "Envoyer invitations securisees"}
        </Button>
      ) : null}

      <Button
        size="sm"
        variant="outline"
        disabled={props.saveDisabled}
        className="rounded-xl"
        onClick={props.onSaveTask}
      >
        <Save className="mr-1.5 h-4 w-4" />
        {props.saving ? "Enregistrement..." : "Enregistrer"}
      </Button>

      <Button
        size="sm"
        disabled={!props.canCompleteTask}
        className="rounded-xl"
        onClick={props.onCompleteTask}
      >
        <ArrowRight className="mr-1.5 h-4 w-4" />
        {props.completing ? "Traitement..." : "Completer"}
      </Button>
    </div>
  );
}

function TaskMetaPill(props: Readonly<{ label: string; value: string }>) {
  return (
    <span className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-ink-tertiary">
      {props.label}: {props.value}
    </span>
  );
}

function InlineNotice(props: Readonly<{ children: ReactNode }>) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink-tertiary">
      {props.children}
    </div>
  );
}

function taskSummary(taskKey: string): string {
  return (
    TASK_SUMMARIES[taskKey] ??
    "Documente, opere et valide cette etape depuis le workspace."
  );
}

function taskTitle(taskKey: string, fallback: string): string {
  return TASK_TITLES[taskKey] ?? fallback;
}

const TASK_SUMMARIES: Record<string, string> = {
  "scope-contract":
    "Cadre le perimetre contractuel, la residence des donnees et l'environnement cible avant d'ouvrir les flux.",
  "access-model":
    "Definis qui accede au produit, envoies les invitations securisees et verrouilles le modele d'acces client.",
  "source-strategy":
    "Liste les systemes prioritaires et la cadence attendue pour que les imports servent vraiment la V1.",
  "activate-api-sources":
    "Teste une connexion existante, verifie le probe et lance le premier cycle de sync API.",
  "configure-file-sources":
    "Charge un CSV/XLSX, associe le bon profil d'import et verifie que la source est prete pour le pipeline.",
  "publish-mappings":
    "Confirme la couverture de mapping utile avant de retirer la quarantaine sur les champs critiques.",
  "configure-product-scope":
    "Cadre les KPI, horizons et leviers qui seront visibles dans les surfaces client et admin.",
  "activation-review":
    "Passe la revue finale de preparation avant la bascule pilote ou la mise en service controlee.",
  "execute-activation":
    "Formalise la fenetre d'activation, l'operateur responsable et le smoke check post-bascule.",
  "close-hypercare":
    "Cloture la phase de stabilisation quand les incidents, le suivi et le sign-off client sont fermes.",
};

const TASK_TITLES: Record<string, string> = {
  "scope-contract": "Valider le cadrage du dossier",
  "access-model": "Configurer les acces client",
  "source-strategy": "Confirmer la strategie des sources",
  "activate-api-sources": "Activer les sources API",
  "configure-file-sources": "Configurer les imports de fichiers",
  "publish-mappings": "Publier les correspondances",
  "configure-product-scope": "Configurer le perimetre produit",
  "activation-review": "Passer la revue de preparation",
  "execute-activation": "Executer la mise en service",
  "close-hypercare": "Clore la phase de stabilisation",
};
