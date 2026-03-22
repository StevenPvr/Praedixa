"use client";

import { Building2, ArrowRight } from "lucide-react";
import { Button, Card, CardContent } from "@praedixa/ui";

export type CreateClientFormState = {
  name: string;
  slug: string;
  contactEmail: string;
  isTest: boolean;
};

export const DEFAULT_CREATE_CLIENT_FORM_STATE: CreateClientFormState = {
  name: "",
  slug: "",
  contactEmail: "",
  isTest: false,
};

type CreateClientCardProps = Readonly<{
  form: CreateClientFormState;
  disabled: boolean;
  onChange: (next: CreateClientFormState) => void;
  onCreate: () => void;
}>;

export function CreateClientCard({
  form,
  disabled,
  onChange,
  onCreate,
}: CreateClientCardProps) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-ink-secondary">
            Creer un client
          </h2>
          <p className="text-sm text-ink-tertiary">
            Cree l&apos;organisation persistante puis ouvre directement son
            workspace onboarding.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-xs text-ink-tertiary">
            <span>Nom</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                onChange({ ...form, name: event.target.value })
              }
              placeholder="Acme Logistics"
              className="min-h-[44px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal placeholder:text-ink-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="space-y-1 text-xs text-ink-tertiary">
            <span>Slug</span>
            <input
              type="text"
              value={form.slug}
              onChange={(event) =>
                onChange({ ...form, slug: event.target.value })
              }
              placeholder="acme-logistics"
              className="min-h-[44px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal placeholder:text-ink-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="space-y-1 text-xs text-ink-tertiary">
            <span>Email contact</span>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(event) =>
                onChange({ ...form, contactEmail: event.target.value })
              }
              placeholder="ops@acme.fr"
              className="min-h-[44px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal placeholder:text-ink-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <input
            type="checkbox"
            checked={form.isTest}
            onChange={(event) =>
              onChange({ ...form, isTest: event.target.checked })
            }
            className="mt-0.5 h-4 w-4 rounded border-amber-300"
          />
          <span>
            Marquer comme <span className="font-medium">client test</span>. Ce
            flag est persiste cote backend et servira aux operations
            destructives reservees aux environnements de test.
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-sunken/40 px-4 py-3">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-4 w-4 text-primary" />
            <p className="text-xs text-ink-tertiary">
              Le client est cree en statut{" "}
              <span className="font-medium text-ink">trial</span> puis ouvert
              sur son onboarding org-scope.
            </p>
          </div>

          <Button onClick={onCreate} disabled={disabled}>
            <ArrowRight className="mr-1.5 h-4 w-4" />
            Creer le client
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
