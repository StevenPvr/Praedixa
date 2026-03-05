"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/provider";

const NOTIFICATIONS_STORAGE_KEY = "praedixa_notifications_critical_only";

export default function ParametresPage() {
  const currentUser = useCurrentUser();
  const { locale, setLocale } = useI18n();
  const [criticalOnly, setCriticalOnly] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (saved == null) return;
    setCriticalOnly(saved !== "0");
  }, []);

  function handleCriticalOnlyChange(next: boolean): void {
    setCriticalOnly(next);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, next ? "1" : "0");
  }

  return (
    <div className="min-h-full space-y-8">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-secondary">
          Compte
        </p>
        <h1 className="text-2xl font-semibold text-ink">Parametres</h1>
        <p className="text-sm text-ink-secondary">
          Gestion du compte et preferences utilisateur essentielles.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card px-4 py-4">
        <h2 className="text-base font-semibold text-ink">Profil</h2>
        <dl className="mt-3 grid gap-3 text-sm text-ink-secondary sm:grid-cols-2">
          <div className="rounded-lg bg-surface-sunken px-3 py-2">
            <dt>Email</dt>
            <dd className="font-medium text-ink">{currentUser?.email ?? "--"}</dd>
          </div>
          <div className="rounded-lg bg-surface-sunken px-3 py-2">
            <dt>Role</dt>
            <dd className="font-medium text-ink">{currentUser?.role ?? "--"}</dd>
          </div>
          <div className="rounded-lg bg-surface-sunken px-3 py-2 sm:col-span-2">
            <dt>Organisation</dt>
            <dd className="font-medium text-ink">{currentUser?.organizationId ?? "--"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-card px-4 py-4">
        <h2 className="text-base font-semibold text-ink">Preferences</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-ink">Langue</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value === "en" ? "en" : "fr")}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value="fr">Francais</option>
              <option value="en">English</option>
            </select>
          </label>

          <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
            <p className="text-sm font-medium text-ink">Notifications</p>
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={criticalOnly}
                onChange={(event) => handleCriticalOnlyChange(event.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Alertes critiques uniquement
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
