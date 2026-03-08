"use client";

import Link from "next/link";
import { PaperPlaneRight, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import { REQUEST_TYPES } from "./contact-page.constants";
import type {
  ContactChallenge,
  ContactFormData,
  ContactPageCopy,
  FieldErrors,
} from "./contact-page.types";

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
          <ContactTextField
            id="contact-phone"
            type="tel"
            label={copy.phone}
            value={form.phone}
            autoComplete="tel"
            maxLength={30}
            onChange={(value) => update("phone", value)}
          />
        </div>

        <div>
          <label htmlFor="contact-message" className={LABEL_CLASS}>
            {copy.message} *{" "}
            <span className="font-normal text-neutral-500">({copy.messageHint})</span>
          </label>
          <textarea
            id="contact-message"
            required
            rows={6}
            maxLength={800}
            value={form.message}
            onChange={(event) => update("message", event.target.value)}
            placeholder={copy.messagePlaceholder}
            className={`${getFieldClass(Boolean(fieldErrors.message))} resize-y`}
            aria-invalid={fieldErrors.message ? "true" : "false"}
            aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
          />
          {fieldErrors.message ? (
            <p id="contact-message-error" className={ERROR_CLASS}>
              {fieldErrors.message}
            </p>
          ) : null}
        </div>

        <details className="rounded-2xl border border-neutral-200/80 bg-white/80 p-4">
          <summary className="cursor-pointer select-none text-sm font-semibold text-ink">
            {copy.optionalDetails}
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="contact-requestType" className={LABEL_CLASS}>
                {copy.requestType}
              </label>
              <select
                id="contact-requestType"
                value={form.requestType}
                onChange={(event) =>
                  update("requestType", event.target.value as ContactFormData["requestType"])
                }
                className={getFieldClass(false)}
              >
                {REQUEST_TYPES.map((requestType) => (
                  <option key={requestType.value} value={requestType.value}>
                    {isFr ? requestType.fr : requestType.en}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ContactTextField
                id="contact-firstName"
                label={copy.firstName}
                value={form.firstName}
                autoComplete="given-name"
                maxLength={80}
                onChange={(value) => update("firstName", value)}
              />
              <ContactTextField
                id="contact-lastName"
                label={copy.lastName}
                value={form.lastName}
                autoComplete="family-name"
                maxLength={80}
                onChange={(value) => update("lastName", value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ContactTextField
                id="contact-role"
                label={copy.role}
                value={form.role}
                autoComplete="organization-title"
                maxLength={80}
                onChange={(value) => update("role", value)}
              />
              <ContactTextField
                id="contact-subject"
                label={copy.subject}
                value={form.subject}
                maxLength={120}
                onChange={(value) => update("subject", value)}
              />
            </div>
          </div>
        </details>

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
            aria-describedby={fieldErrors.consent ? "contact-consent-error" : undefined}
          />
          <label htmlFor="contact-consent" className="text-sm leading-relaxed text-neutral-600">
            {copy.consentPrefix}
            <Link href={termsHref} className="text-brass-700 no-underline hover:text-brass-800">
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
  type?: "email" | "tel" | "text";
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
        {captcha ? `: ${captcha.captchaA} + ${captcha.captchaB} = ?` : ""}
      </label>
      {captchaLoading ? (
        <p className="text-sm text-neutral-500">{copy.challengeLoading}</p>
      ) : captcha ? (
        <input
          id="contact-captcha"
          type="number"
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${getFieldClass(Boolean(error))} w-28`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "contact-captcha-error" : undefined}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-red-700">{copy.challengeUnavailable}</p>
          <button
            type="button"
            onClick={() => void onRetry()}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-neutral-50"
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
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-200"
      : "border-neutral-300/90"
  }`;
}
