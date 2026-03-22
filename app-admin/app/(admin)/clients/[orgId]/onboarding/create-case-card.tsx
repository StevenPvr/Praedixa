"use client";

import type { ReactNode } from "react";
import { Rocket } from "lucide-react";
import { Button, Card, CardContent } from "@praedixa/ui";

import type { OnboardingFormState, OrgUserItem } from "./page-model";
import {
  ACTIVATION_MODE_OPTIONS,
  DATA_RESIDENCY_OPTIONS,
  ENVIRONMENT_OPTIONS,
  PACK_OPTIONS,
  SOURCE_MODE_OPTIONS,
  SUBSCRIPTION_MODULE_OPTIONS,
  toggleListValue,
  userLabel,
} from "./page-model";

type CreateCaseCardProps = {
  form: OnboardingFormState;
  users: readonly OrgUserItem[];
  usersError: string | null;
  disabled: boolean;
  onCreate: () => void;
  onChange: (next: OnboardingFormState) => void;
};

export function CreateCaseCard(props: Readonly<CreateCaseCardProps>) {
  const { form, users, usersError, disabled, onCreate, onChange } = props;
  const userOptions = users.map((user) => ({
    value: user.id,
    label: userLabel(user),
  }));
  const sourceModeSummary = joinOrFallback(form.sourceModes, "Aucune source");
  const moduleSummary = joinOrFallback(
    form.subscriptionModules,
    "Aucun module selectionne",
  );
  const packSummary = joinOrFallback(form.selectedPacks, "Aucun pack");

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.18)]">
      <CardContent className="space-y-5 p-0">
        <CreateCaseHeader
          activationMode={form.activationMode}
          environmentTarget={form.environmentTarget}
        />

        <div className="space-y-5 px-5 pb-5">
          <section className="grid gap-3 md:grid-cols-3">
            <SummaryTile label="Sources" value={sourceModeSummary} />
            <SummaryTile label="Modules" value={moduleSummary} />
            <SummaryTile label="Packs" value={packSummary} />
          </section>

          <FieldSection label="Gouvernance">
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                id="create-case-owner"
                label="Responsable"
                value={form.ownerUserId}
                emptyLabel="Aucun responsable"
                onChange={(value) => onChange({ ...form, ownerUserId: value })}
                options={userOptions}
              />

              <SelectField
                id="create-case-sponsor"
                label="Responsable metier"
                value={form.sponsorUserId}
                emptyLabel="Aucun responsable metier"
                onChange={(value) =>
                  onChange({ ...form, sponsorUserId: value })
                }
                options={userOptions}
              />
            </div>
          </FieldSection>

          <FieldSection label="Cible technique">
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                id="create-case-activation-mode"
                label="Mode d'activation"
                value={form.activationMode}
                onChange={(value) =>
                  onChange({
                    ...form,
                    activationMode:
                      value as OnboardingFormState["activationMode"],
                  })
                }
                options={ACTIVATION_MODE_OPTIONS}
              />

              <SelectField
                id="create-case-environment"
                label="Environnement cible"
                value={form.environmentTarget}
                onChange={(value) =>
                  onChange({
                    ...form,
                    environmentTarget:
                      value as OnboardingFormState["environmentTarget"],
                  })
                }
                options={ENVIRONMENT_OPTIONS}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                id="create-case-data-residency"
                label="Residence des donnees"
                value={form.dataResidencyRegion}
                onChange={(value) =>
                  onChange({ ...form, dataResidencyRegion: value })
                }
                options={DATA_RESIDENCY_OPTIONS}
              />

              <DateField
                id="create-case-target-go-live"
                label="Mise en service cible"
                value={form.targetGoLiveAt}
                onChange={(value) =>
                  onChange({ ...form, targetGoLiveAt: value })
                }
              />
            </div>
          </FieldSection>

          <FieldSection label="Sources critiques">
            <CheckboxCardGroup
              options={SOURCE_MODE_OPTIONS}
              values={form.sourceModes}
              idPrefix="create-case-source-mode"
              onToggle={(value) =>
                onChange({
                  ...form,
                  sourceModes: toggleListValue(
                    [...form.sourceModes],
                    value,
                  ) as OnboardingFormState["sourceModes"],
                })
              }
            />
          </FieldSection>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSection label="Modules souscrits">
              <CheckboxLineGroup
                options={SUBSCRIPTION_MODULE_OPTIONS}
                values={form.subscriptionModules}
                idPrefix="create-case-subscription-module"
                onToggle={(value) =>
                  onChange({
                    ...form,
                    subscriptionModules: toggleListValue(
                      form.subscriptionModules,
                      value,
                    ),
                  })
                }
              />
            </FieldSection>

            <FieldSection label="Packs">
              <CheckboxLineGroup
                options={PACK_OPTIONS}
                values={form.selectedPacks}
                idPrefix="create-case-pack"
                onToggle={(value) =>
                  onChange({
                    ...form,
                    selectedPacks: toggleListValue(form.selectedPacks, value),
                  })
                }
              />
            </FieldSection>
          </div>

          <div className="rounded-2xl border border-border bg-surface-sunken/35 px-4 py-3 text-sm text-ink-tertiary">
            Ce bouton ouvre le dossier d&apos;activation. Les vraies actions
            utiles viennent ensuite dans l&apos;assistant: invitations, imports
            fichiers et validation de la preparation.
          </div>

          {usersError ? (
            <p className="text-xs text-danger">{usersError}</p>
          ) : null}

          <Button
            onClick={onCreate}
            disabled={disabled}
            className="min-h-[48px] w-full rounded-2xl"
          >
            <Rocket className="mr-1.5 h-4 w-4" />
            Creer le dossier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateCaseHeader(
  props: Readonly<{
    activationMode: string;
    environmentTarget: string;
  }>,
) {
  return (
    <div className="border-b border-border bg-zinc-950 px-5 py-5 text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">
            Demarrer un dossier
          </p>
          <h3 className="text-lg font-semibold tracking-tight">
            Ouvrir un parcours propre pour ce client.
          </h3>
          <p className="max-w-[40ch] text-sm leading-relaxed text-white/72">
            Pour une demo donnees, le trio recommande reste simple:
            `simulation`, `bac a sable`, puis `fichier`.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
            Recommande
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {props.activationMode} / {props.environmentTarget}
          </p>
        </div>
      </div>
    </div>
  );
}

function FieldSection(props: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <section className="space-y-2">
      <SectionLabel>{props.label}</SectionLabel>
      {props.children}
    </section>
  );
}

function SectionLabel(props: Readonly<{ children: string }>) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-ink-tertiary">
      {props.children}
    </p>
  );
}

function SummaryTile(props: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-border bg-surface-sunken/45 p-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-ink-tertiary">
        {props.label}
      </p>
      <p className="mt-2 text-sm font-medium text-ink">{props.value}</p>
    </div>
  );
}

function CheckboxCardGroup(
  props: Readonly<{
    idPrefix: string;
    options: readonly { value: string; label: string; hint?: string }[];
    values: readonly string[];
    onToggle: (value: string) => void;
  }>,
) {
  return (
    <div className="grid gap-2">
      {props.options.map((option) => {
        const fieldId = `${props.idPrefix}-${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={fieldId}
            className="flex items-start gap-3 rounded-2xl border border-border bg-surface-sunken/45 px-3 py-3 transition hover:border-primary/40 hover:bg-primary-50/25"
          >
            <input
              id={fieldId}
              type="checkbox"
              aria-label={option.label}
              checked={props.values.includes(option.value)}
              onChange={() => props.onToggle(option.value)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                {option.label}
              </span>
              {option.hint ? (
                <span className="mt-1 block text-xs text-ink-tertiary">
                  {option.hint}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function CheckboxLineGroup(
  props: Readonly<{
    idPrefix: string;
    options: readonly { value: string; label: string }[];
    values: readonly string[];
    onToggle: (value: string) => void;
  }>,
) {
  return (
    <div className="space-y-2">
      {props.options.map((option) => {
        const fieldId = `${props.idPrefix}-${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={fieldId}
            className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-2 text-sm text-ink-secondary transition hover:border-border hover:bg-surface-sunken/35"
          >
            <input
              id={fieldId}
              type="checkbox"
              aria-label={option.label}
              checked={props.values.includes(option.value)}
              onChange={() => props.onToggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function SelectField(
  props: Readonly<{
    id: string;
    label: string;
    value: string;
    emptyLabel?: string;
    options: readonly { value: string; label: string }[];
    onChange: (value: string) => void;
  }>,
) {
  return (
    <label htmlFor={props.id} className="space-y-2 text-xs text-ink-tertiary">
      <span>{props.label}</span>
      <select
        id={props.id}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="min-h-[46px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-charcoal transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">{props.emptyLabel ?? "Aucune valeur"}</option>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField(
  props: Readonly<{
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
  }>,
) {
  return (
    <label htmlFor={props.id} className="space-y-2 text-xs text-ink-tertiary">
      <span>{props.label}</span>
      <input
        id={props.id}
        type="date"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="min-h-[46px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-charcoal transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function joinOrFallback(values: readonly string[], fallback: string) {
  return values.length > 0 ? values.join(" • ") : fallback;
}
