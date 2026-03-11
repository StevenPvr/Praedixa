"use client";

import { PaperPlaneRight, SpinnerGap } from "@phosphor-icons/react";
import { AlertDiamondIcon } from "./icons/MarketingIcons";
import type {
  ScopingCallFormData,
  ScopingCallCopy,
  ScopingFieldErrors,
} from "./scoping-call.types";

const BASE_FIELD_CLASS =
  "w-full rounded-xl border bg-white/95 px-3 py-2.5 text-sm text-ink transition-all duration-200 [transition-timing-function:var(--ease-snappy)] placeholder:text-neutral-400 focus:border-brass focus:ring-1 focus:ring-brass";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-ink";
const ERROR_CLASS = "mt-1 text-xs text-red-700";

export function ScopingCallForm({
  copy,
  errorMsg,
  fieldErrors,
  form,
  isFr,
  onSubmit,
  status,
  update,
}: {
  copy: ScopingCallCopy;
  errorMsg: string;
  fieldErrors: ScopingFieldErrors;
  form: ScopingCallFormData;
  isFr: boolean;
  onSubmit: (event: React.FormEvent) => void;
  status: "idle" | "submitting" | "success" | "error";
  update: (key: keyof ScopingCallFormData, value: string) => void;
}) {
  return (
    <section
      className="rounded-[2rem] border border-neutral-200/80 bg-white/95 p-6 shadow-[0_22px_46px_-40px_rgba(32,24,4,0.18),inset_0_1px_0_rgba(255,255,255,0.85)]"
      aria-label={copy.title}
    >
      <header className="border-b border-neutral-200/80 pb-4">
        <h2 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {copy.subtitle}
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-5 space-y-5" noValidate>
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

        <ScopingTextField
          id="booking-company"
          label={copy.company}
          value={form.companyName}
          error={fieldErrors.companyName}
          autoComplete="organization"
          maxLength={100}
          onChange={(value) => update("companyName", value)}
        />
        <ScopingTextField
          id="booking-email"
          type="email"
          label={copy.email}
          value={form.email}
          error={fieldErrors.email}
          autoComplete="email"
          maxLength={254}
          onChange={(value) => update("email", value)}
        />

        <div>
          <label htmlFor="booking-timezone" className={LABEL_CLASS}>
            {copy.timezone}
          </label>
          <input
            id="booking-timezone"
            type="text"
            maxLength={64}
            value={form.timezone}
            onChange={(event) => update("timezone", event.target.value)}
            className={getFieldClass(Boolean(fieldErrors.timezone))}
            placeholder="Europe/Paris"
            aria-invalid={fieldErrors.timezone ? "true" : "false"}
            aria-describedby={
              fieldErrors.timezone
                ? "booking-timezone-error"
                : "booking-timezone-hint"
            }
          />
          {fieldErrors.timezone ? (
            <p id="booking-timezone-error" className={ERROR_CLASS}>
              {fieldErrors.timezone}
            </p>
          ) : (
            <p
              id="booking-timezone-hint"
              className="mt-1 text-xs text-neutral-500"
            >
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
            <ScopingSlotField
              error={fieldErrors.slots}
              label={isFr ? "Créneau 1" : "Slot 1"}
              value={form.slot1}
              onChange={(value) => update("slot1", value)}
            />
            <ScopingSlotField
              error={fieldErrors.slots}
              label={isFr ? "Créneau 2" : "Slot 2"}
              value={form.slot2}
              onChange={(value) => update("slot2", value)}
            />
            <ScopingSlotField
              error={fieldErrors.slots}
              label={isFr ? "Créneau 3" : "Slot 3"}
              value={form.slot3}
              onChange={(value) => update("slot3", value)}
            />
          </div>
          {fieldErrors.slots ? (
            <p className={ERROR_CLASS}>{fieldErrors.slots}</p>
          ) : null}
        </fieldset>

        <div>
          <label htmlFor="booking-notes" className={LABEL_CLASS}>
            {copy.notes}
          </label>
          <textarea
            id="booking-notes"
            rows={4}
            maxLength={800}
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            className={getFieldClass(false)}
            placeholder={copy.notesHint}
          />
          <p className="mt-1 text-xs text-neutral-500">{copy.notesHint}</p>
        </div>

        {status === "error" && errorMsg ? (
          <div
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            aria-live="polite"
          >
            <AlertDiamondIcon size={18} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold">{copy.errorPrefix}</span>{" "}
              {errorMsg}
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

function ScopingTextField({
  autoComplete,
  error,
  id,
  label,
  maxLength,
  onChange,
  type = "text",
  value,
}: {
  autoComplete?: string;
  error?: string;
  id: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
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

function ScopingSlotField({
  error,
  label,
  onChange,
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <input
      type="datetime-local"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={getFieldClass(Boolean(error))}
      aria-label={label}
    />
  );
}

function getFieldClass(hasError: boolean): string {
  return `${BASE_FIELD_CLASS} ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-200"
      : "border-neutral-300/90"
  }`;
}
