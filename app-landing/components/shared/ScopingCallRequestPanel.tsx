"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  PaperPlaneRight,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLOT_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

type FieldErrors = Partial<
  Record<"companyName" | "email" | "timezone" | "slots" | "notes", string>
>;

interface ScopingCallRequestPanelProps {
  locale: Locale;
  defaultCompanyName?: string;
  defaultEmail?: string;
  source?: "contact_success" | "pilot_success" | string;
  className?: string;
}

export function ScopingCallRequestPanel({
  locale,
  defaultCompanyName,
  defaultEmail,
  source = "unknown",
  className,
}: ScopingCallRequestPanelProps) {
  const isFr = locale === "fr";
  const copy = useMemo(
    () =>
      isFr
        ? {
            title: "Proposer un cadrage (30 min)",
            subtitle:
              "Proposez 3 créneaux. Nous confirmons un créneau par email sous 48h ouvrées.",
            company: "Entreprise",
            email: "Email",
            timezone: "Fuseau horaire",
            timezoneHint: "Auto-détecté, modifiable si besoin.",
            slots: "3 créneaux",
            slotsHint: "Choisissez 3 créneaux différents (format local).",
            notes: "Notes (optionnel)",
            notesHint:
              "Ex : contraintes d’agenda, participants (Ops/Finance/IT), urgence, etc.",
            submit: "Proposer mes créneaux",
            submitting: "Envoi en cours…",
            successTitle: "Créneaux envoyés",
            successBody:
              "Merci. Nous revenons par email pour confirmer un créneau.",
            errorPrefix: "Erreur :",
            invalidEmail: "Adresse email invalide.",
            requiredCompany: "Entreprise requise.",
            requiredTimezone: "Fuseau horaire requis.",
            requiredSlots: "3 créneaux valides sont requis.",
          }
        : {
            title: "Propose a scoping call (30 min)",
            subtitle:
              "Propose 3 time slots. We confirm one slot by email within 48 business hours.",
            company: "Company",
            email: "Email",
            timezone: "Timezone",
            timezoneHint: "Auto-detected, editable if needed.",
            slots: "3 time slots",
            slotsHint: "Pick 3 different time slots (local format).",
            notes: "Notes (optional)",
            notesHint:
              "Example: calendar constraints, attendees (Ops/Finance/IT), urgency, etc.",
            submit: "Send my slots",
            submitting: "Sending…",
            successTitle: "Slots sent",
            successBody: "Thanks. We will confirm one slot by email.",
            errorPrefix: "Error:",
            invalidEmail: "Invalid email address.",
            requiredCompany: "Company is required.",
            requiredTimezone: "Timezone is required.",
            requiredSlots: "3 valid time slots are required.",
          },
    [isFr],
  );

  const [form, setForm] = useState({
    companyName: defaultCompanyName ?? "",
    email: defaultEmail ?? "",
    timezone: "",
    slot1: "",
    slot2: "",
    slot3: "",
    notes: "",
    website: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    setForm((prev) => (prev.timezone ? prev : { ...prev, timezone: tz }));
  }, []);

  const update = useCallback(
    (key: keyof typeof form, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete (next as Record<string, string>)[key];
        return next;
      });
    },
    [setForm],
  );

  const validate = useCallback((): FieldErrors => {
    const errors: FieldErrors = {};

    if (!form.companyName.trim()) {
      errors.companyName = copy.requiredCompany;
    }

    const email = form.email.trim();
    if (!email || !EMAIL_REGEX.test(email)) {
      errors.email = copy.invalidEmail;
    }

    if (!form.timezone.trim()) {
      errors.timezone = copy.requiredTimezone;
    }

    const slots = [form.slot1, form.slot2, form.slot3].map((s) => s.trim());
    const allValid = slots.every((s) => SLOT_REGEX.test(s));
    const unique = new Set(slots).size === slots.length;
    if (!allValid || !unique) {
      errors.slots = copy.requiredSlots;
    }

    return errors;
  }, [copy, form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg("");

      const errors = validate();
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setStatus("error");
        return;
      }

      setStatus("submitting");
      try {
        const res = await fetch("/api/scoping-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            email: form.email,
            companyName: form.companyName,
            timezone: form.timezone,
            slots: [form.slot1, form.slot2, form.slot3],
            notes: form.notes,
            source,
            website: form.website,
          }),
        });

        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || data.error) {
          setErrorMsg(data.error ?? (isFr ? "Erreur inconnue." : "Unknown error."));
          setStatus("error");
          return;
        }

        setStatus("success");
      } catch {
        setErrorMsg(isFr ? "Erreur réseau. Veuillez réessayer." : "Network error. Please try again.");
        setStatus("error");
      }
    },
    [form, isFr, locale, source, validate],
  );

  const baseField =
    "w-full rounded-xl border bg-white/95 px-3 py-2.5 text-sm text-ink transition-all duration-200 [transition-timing-function:var(--ease-snappy)] placeholder:text-neutral-400 focus:border-brass focus:ring-1 focus:ring-brass";
  const fieldClass = (hasError?: boolean) =>
    `${baseField} ${
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-red-200"
        : "border-neutral-300/90"
    }`;
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";
  const errorClass = "mt-1 text-xs text-red-700";

  if (status === "success") {
    return (
      <section
        className={`rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(165deg,rgba(244,231,198,0.62)_0%,rgba(252,248,238,0.9)_72%,rgba(255,255,255,0.96)_100%)] p-6 shadow-[0_22px_46px_-38px_rgba(32,24,4,0.25),inset_0_1px_0_rgba(255,255,255,0.82)] ${className ?? ""}`}
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <CheckCircle size={22} weight="fill" className="mt-0.5 text-amber-700" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              {copy.successTitle}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-700">
              {copy.successBody}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-[2rem] border border-neutral-200/80 bg-white/95 p-6 shadow-[0_22px_46px_-40px_rgba(32,24,4,0.18),inset_0_1px_0_rgba(255,255,255,0.85)] ${className ?? ""}`}
      aria-label={copy.title}
    >
      <header className="border-b border-neutral-200/80 pb-4">
        <h2 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">{copy.subtitle}</p>
      </header>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
        <input
          type="text"
          name="website"
          value={form.website}
          onChange={(e) => update("website", e.target.value)}
          className="sr-only"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <div>
          <label htmlFor="booking-company" className={labelClass}>
            {copy.company}
          </label>
          <input
            id="booking-company"
            type="text"
            maxLength={100}
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            className={fieldClass(!!fieldErrors.companyName)}
            autoComplete="organization"
            aria-invalid={fieldErrors.companyName ? "true" : "false"}
            aria-describedby={fieldErrors.companyName ? "booking-company-error" : undefined}
          />
          {fieldErrors.companyName ? (
            <p id="booking-company-error" className={errorClass}>
              {fieldErrors.companyName}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="booking-email" className={labelClass}>
            {copy.email}
          </label>
          <input
            id="booking-email"
            type="email"
            maxLength={254}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={fieldClass(!!fieldErrors.email)}
            autoComplete="email"
            aria-invalid={fieldErrors.email ? "true" : "false"}
            aria-describedby={fieldErrors.email ? "booking-email-error" : undefined}
          />
          {fieldErrors.email ? (
            <p id="booking-email-error" className={errorClass}>
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="booking-timezone" className={labelClass}>
            {copy.timezone}
          </label>
          <input
            id="booking-timezone"
            type="text"
            maxLength={64}
            value={form.timezone}
            onChange={(e) => update("timezone", e.target.value)}
            className={fieldClass(!!fieldErrors.timezone)}
            placeholder={isFr ? "Europe/Paris" : "Europe/Paris"}
            aria-invalid={fieldErrors.timezone ? "true" : "false"}
            aria-describedby={fieldErrors.timezone ? "booking-timezone-error" : "booking-timezone-hint"}
          />
          {fieldErrors.timezone ? (
            <p id="booking-timezone-error" className={errorClass}>
              {fieldErrors.timezone}
            </p>
          ) : (
            <p id="booking-timezone-hint" className="mt-1 text-xs text-neutral-500">
              {copy.timezoneHint}
            </p>
          )}
        </div>

        <fieldset className="rounded-2xl border border-neutral-200/80 bg-white/80 p-4">
          <legend className="px-1 text-sm font-semibold text-ink">
            {copy.slots}
          </legend>
          <p className="mt-1 text-xs text-neutral-500">{copy.slotsHint}</p>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <input
              type="datetime-local"
              value={form.slot1}
              onChange={(e) => update("slot1", e.target.value)}
              className={fieldClass(!!fieldErrors.slots)}
              aria-label={isFr ? "Créneau 1" : "Slot 1"}
            />
            <input
              type="datetime-local"
              value={form.slot2}
              onChange={(e) => update("slot2", e.target.value)}
              className={fieldClass(!!fieldErrors.slots)}
              aria-label={isFr ? "Créneau 2" : "Slot 2"}
            />
            <input
              type="datetime-local"
              value={form.slot3}
              onChange={(e) => update("slot3", e.target.value)}
              className={fieldClass(!!fieldErrors.slots)}
              aria-label={isFr ? "Créneau 3" : "Slot 3"}
            />
          </div>
          {fieldErrors.slots ? (
            <p className={errorClass}>{fieldErrors.slots}</p>
          ) : null}
        </fieldset>

        <div>
          <label htmlFor="booking-notes" className={labelClass}>
            {copy.notes}
          </label>
          <textarea
            id="booking-notes"
            rows={4}
            maxLength={800}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className={fieldClass(false)}
            placeholder={copy.notesHint}
          />
          <p className="mt-1 text-xs text-neutral-500">{copy.notesHint}</p>
        </div>

        {status === "error" && errorMsg ? (
          <div
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            aria-live="polite"
          >
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold">{copy.errorPrefix}</span> {errorMsg}
            </span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn-primary-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all duration-200 [transition-timing-function:var(--ease-snappy)] active:-translate-y-[1px] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? (
            <>
              <SpinnerGap size={16} className="animate-spin" />
              {copy.submitting}
            </>
          ) : (
            <>
              <PaperPlaneRight size={16} weight="bold" />
              {copy.submit}
            </>
          )}
        </button>
      </form>
    </section>
  );
}
