"use client";

import Link from "next/link";
import { PaperPlaneRight, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";
import { PulseDot } from "../shared/motion/PulseDot";
import type {
  PilotFormData,
  PilotFormOptions,
  PilotPageUi,
} from "./pilot-application.types";

const INPUT_CLASS =
  "w-full rounded-xl border border-neutral-300/90 bg-white/95 px-3 py-2.5 text-sm text-ink outline-none transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] placeholder:text-neutral-400 focus:border-brass focus:ring-1 focus:ring-brass";
const LEGEND_CLASS =
  "text-xs font-semibold uppercase tracking-[0.11em] text-neutral-500";

export function PilotApplicationForm({
  dict,
  errorMsg,
  form,
  isSubmitDisabled,
  onSubmit,
  options,
  privacyHref,
  status,
  termsHref,
  ui,
  update,
}: {
  dict: Dictionary;
  errorMsg: string;
  form: PilotFormData;
  isSubmitDisabled: boolean;
  onSubmit: (event: React.FormEvent) => void;
  options: PilotFormOptions;
  privacyHref: string;
  status: "idle" | "submitting" | "success" | "error";
  termsHref: string;
  ui: PilotPageUi;
  update: (key: keyof PilotFormData, value: string | boolean) => void;
}) {
  const field = (key: string) => dict.form.fields[key] ?? { label: key, placeholder: "" };

  return (
    <section className="rounded-[2rem] border border-neutral-200/80 bg-white/95 p-6 shadow-[0_22px_46px_-40px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.85)] md:p-8">
      <header className="border-b border-neutral-200/80 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <PulseDot className="h-2 w-2 bg-amber-500" />
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
            {dict.form.pageTitle}
          </p>
        </div>
        <p className="mt-2 text-sm text-neutral-600">{ui.requiredHint}</p>
      </header>

      <form onSubmit={onSubmit} className="mt-6 space-y-8" noValidate>
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

        <PilotOrganisationFields
          field={field}
          legend={dict.form.fieldsets.organisation}
          form={form}
          options={options}
          selectLabel={dict.form.select}
          optionFallback={ui.optionFallback}
          update={update}
        />
        <PilotContactFields
          field={field}
          legend={dict.form.fieldsets.contact}
          form={form}
          options={options}
          selectLabel={dict.form.select}
          optionFallback={ui.optionFallback}
          update={update}
        />
        <PilotChallengeFields
          field={field}
          legend={dict.form.fieldsets.challenges}
          form={form}
          options={options}
          selectLabel={dict.form.select}
          optionFallback={ui.optionFallback}
          update={update}
        />

        <div className="flex items-start gap-2.5 border-t border-neutral-200/80 pt-4">
          <input
            id="pilot-consent"
            type="checkbox"
            checked={form.consent}
            onChange={(event) => update("consent", event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-brass accent-brass"
          />
          <label htmlFor="pilot-consent" className="text-sm leading-relaxed text-neutral-600">
            {ui.legalJoinA}
            <Link href={termsHref} className="text-brass-700 no-underline hover:text-brass-800">
              {dict.form.cguLabel}
            </Link>
            {ui.legalJoinB}
            <Link
              href={privacyHref}
              className="text-brass-700 no-underline hover:text-brass-800"
            >
              {dict.form.privacyLabel}
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
              {dict.form.submitting}
            </>
          ) : (
            <>
              <PaperPlaneRight size={16} weight="bold" />
              {dict.form.submit}
            </>
          )}
        </button>
      </form>
    </section>
  );
}

function PilotOrganisationFields({
  field,
  legend,
  form,
  optionFallback,
  options,
  selectLabel,
  update,
}: PilotFieldsetProps) {
  return (
    <fieldset className="space-y-4">
      <legend className={LEGEND_CLASS}>{legend}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PilotTextField
          id="pilot-companyName"
          label={`${field("companyName").label} *`}
          maxLength={200}
          placeholder={field("companyName").placeholder}
          value={form.companyName}
          onChange={(value) => update("companyName", value)}
        />
        <PilotSelectField
          id="pilot-sector"
          label={`${field("sector").label} *`}
          options={options.sectors}
          optionFallback={optionFallback}
          selectLabel={selectLabel}
          value={form.sector}
          onChange={(value) => update("sector", value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PilotSelectField
          id="pilot-employeeRange"
          label={`${field("employeeRange").label} *`}
          options={options.employeeRanges}
          optionFallback={optionFallback}
          selectLabel={selectLabel}
          value={form.employeeRange}
          onChange={(value) => update("employeeRange", value)}
        />
        <PilotSelectField
          id="pilot-siteCount"
          label={field("siteCount").label}
          options={options.siteCounts}
          optionFallback={optionFallback}
          selectLabel={selectLabel}
          value={form.siteCount}
          onChange={(value) => update("siteCount", value)}
        />
      </div>
    </fieldset>
  );
}

function PilotContactFields({
  field,
  legend,
  form,
  optionFallback,
  options,
  selectLabel,
  update,
}: PilotFieldsetProps) {
  return (
    <fieldset className="space-y-4 border-t border-neutral-200/80 pt-6">
      <legend className={LEGEND_CLASS}>{legend}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PilotTextField
          id="pilot-firstName"
          label={field("firstName").label}
          maxLength={100}
          value={form.firstName}
          onChange={(value) => update("firstName", value)}
        />
        <PilotTextField
          id="pilot-lastName"
          label={field("lastName").label}
          maxLength={100}
          value={form.lastName}
          onChange={(value) => update("lastName", value)}
        />
      </div>

      <PilotSelectField
        id="pilot-role"
        label={field("role").label}
        options={options.roles}
        optionFallback={optionFallback}
        selectLabel={selectLabel}
        value={form.role}
        onChange={(value) => update("role", value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PilotTextField
          id="pilot-email"
          type="email"
          label={`${field("email").label} *`}
          maxLength={254}
          placeholder={field("email").placeholder}
          value={form.email}
          onChange={(value) => update("email", value)}
        />
        <PilotTextField
          id="pilot-phone"
          type="tel"
          label={field("phone").label}
          maxLength={30}
          placeholder={field("phone").placeholder}
          value={form.phone}
          onChange={(value) => update("phone", value)}
        />
      </div>
    </fieldset>
  );
}

function PilotChallengeFields({
  field,
  legend,
  form,
  optionFallback,
  options,
  selectLabel,
  update,
}: PilotFieldsetProps) {
  return (
    <fieldset className="space-y-4 border-t border-neutral-200/80 pt-6">
      <legend className={LEGEND_CLASS}>{legend}</legend>
      <PilotSelectField
        id="pilot-timeline"
        label={field("timeline").label}
        options={options.timelines}
        optionFallback={optionFallback}
        selectLabel={selectLabel}
        value={form.timeline}
        onChange={(value) => update("timeline", value)}
      />
      <PilotTextField
        id="pilot-currentStack"
        label={field("currentStack").label}
        maxLength={300}
        placeholder={field("currentStack").placeholder}
        value={form.currentStack}
        onChange={(value) => update("currentStack", value)}
      />
      <div>
        <label htmlFor="pilot-painPoint" className="mb-1.5 block text-sm font-medium text-ink">
          {field("painPoint").label}
        </label>
        <textarea
          id="pilot-painPoint"
          rows={4}
          maxLength={1200}
          placeholder={field("painPoint").placeholder}
          value={form.painPoint}
          onChange={(event) => update("painPoint", event.target.value)}
          className={`${INPUT_CLASS} resize-y`}
        />
      </div>
    </fieldset>
  );
}

function PilotTextField({
  id,
  label,
  maxLength,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  id: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "email" | "tel" | "text";
  value: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      />
    </div>
  );
}

function PilotSelectField({
  id,
  label,
  optionFallback,
  options,
  onChange,
  selectLabel,
  value,
}: {
  id: string;
  label: string;
  optionFallback: string;
  options: string[];
  onChange: (value: string) => void;
  selectLabel: string;
  value: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      >
        <option value="">{selectLabel}</option>
        {options.length > 0 ? (
          options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))
        ) : (
          <option value="" disabled>
            {optionFallback}
          </option>
        )}
      </select>
    </div>
  );
}

interface PilotFieldsetProps {
  field: (key: string) => { label: string; placeholder?: string };
  legend: string;
  form: PilotFormData;
  optionFallback: string;
  options: PilotFormOptions;
  selectLabel: string;
  update: (key: keyof PilotFormData, value: string | boolean) => void;
}
