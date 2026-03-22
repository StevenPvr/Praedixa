"use client";

import { AlertTriangle } from "lucide-react";
import { Button, Card, CardContent } from "@praedixa/ui";

export type TestClientDeletionFormState = {
  organizationSlug: string;
  confirmationText: string;
  acknowledgeTestDeletion: boolean;
};

type TestClientDeletionCardProps = {
  organizationSlug: string;
  form: TestClientDeletionFormState;
  disabled: boolean;
  loading: boolean;
  onChange: (next: TestClientDeletionFormState) => void;
  onDelete: () => void;
};

export function TestClientDeletionCard(
  props: Readonly<TestClientDeletionCardProps>,
) {
  const { organizationSlug, form, disabled, loading, onChange, onDelete } =
    props;
  const buttonLabel = loading ? "Suppression..." : "Supprimer definitivement";

  return (
    <Card className="rounded-2xl border-rose-200 shadow-soft">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h3 className="inline-flex items-center gap-2 text-sm font-medium text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            Suppression definitive du client test
          </h3>
          <p className="text-sm text-ink-tertiary">
            Reserve aux clients marques comme test. Cette action supprime
            l&apos;organisation et ses donnees rattachees.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-900">
          <input
            type="checkbox"
            checked={form.acknowledgeTestDeletion}
            onChange={(event) =>
              onChange({
                ...form,
                acknowledgeTestDeletion: event.target.checked,
              })
            }
            className="mt-0.5 h-4 w-4 rounded border-rose-300"
          />
          <span>
            Je confirme qu&apos;il s&apos;agit bien d&apos;un client test et que
            la suppression est irreversible.
          </span>
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs text-ink-tertiary">
            <span>Retape le slug du client</span>
            <input
              type="text"
              value={form.organizationSlug}
              onChange={(event) =>
                onChange({ ...form, organizationSlug: event.target.value })
              }
              placeholder={organizationSlug}
              className="min-h-[44px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal placeholder:text-ink-placeholder focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </label>

          <label className="space-y-1 text-xs text-ink-tertiary">
            <span>Retape SUPPRIMER</span>
            <input
              type="text"
              value={form.confirmationText}
              onChange={(event) =>
                onChange({ ...form, confirmationText: event.target.value })
              }
              placeholder="SUPPRIMER"
              className="min-h-[44px] w-full rounded-lg border border-border px-3 py-2 text-sm uppercase text-charcoal placeholder:text-ink-placeholder focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </label>
        </div>

        <div className="flex items-center justify-end">
          <Button variant="outline" onClick={onDelete} disabled={disabled}>
            {buttonLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
