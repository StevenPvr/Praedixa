"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  PaperPlaneRight,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  ArrowLeft,
  Clock,
  ArrowRight,
} from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";

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

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function PilotApplicationPageClient({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const isFr = locale === "fr";
  const f = dict.form;
  const field = (key: string) =>
    f.fields[key] ?? { label: key, placeholder: "" };

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

  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isSubmitDisabled =
    status === "submitting" ||
    form.companyName.trim().length === 0 ||
    form.sector.length === 0 ||
    form.employeeRange.length === 0 ||
    form.email.trim().length === 0 ||
    !form.consent;

  const update = useCallback(
    (key: keyof PilotFormData, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

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
    [form, isFr],
  );

  const privacyHref = getLocalizedPath(locale, "privacy");
  const termsHref = getLocalizedPath(locale, "terms");
  const protocolHref = `/${locale}/pilot-protocol`;

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mx-auto max-w-lg px-4 py-20 text-center"
      >
        <CheckCircle size={48} weight="fill" className="mx-auto text-brass" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
          {f.success.title}
        </h1>
        <p className="mt-2 text-base text-neutral-500">{f.success.description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-brass no-underline hover:text-brass-600"
          >
            <ArrowLeft size={16} />
            {f.success.backToSite}
          </Link>
          <Link
            href={protocolHref}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink no-underline transition-colors hover:bg-neutral-50"
          >
            {f.success.checkEmail}
            <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.5fr] md:py-24 lg:px-8">
      <div>
        <span className="inline-flex rounded-full border border-brass-200 bg-brass-50 px-3 py-1 text-xs font-semibold text-brass-700">
          {f.pill}
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {f.pageTitle}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-500">
          {f.pageSubtitle}
        </p>
        <Link
          href={`/${locale}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brass no-underline hover:text-brass-600"
        >
          <ArrowLeft size={14} />
          {isFr ? "Retour au site" : "Back to site"}
        </Link>

        <ul className="mt-6 list-none space-y-2.5 p-0">
          {f.valuePoints.map((point) => (
            <li
              key={point}
              className="m-0 flex items-start gap-2 text-sm text-neutral-600"
            >
              <CheckCircle
                size={16}
                weight="fill"
                className="mt-0.5 shrink-0 text-brass-300"
              />
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center gap-2 text-xs text-neutral-400">
          <Clock size={14} />
          {f.estimatedTime}: {f.estimatedTimeValue}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
          <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">
            {f.fieldsets.organisation}
          </legend>

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
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-neutral-300 focus:border-brass focus:ring-1 focus:ring-brass"
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
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
              >
                <option value="">{f.select}</option>
                {f.sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pilot-employeeRange" className="mb-1.5 block text-sm font-medium text-ink">
                {field("employeeRange").label} *
              </label>
              <select
                id="pilot-employeeRange"
                name="employeeRange"
                required
                value={form.employeeRange}
                onChange={(e) => update("employeeRange", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
              >
                <option value="">{f.select}</option>
                {f.employeeRanges.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
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
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
              >
                <option value="">{f.select}</option>
                {f.siteCounts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">
            {f.fieldsets.contact}
          </legend>

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
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
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
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
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
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
            >
              <option value="">{f.select}</option>
              {f.roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
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
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-neutral-300 focus:border-brass focus:ring-1 focus:ring-brass"
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
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-neutral-300 focus:border-brass focus:ring-1 focus:ring-brass"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">
            {f.fieldsets.challenges}
          </legend>

          <div>
            <label htmlFor="pilot-timeline" className="mb-1.5 block text-sm font-medium text-ink">
              {field("timeline").label}
            </label>
            <select
              id="pilot-timeline"
              name="timeline"
              value={form.timeline}
              onChange={(e) => update("timeline", e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
            >
              <option value="">{f.select}</option>
              {f.timelines.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pilot-currentStack" className="mb-1.5 block text-sm font-medium text-ink">
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
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-neutral-300 focus:border-brass focus:ring-1 focus:ring-brass"
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
              className="w-full resize-y rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-neutral-300 focus:border-brass focus:ring-1 focus:ring-brass"
            />
          </div>
        </fieldset>

        <div className="flex items-start gap-2.5">
          <input
            id="pilot-consent"
            type="checkbox"
            checked={form.consent}
            onChange={(e) => update("consent", e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-brass accent-brass"
          />
          <label htmlFor="pilot-consent" className="text-sm text-neutral-600">
            {isFr ? "J'accepte les " : "I accept the "}
            <Link href={termsHref} className="text-brass hover:text-brass-600">
              {f.cguLabel}
            </Link>
            {isFr ? " et la " : " and the "}
            <Link href={privacyHref} className="text-brass hover:text-brass-600">
              {f.privacyLabel}
            </Link>
            .
          </label>
        </div>

        {status === "error" && errorMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="btn-primary-gradient inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
    </div>
  );
}
