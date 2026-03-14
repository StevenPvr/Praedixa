"use client";

import Link from "next/link";
import { PaperPlaneRight, SpinnerGap } from "@phosphor-icons/react";
import { AlertDiamondIcon } from "../shared/icons/MarketingIcons";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type {
  ContactChallenge,
  ContactFormData,
  ContactPageCopy,
  FieldErrors,
} from "./contact-page.types";

const SITE_COUNTS = ["1-3", "4-10", "11-30", "31+"] as const;
const CONTACT_SECTORS = {
  fr: [
    "HCR",
    "Enseignement supérieur",
    "Logistique / Transport / Retail",
    "Automobile / concessions / ateliers",
    "BTP",
    "Services",
    "Autre",
  ],
  en: [
    "Hospitality / Food service",
    "Higher education",
    "Logistics / Transport / Retail",
    "Automotive / dealerships / workshops",
    "Construction",
    "Services",
    "Other",
  ],
} as const;
const CONTACT_TIMELINES = {
  fr: ["0-3 mois", "3-6 mois", "6-12 mois", "Exploration"],
  en: ["0-3 months", "3-6 months", "6-12 months", "Exploration"],
} as const;

const FIELD_BASE_CLASS =
  "w-full rounded-xl border bg-white/95 px-3 py-2.5 text-sm text-ink transition-all duration-200 [transition-timing-function:var(--ease-snappy)] placeholder:text-neutral-400 focus:border-brass focus:ring-1 focus:ring-brass";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-ink";
const ERROR_CLASS = "mt-1 text-xs text-red-700";

export function ContactPageForm({
  captcha,
  captchaLoading,
  copy,
  errorMsg,
  fieldErrors,
  form,
  isFr,
  isSubmitDisabled,
  loadCaptchaChallenge,
  locale,
  onSubmit,
  status,
  update,
}: {
  captcha: ContactChallenge | null;
  captchaLoading: boolean;
  copy: ContactPageCopy;
  errorMsg: string;
  fieldErrors: FieldErrors;
  form: ContactFormData;
  isFr: boolean;
  isSubmitDisabled: boolean;
  loadCaptchaChallenge: () => Promise<void>;
  locale: Locale;
  onSubmit: (event: React.FormEvent) => void;
  status: "idle" | "submitting" | "success" | "error";
  update: (key: keyof ContactFormData, value: string | boolean) => void;
}) {
  const privacyHref = getLocalizedPath(locale, "privacy");
  const termsHref = getLocalizedPath(locale, "terms");
  const selectPlaceholder = isFr ? "Sélectionner" : "Select";
  const sectorOptions = isFr ? CONTACT_SECTORS.fr : CONTACT_SECTORS.en;
  const timelineOptions = isFr ? CONTACT_TIMELINES.fr : CONTACT_TIMELINES.en;

  return (
    <section className="rounded-[2rem] border border-neutral-200/80 bg-white/95 p-6 shadow-[0_22px_46px_-40px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.85)] md:p-8">
      <header className="border-b border-neutral-200/80 pb-5">
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          {copy.formTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {copy.formSubtitle}
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
        <input
          type="text"
          name="website"
          value={form.website}
          onChange={(event) => update("website", event.target.value)}
          className="sr-only"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <ContactTextField
          id="contact-companyName"
          label={`${copy.company} *`}
          value={form.companyName}
          error={fieldErrors.companyName}
          autoComplete="organization"
          maxLength={100}
          onChange={(value) => update("companyName", value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ContactTextField
            id="contact-role"
            label={`${copy.role} *`}
            value={form.role}
            error={fieldErrors.role}
            autoComplete="organization-title"
            maxLength={80}
            onChange={(value) => update("role", value)}
          />
          <ContactTextField
            id="contact-email"
            type="email"
            label={`${copy.email} *`}
            value={form.email}
            error={fieldErrors.email}
            autoComplete="email"
            maxLength={254}
            placeholder={isFr ? "vous@entreprise.com" : "you@company.com"}
            onChange={(value) => update("email", value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ContactSelectField
            id="contact-siteCount"
            label={`${copy.siteCount} *`}
            value={form.siteCount}
            options={SITE_COUNTS}
            placeholder={selectPlaceholder}
            error={fieldErrors.siteCount}
            onChange={(value) => update("siteCount", value)}
          />
          <ContactSelectField
            id="contact-sector"
            label={`${copy.sector} *`}
            value={form.sector}
            options={sectorOptions}
            placeholder={selectPlaceholder}
            error={fieldErrors.sector}
            onChange={(value) => update("sector", value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ContactSelectField
            id="contact-timeline"
            label={`${copy.timeline} *`}
            value={form.timeline}
            options={timelineOptions}
            placeholder={selectPlaceholder}
            error={fieldErrors.timeline}
            onChange={(value) => update("timeline", value)}
          />
          <ContactTextField
            id="contact-currentStack"
            label={copy.currentStack}
            value={form.currentStack}
            maxLength={300}
            placeholder={copy.currentStackPlaceholder}
            onChange={(value) => update("currentStack", value)}
          />
        </div>

        <div>
          <label htmlFor="contact-mainTradeOff" className={LABEL_CLASS}>
            {copy.mainTradeOff} *
          </label>
          <textarea
            id="contact-mainTradeOff"
            required
            rows={4}
            maxLength={400}
            value={form.mainTradeOff}
            onChange={(event) => update("mainTradeOff", event.target.value)}
            placeholder={copy.mainTradeOffPlaceholder}
            className={`${getFieldClass(Boolean(fieldErrors.mainTradeOff))} resize-y`}
            aria-invalid={fieldErrors.mainTradeOff ? "true" : "false"}
            aria-describedby={
              fieldErrors.mainTradeOff
                ? "contact-mainTradeOff-error"
                : undefined
            }
          />
          {fieldErrors.mainTradeOff ? (
            <p id="contact-mainTradeOff-error" className={ERROR_CLASS}>
              {fieldErrors.mainTradeOff}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="contact-message" className={LABEL_CLASS}>
            {copy.message}
          </label>
          <textarea
            id="contact-message"
            rows={5}
            maxLength={800}
            value={form.message}
            onChange={(event) => update("message", event.target.value)}
            placeholder={copy.messagePlaceholder}
            className={`${getFieldClass(false)} resize-y`}
          />
        </div>

        <ContactCaptchaField
          captcha={captcha}
          captchaLoading={captchaLoading}
          copy={copy}
          error={fieldErrors.captchaAnswer}
          value={form.captchaAnswer}
          onChange={(value) => update("captchaAnswer", value)}
          onRetry={loadCaptchaChallenge}
        />

        <div className="flex items-start gap-2.5">
          <input
            id="contact-consent"
            type="checkbox"
            checked={form.consent}
            onChange={(event) => update("consent", event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-brass accent-brass"
            aria-invalid={fieldErrors.consent ? "true" : "false"}
            aria-describedby={
              fieldErrors.consent ? "contact-consent-error" : undefined
            }
          />
          <label
            htmlFor="contact-consent"
            className="text-sm leading-relaxed text-neutral-600"
          >
            {copy.consentPrefix}
            <Link
              href={termsHref}
              className="text-brass-700 no-underline hover:text-brass-800"
            >
              {copy.termsLabel}
            </Link>
            {copy.consentJoin}
            <Link
              href={privacyHref}
              className="text-brass-700 no-underline hover:text-brass-800"
            >
              {copy.privacyLabel}
            </Link>
            .
          </label>
        </div>
        {fieldErrors.consent ? (
          <p id="contact-consent-error" className={ERROR_CLASS}>
            {fieldErrors.consent}
          </p>
        ) : null}

        {status === "error" && errorMsg ? (
          <div
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            aria-live="polite"
          >
            <AlertDiamondIcon size={18} className="mt-0.5 shrink-0" />
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
              {copy.sending}
            </>
          ) : (
            <>
              <PaperPlaneRight size={16} weight="bold" />
              {copy.send}
            </>
          )}
        </button>
      </form>
    </section>
  );
}

function ContactTextField({
  autoComplete,
  error,
  id,
  label,
  maxLength,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  autoComplete?: string;
  error?: string;
  id: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "email" | "text";
  value: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={getFieldClass(Boolean(error))}
        autoComplete={autoComplete}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} className={ERROR_CLASS}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ContactSelectField({
  id,
  label,
  value,
  options,
  placeholder,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={getFieldClass(Boolean(error))}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className={ERROR_CLASS}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ContactCaptchaField({
  captcha,
  captchaLoading,
  copy,
  error,
  onChange,
  onRetry,
  value,
}: {
  captcha: ContactChallenge | null;
  captchaLoading: boolean;
  copy: ContactPageCopy;
  error?: string;
  onChange: (value: string) => void;
  onRetry: () => Promise<void>;
  value: string;
}) {
  return (
    <div>
      <label htmlFor="contact-captcha" className={LABEL_CLASS}>
        {copy.antiSpam}
      </label>
      {captchaLoading ? (
        <p className="text-sm text-neutral-500">{copy.challengeLoading}</p>
      ) : captcha ? (
        <div className="space-y-2">
          <p className="text-sm text-neutral-600">
            {captcha.captchaA} + {captcha.captchaB} = ?
          </p>
          <input
            id="contact-captcha"
            inputMode="numeric"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={getFieldClass(Boolean(error))}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "contact-captcha-error" : undefined}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-neutral-500">
            {copy.challengeUnavailable}
          </p>
          <button
            type="button"
            onClick={() => void onRetry()}
            className="inline-flex rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-ink"
          >
            {copy.challengeRetry}
          </button>
        </div>
      )}
      {error ? (
        <p id="contact-captcha-error" className={ERROR_CLASS}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getFieldClass(hasError: boolean): string {
  return `${FIELD_BASE_CLASS} ${
    hasError ? "border-red-400 ring-1 ring-red-200" : "border-neutral-300/90"
  }`;
}
