"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PraedixaLogo } from "../logo/PraedixaLogo";
import { ArrowRightIcon, CheckIcon } from "../icons";
import { localizedSlugs } from "../../lib/i18n/config";
import type { Locale } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";

interface FormData {
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
  website: string;
  consent: boolean;
}

const INITIAL_FORM_DATA: FormData = {
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
  website: "",
  consent: false,
};

function getField(
  fields: Dictionary["form"]["fields"],
  key: string,
  fallbackLabel: string,
  fallbackPlaceholder?: string,
): { label: string; placeholder?: string } {
  return (
    fields[key] ?? {
      label: fallbackLabel,
      placeholder: fallbackPlaceholder,
    }
  );
}

function splitConsentTemplate(template: string): {
  prefix: string;
  between: string;
  suffix: string;
} {
  const [prefix = "", afterCguRaw = ""] = template.split("{cgu}");
  const [between = "", suffix = ""] = afterCguRaw.split("{privacy}");

  return { prefix, between, suffix };
}

export function PilotApplicationPageClient({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const homeHref = `/${locale}`;
  const cguHref = `/${locale}/${localizedSlugs.terms[locale]}`;
  const privacyHref = `/${locale}/${localizedSlugs.privacy[locale]}`;
  const { form, nav } = dict;

  const fields = form.fields;
  const companyField = getField(fields, "companyName", "Company");
  const sectorField = getField(fields, "sector", "Sector");
  const employeeRangeField = getField(fields, "employeeRange", "Headcount");
  const siteCountField = getField(fields, "siteCount", "Number of sites");
  const firstNameField = getField(fields, "firstName", "First name");
  const lastNameField = getField(fields, "lastName", "Last name");
  const roleField = getField(fields, "role", "Role");
  const emailField = getField(fields, "email", "Professional email");
  const phoneField = getField(fields, "phone", "Phone");
  const timelineField = getField(fields, "timeline", "Project horizon");
  const currentStackField = getField(
    fields,
    "currentStack",
    "Current stack (optional)",
  );
  const painPointField = getField(
    fields,
    "painPoint",
    "Main coverage challenge",
  );

  const consentTokens = splitConsentTemplate(form.consent);

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComplete = useMemo(() => {
    return (
      formData.companyName.trim().length > 1 &&
      formData.sector !== "" &&
      formData.employeeRange !== "" &&
      formData.siteCount !== "" &&
      formData.firstName.trim().length > 1 &&
      formData.lastName.trim().length > 1 &&
      formData.role !== "" &&
      formData.email.trim().length > 3 &&
      formData.timeline !== "" &&
      formData.painPoint.trim().length > 0 &&
      formData.consent
    );
  }, [formData]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isComplete || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/pilot-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || form.error);
      }

      setIsSuccess(true);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : form.error;
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-cream">
        <main
          id="main-content"
          tabIndex={-1}
          className="section-shell flex min-h-screen items-center justify-center py-20"
        >
          <motion.section
            className="pilot-card w-full max-w-2xl p-10 text-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-primary-200 bg-primary-50">
              <CheckIcon className="h-8 w-8 text-primary-700" />
            </div>
            <h1 className="mt-6 font-serif text-5xl leading-tight text-charcoal">
              {form.success.title}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-secondary">
              {form.success.description}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={homeHref} className="ghost-cta">
                {form.success.backToSite}
              </Link>
              <a href={`mailto:${formData.email}`} className="gold-cta">
                {form.success.checkEmail}
              </a>
            </div>
          </motion.section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <nav className="fixed left-0 right-0 top-0 z-50">
        <div className="section-shell mt-4">
          <div className="flex items-center justify-between rounded-2xl border border-primary/25 bg-[color-mix(in_oklch,var(--color-panel)_92%,transparent)] px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur md:px-6">
            <Link href={homeHref} className="group flex items-center gap-2.5">
              <PraedixaLogo
                variant="geometric"
                size={30}
                color="var(--color-text-secondary)"
                strokeWidth={1.1}
                className="transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-serif text-xl text-charcoal">Praedixa</span>
            </Link>
            <Link
              href={homeHref}
              className="text-sm font-semibold text-charcoal/70 transition hover:text-charcoal"
            >
              {nav.backToSite}
            </Link>
          </div>
        </div>
      </nav>

      <main
        id="main-content"
        tabIndex={-1}
        className="section-shell pb-20 pt-32 md:pt-36"
      >
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <motion.aside
            className="pilot-card p-8"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="pilot-pill">{form.pill}</p>
            <h1 className="mt-5 font-serif text-5xl leading-tight text-charcoal">
              {form.pageTitle}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink-secondary">
              {form.pageSubtitle}
            </p>

            <ul className="mt-7 space-y-3">
              {form.valuePoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-charcoal/85"
                >
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" />
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-7 rounded-2xl border border-primary-200 bg-primary-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                {form.estimatedTime}
              </p>
              <p className="mt-2 text-sm text-charcoal/85">
                {form.estimatedTimeValue}
              </p>
            </div>
          </motion.aside>

          <motion.section
            className="pilot-card p-7 md:p-8"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">
                  {form.fieldsets.organisation}
                </legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label={companyField.label}
                    name="companyName"
                    value={formData.companyName}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, companyName: value }))
                    }
                    placeholder={companyField.placeholder}
                    required
                  />
                  <Select
                    label={sectorField.label}
                    name="sector"
                    value={formData.sector}
                    options={form.sectors}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, sector: value }))
                    }
                    required
                    selectLabel={form.select}
                  />
                  <Select
                    label={employeeRangeField.label}
                    name="employeeRange"
                    value={formData.employeeRange}
                    options={form.employeeRanges}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, employeeRange: value }))
                    }
                    required
                    selectLabel={form.select}
                  />
                  <Select
                    label={siteCountField.label}
                    name="siteCount"
                    value={formData.siteCount}
                    options={form.siteCounts}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, siteCount: value }))
                    }
                    required
                    selectLabel={form.select}
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">
                  {form.fieldsets.contact}
                </legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label={firstNameField.label}
                    name="firstName"
                    value={formData.firstName}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, firstName: value }))
                    }
                    required
                  />
                  <Input
                    label={lastNameField.label}
                    name="lastName"
                    value={formData.lastName}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, lastName: value }))
                    }
                    required
                  />
                  <Select
                    label={roleField.label}
                    name="role"
                    value={formData.role}
                    options={form.roles}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, role: value }))
                    }
                    required
                    selectLabel={form.select}
                  />
                  <Input
                    type="email"
                    label={emailField.label}
                    name="email"
                    value={formData.email}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, email: value }))
                    }
                    placeholder={emailField.placeholder}
                    required
                  />
                  <Input
                    label={phoneField.label}
                    name="phone"
                    value={formData.phone}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, phone: value }))
                    }
                    placeholder={phoneField.placeholder}
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">
                  {form.fieldsets.challenges}
                </legend>
                <div className="grid gap-4">
                  <Select
                    label={timelineField.label}
                    name="timeline"
                    value={formData.timeline}
                    options={form.timelines}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, timeline: value }))
                    }
                    required
                    selectLabel={form.select}
                  />
                  <Input
                    label={currentStackField.label}
                    name="currentStack"
                    value={formData.currentStack}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, currentStack: value }))
                    }
                    placeholder={currentStackField.placeholder}
                  />
                  <TextArea
                    label={painPointField.label}
                    name="painPoint"
                    value={formData.painPoint}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, painPoint: value }))
                    }
                    placeholder={painPointField.placeholder}
                    required
                  />
                </div>
              </fieldset>

              <div
                className="absolute left-[-9999px] top-[-9999px]"
                aria-hidden="true"
              >
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      website: event.target.value,
                    }))
                  }
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-subtle bg-card p-4">
                <input
                  type="checkbox"
                  checked={formData.consent}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      consent: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm leading-relaxed text-ink-secondary">
                  {consentTokens.prefix}
                  <Link
                    href={cguHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary-700 hover:underline"
                  >
                    {form.cguLabel}
                  </Link>
                  {consentTokens.between}
                  <Link
                    href={privacyHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary-700 hover:underline"
                  >
                    {form.privacyLabel}
                  </Link>
                  {consentTokens.suffix}
                </span>
              </label>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-xl border border-danger bg-danger-light px-4 py-3 text-sm text-danger-text"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!isComplete || isSubmitting}
                className="btn-primary w-full rounded-full px-7 py-3.5 text-sm"
              >
                {isSubmitting ? form.submitting : form.submit}
                {!isSubmitting && <ArrowRightIcon className="h-4 w-4" />}
              </button>
            </form>
          </motion.section>
        </div>
      </main>
    </div>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-charcoal/80">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-xl border border-border-subtle bg-card px-3.5 text-sm text-charcoal outline-none ring-0 transition focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
        required={required}
      />
    </label>
  );
}

function Select({
  label,
  name,
  value,
  options,
  onChange,
  required = false,
  selectLabel,
}: {
  label: string;
  name: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  required?: boolean;
  selectLabel: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-charcoal/80">
        {label}
        {required ? " *" : ""}
      </span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-xl border border-border-subtle bg-card px-3.5 text-sm text-charcoal outline-none transition focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
        required={required}
      >
        <option value="">{selectLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-charcoal/80">
        {label}
        {required ? " *" : ""}
      </span>
      <textarea
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="rounded-xl border border-border-subtle bg-card px-3.5 py-3 text-sm leading-relaxed text-charcoal outline-none transition focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
        required={required}
      />
    </label>
  );
}
