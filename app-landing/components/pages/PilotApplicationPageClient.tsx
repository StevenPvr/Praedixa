"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  PaperPlaneRight,
  Sparkle,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { PulseDot } from "../shared/motion/PulseDot";
import { ShimmerTrack } from "../shared/motion/ShimmerTrack";
import { ScopingCallRequestPanel } from "../shared/ScopingCallRequestPanel";

interface PilotFormData {
  companyName: string;
  sector: string;
  employeeRange: string;
  siteCount: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  timeline: string;
  currentStack: string;
  painPoint: string;
  consent: boolean;
  website: string;
}

function toList(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

export function PilotApplicationPageClient({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const isFr = locale === "fr";
  const f = dict.form;
  const field = (key: string) => f.fields[key] ?? { label: key, placeholder: "" };

  const sectors = toList(f.sectors);
  const employeeRanges = toList(f.employeeRanges);
  const siteCounts = toList(f.siteCounts);
  const roles = toList(f.roles);
  const timelines = toList(f.timelines);
  const valuePoints = toList(f.valuePoints);

  const [form, setForm] = useState<PilotFormData>({
    companyName: "",
    sector: "",
    employeeRange: "",
    siteCount: "",
    firstName: "",
    lastName: "",
    role: "",
    email: "",
    phone: "",
    timeline: "",
    currentStack: "",
    painPoint: "",
    consent: false,
    website: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const ui =
    isFr
      ? {
          backToSite: "Retour au site",
          formKicker: "Demande de pilote",
          optionFallback: "Option indisponible",
          missingTitle: "Configuration de formulaire indisponible",
          missingBody:
            "Certaines options nécessaires au formulaire sont manquantes. Réessayez dans quelques minutes.",
          requiredHint: "Les champs marques d'un asterisque sont requis.",
          legalJoinA: "J'accepte les ",
          legalJoinB: " et la ",
          unknownError: "Erreur inconnue.",
          networkError: "Erreur réseau. Veuillez réessayer.",
        }
      : {
          backToSite: "Back to site",
          formKicker: "Pilot request",
          optionFallback: "No option available",
          missingTitle: "Form configuration unavailable",
          missingBody:
            "Some required form options are missing. Please retry in a few minutes.",
          requiredHint: "Fields marked with an asterisk are required.",
          legalJoinA: "I accept the ",
          legalJoinB: " and the ",
          unknownError: "Unknown error.",
          networkError: "Network error. Please try again.",
        };

  const update = useCallback((key: keyof PilotFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isSubmitDisabled =
    status === "submitting" ||
    form.companyName.trim().length === 0 ||
    form.sector.length === 0 ||
    form.employeeRange.length === 0 ||
    form.email.trim().length === 0 ||
    !form.consent;

  const hasCoreOptions = sectors.length > 0 && employeeRanges.length > 0;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus("submitting");
      setErrorMsg("");

      try {
        const res = await fetch("/api/pilot-application", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = (await res.json()) as { success?: boolean; error?: string };

        if (!res.ok || data.error) {
          setErrorMsg(data.error ?? ui.unknownError);
          setStatus("error");
          return;
        }

        setStatus("success");
      } catch {
        setErrorMsg(ui.networkError);
        setStatus("error");
      }
    },
    [form, ui.networkError, ui.unknownError],
  );

  const privacyHref = getLocalizedPath(locale, "privacy");
  const termsHref = getLocalizedPath(locale, "terms");
  const protocolHref = `/${locale}/pilot-protocol`;
  const homeHref = `/${locale}`;

  const inputClass =
    "w-full rounded-xl border border-neutral-300/90 bg-white/95 px-3 py-2.5 text-sm text-ink outline-none transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] placeholder:text-neutral-400 focus:border-brass focus:ring-1 focus:ring-brass";
  const legendClass =
    "text-xs font-semibold uppercase tracking-[0.11em] text-neutral-500";

  if (!hasCoreOptions) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
        <div className="rounded-[2rem] border border-neutral-200/80 bg-white/95 p-8 text-center shadow-[0_22px_46px_-40px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.85)]">
          <WarningCircle size={44} weight="fill" className="mx-auto text-neutral-500" />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
            {ui.missingTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-[52ch] text-base leading-relaxed text-neutral-600">
            {ui.missingBody}
          </p>
          <Link
            href={homeHref}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-neutral-50 active:-translate-y-[1px] active:scale-[0.99]"
          >
            <ArrowLeft size={16} />
            {ui.backToSite}
          </Link>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(165deg,rgba(244,231,198,0.62)_0%,rgba(252,248,238,0.9)_72%,rgba(255,255,255,0.96)_100%)] p-8 text-center shadow-[0_22px_46px_-38px_rgba(32,24,4,0.45),inset_0_1px_0_rgba(255,255,255,0.82)] md:p-10">
            <CheckCircle size={56} weight="fill" className="mx-auto text-amber-700" />
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              {f.success.title}
            </h1>
            <p className="mx-auto mt-3 max-w-[58ch] text-base leading-relaxed text-neutral-700">
              {f.success.description}
            </p>
          </div>

          <ScopingCallRequestPanel
            locale={locale}
            defaultCompanyName={form.companyName}
            defaultEmail={form.email}
            source="pilot_success"
          />

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={homeHref}
              className="inline-flex items-center gap-2 rounded-xl border border-brass-300 bg-white/80 px-4 py-2.5 text-sm font-semibold text-brass-800 no-underline transition-all duration-200 [transition-timing-function:var(--ease-snappy)] hover:border-brass-400 hover:bg-white active:-translate-y-[1px] active:scale-[0.99]"
            >
              <ArrowLeft size={16} />
              {f.success.backToSite}
            </Link>
            <Link
              href={protocolHref}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-all duration-200 [transition-timing-function:var(--ease-snappy)] hover:border-neutral-400 hover:bg-neutral-50 active:-translate-y-[1px] active:scale-[0.99]"
            >
              {f.success.checkEmail}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="grid grid-cols-1 gap-7 md:grid-cols-[0.7fr_1.3fr] md:gap-10">
        <aside className="space-y-6 md:pt-2">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brass-700">
              <Sparkle size={14} weight="fill" />
              {ui.formKicker}
            </span>
            <h1 className="mt-4 max-w-[18ch] text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
              {f.pageTitle}
            </h1>
            <p className="mt-5 max-w-[54ch] text-base leading-relaxed text-neutral-600">
              {f.pageSubtitle}
            </p>
            <Link
              href={homeHref}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white/85 px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-white active:-translate-y-[1px] active:scale-[0.99]"
            >
              <ArrowLeft size={15} />
              {ui.backToSite}
            </Link>
          </div>

          <section className="rounded-[1.75rem] border border-amber-200/80 bg-amber-50/75 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-amber-800">
              {f.pill}
            </p>
            <ul className="mt-4 list-none space-y-2.5 p-0">
              {valuePoints.map((point) => (
                <li key={point} className="m-0 flex items-start gap-2.5 text-sm text-neutral-700">
                  <CheckCircle
                    size={16}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center gap-2 text-xs text-neutral-600">
              <Clock size={14} className="text-amber-700" />
              <span>
                {f.estimatedTime}: {f.estimatedTimeValue}
              </span>
            </div>
            <ShimmerTrack className="mt-4 bg-amber-100/80" indicatorClassName="via-amber-500/60" />
          </section>

          <section className="rounded-[1.75rem] border border-neutral-200/80 bg-white/95 p-5 md:p-6">
            <p className="text-sm leading-relaxed text-neutral-600">
              {isFr
                ? "Vous pouvez consulter le protocole complet avant la soumission."
                : "You can review the complete pilot protocol before submitting."}
            </p>
            <Link
              href={protocolHref}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-neutral-50 active:-translate-y-[1px] active:scale-[0.99]"
            >
              {f.success.checkEmail}
              <ArrowRight size={14} />
            </Link>
          </section>
        </aside>

        <section className="rounded-[2rem] border border-neutral-200/80 bg-white/95 p-6 shadow-[0_22px_46px_-40px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.85)] md:p-8">
          <header className="border-b border-neutral-200/80 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <PulseDot className="h-2 w-2 bg-amber-500" />
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
                {f.pageTitle}
              </p>
            </div>
            <p className="mt-2 text-sm text-neutral-600">{ui.requiredHint}</p>
          </header>

          <form onSubmit={handleSubmit} className="mt-6 space-y-8" noValidate>
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

            <fieldset className="space-y-4">
              <legend className={legendClass}>{f.fieldsets.organisation}</legend>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pilot-companyName" className="mb-1.5 block text-sm font-medium text-ink">
                    {field("companyName").label} *
                  </label>
                  <input
                    id="pilot-companyName"
                    name="companyName"
                    type="text"
                    required
                    maxLength={200}
                    placeholder={field("companyName").placeholder}
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="pilot-sector" className="mb-1.5 block text-sm font-medium text-ink">
                    {field("sector").label} *
                  </label>
                  <select
                    id="pilot-sector"
                    name="sector"
                    required
                    value={form.sector}
                    onChange={(e) => update("sector", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">{f.select}</option>
                    {sectors.length > 0 ? (
                      sectors.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {ui.optionFallback}
                      </option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="pilot-employeeRange"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    {field("employeeRange").label} *
                  </label>
                  <select
                    id="pilot-employeeRange"
                    name="employeeRange"
                    required
                    value={form.employeeRange}
                    onChange={(e) => update("employeeRange", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">{f.select}</option>
                    {employeeRanges.length > 0 ? (
                      employeeRanges.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {ui.optionFallback}
                      </option>
                    )}
                  </select>
                </div>
                <div>
                  <label htmlFor="pilot-siteCount" className="mb-1.5 block text-sm font-medium text-ink">
                    {field("siteCount").label}
                  </label>
                  <select
                    id="pilot-siteCount"
                    name="siteCount"
                    value={form.siteCount}
                    onChange={(e) => update("siteCount", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">{f.select}</option>
                    {siteCounts.length > 0 ? (
                      siteCounts.map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {ui.optionFallback}
                      </option>
                    )}
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4 border-t border-neutral-200/80 pt-6">
              <legend className={legendClass}>{f.fieldsets.contact}</legend>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pilot-firstName" className="mb-1.5 block text-sm font-medium text-ink">
                    {field("firstName").label}
                  </label>
                  <input
                    id="pilot-firstName"
                    name="firstName"
                    type="text"
                    maxLength={100}
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="pilot-lastName" className="mb-1.5 block text-sm font-medium text-ink">
                    {field("lastName").label}
                  </label>
                  <input
                    id="pilot-lastName"
                    name="lastName"
                    type="text"
                    maxLength={100}
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pilot-role" className="mb-1.5 block text-sm font-medium text-ink">
                  {field("role").label}
                </label>
                <select
                  id="pilot-role"
                  name="role"
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                  className={inputClass}
                >
                  <option value="">{f.select}</option>
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      {ui.optionFallback}
                    </option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pilot-email" className="mb-1.5 block text-sm font-medium text-ink">
                    {field("email").label} *
                  </label>
                  <input
                    id="pilot-email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    placeholder={field("email").placeholder}
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="pilot-phone" className="mb-1.5 block text-sm font-medium text-ink">
                    {field("phone").label}
                  </label>
                  <input
                    id="pilot-phone"
                    name="phone"
                    type="tel"
                    maxLength={30}
                    placeholder={field("phone").placeholder}
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4 border-t border-neutral-200/80 pt-6">
              <legend className={legendClass}>{f.fieldsets.challenges}</legend>

              <div>
                <label htmlFor="pilot-timeline" className="mb-1.5 block text-sm font-medium text-ink">
                  {field("timeline").label}
                </label>
                <select
                  id="pilot-timeline"
                  name="timeline"
                  value={form.timeline}
                  onChange={(e) => update("timeline", e.target.value)}
                  className={inputClass}
                >
                  <option value="">{f.select}</option>
                  {timelines.length > 0 ? (
                    timelines.map((timeline) => (
                      <option key={timeline} value={timeline}>
                        {timeline}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      {ui.optionFallback}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="pilot-currentStack"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  {field("currentStack").label}
                </label>
                <input
                  id="pilot-currentStack"
                  name="currentStack"
                  type="text"
                  maxLength={300}
                  placeholder={field("currentStack").placeholder}
                  value={form.currentStack}
                  onChange={(e) => update("currentStack", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="pilot-painPoint" className="mb-1.5 block text-sm font-medium text-ink">
                  {field("painPoint").label}
                </label>
                <textarea
                  id="pilot-painPoint"
                  name="painPoint"
                  rows={4}
                  maxLength={1200}
                  placeholder={field("painPoint").placeholder}
                  value={form.painPoint}
                  onChange={(e) => update("painPoint", e.target.value)}
                  className={`${inputClass} resize-y`}
                />
              </div>
            </fieldset>

            <div className="flex items-start gap-2.5 border-t border-neutral-200/80 pt-4">
              <input
                id="pilot-consent"
                type="checkbox"
                checked={form.consent}
                onChange={(e) => update("consent", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-brass accent-brass"
              />
              <label htmlFor="pilot-consent" className="text-sm leading-relaxed text-neutral-600">
                {ui.legalJoinA}
                <Link href={termsHref} className="text-brass-700 no-underline hover:text-brass-800">
                  {f.cguLabel}
                </Link>
                {ui.legalJoinB}
                <Link
                  href={privacyHref}
                  className="text-brass-700 no-underline hover:text-brass-800"
                >
                  {f.privacyLabel}
                </Link>
                .
              </label>
            </div>

            {status === "error" && errorMsg ? (
              <div
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                aria-live="polite"
              >
                <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="btn-primary-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:-translate-y-[1px] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "submitting" ? (
                <>
                  <SpinnerGap size={16} className="animate-spin" />
                  {f.submitting}
                </>
              ) : (
                <>
                  <PaperPlaneRight size={16} weight="bold" />
                  {f.submit}
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
