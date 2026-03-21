"use client";

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

export function CreateCaseCard({
  form,
  users,
  usersError,
  disabled,
  onCreate,
  onChange,
}: CreateCaseCardProps) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-ink-secondary">
            Demarrer un case
          </h3>
          <p className="text-xs text-ink-tertiary">
            Initialise le case BPM avec un scope produit explicite,
            l&apos;environnement cible et les familles de sources.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-ink-tertiary">
              <span>Owner</span>
              <select
                value={form.ownerUserId}
                onChange={(event) =>
                  onChange({ ...form, ownerUserId: event.target.value })
                }
                className="min-h-[44px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Aucun owner</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {userLabel(user)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs text-ink-tertiary">
              <span>Sponsor</span>
              <select
                value={form.sponsorUserId}
                onChange={(event) =>
                  onChange({ ...form, sponsorUserId: event.target.value })
                }
                className="min-h-[44px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Aucun sponsor</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {userLabel(user)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-ink-tertiary">
              <span>Mode d&apos;activation</span>
              <select
                value={form.activationMode}
                onChange={(event) =>
                  onChange({
                    ...form,
                    activationMode: event.target
                      .value as OnboardingFormState["activationMode"],
                  })
                }
                className="min-h-[44px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ACTIVATION_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs text-ink-tertiary">
              <span>Environnement cible</span>
              <select
                value={form.environmentTarget}
                onChange={(event) =>
                  onChange({
                    ...form,
                    environmentTarget: event.target
                      .value as OnboardingFormState["environmentTarget"],
                  })
                }
                className="min-h-[44px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ENVIRONMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-ink-tertiary">
              <span>Residence data</span>
              <select
                value={form.dataResidencyRegion}
                onChange={(event) =>
                  onChange({ ...form, dataResidencyRegion: event.target.value })
                }
                className="min-h-[44px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {DATA_RESIDENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs text-ink-tertiary">
              <span>Go-live cible</span>
              <input
                type="date"
                value={form.targetGoLiveAt}
                onChange={(event) =>
                  onChange({ ...form, targetGoLiveAt: event.target.value })
                }
                className="min-h-[44px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-ink-secondary">
              Sources critiques
            </p>
            <div className="grid gap-2">
              {SOURCE_MODE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface-sunken/40 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={form.sourceModes.includes(option.value)}
                    onChange={() =>
                      onChange({
                        ...form,
                        sourceModes: toggleListValue(
                          [...form.sourceModes],
                          option.value,
                        ) as OnboardingFormState["sourceModes"],
                      })
                    }
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">
                      {option.label}
                    </span>
                    <span className="block text-xs text-ink-tertiary">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-secondary">
                Modules souscrits
              </p>
              <div className="space-y-2">
                {SUBSCRIPTION_MODULE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm text-ink-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={form.subscriptionModules.includes(option.value)}
                      onChange={() =>
                        onChange({
                          ...form,
                          subscriptionModules: toggleListValue(
                            form.subscriptionModules,
                            option.value,
                          ),
                        })
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-secondary">
                Packs DecisionOps
              </p>
              <div className="space-y-2">
                {PACK_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm text-ink-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={form.selectedPacks.includes(option.value)}
                      onChange={() =>
                        onChange({
                          ...form,
                          selectedPacks: toggleListValue(
                            form.selectedPacks,
                            option.value,
                          ),
                        })
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {usersError ? (
            <p className="text-xs text-danger">{usersError}</p>
          ) : null}

          <Button onClick={onCreate} disabled={disabled}>
            <Rocket className="mr-1.5 h-4 w-4" />
            Creer le case
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
