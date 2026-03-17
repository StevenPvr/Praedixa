"use client";

import Link from "next/link";
import { PaperPlaneRight, SpinnerGap } from "@phosphor-icons/react";
import { AlertDiamondIcon } from "../shared/icons/MarketingIcons";
import type { Dictionary } from "../../lib/i18n/types";
import { PulseDot } from "../shared/motion/PulseDot";
import type {
  DeploymentRequestFormData,
  DeploymentRequestFormOptions,
  DeploymentRequestPageUi,
} from "./deployment-request.types";

const INPUT_CLASS =
  "w-full rounded-xl border border-neutral-300/90 bg-white/95 px-3 py-2.5 text-sm text-ink outline-none transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] placeholder:text-neutral-400 focus:border-brass focus:ring-1 focus:ring-brass";
const LEGEND_CLASS =
  "text-xs font-semibold uppercase tracking-[0.11em] text-neutral-500";

export function DeploymentRequestForm({
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
  form: DeploymentRequestFormData;
  isSubmitDisabled: boolean;
  onSubmit: (event: React.FormEvent) => void;
  options: DeploymentRequestFormOptions;
  privacyHref: string;
  status: "idle" | "submitting" | "success" | "error";
  termsHref: string;
  ui: DeploymentRequestPageUi;
  update: (
    key: keyof DeploymentRequestFormData,
    value: string | boolean,
  ) => void;
}) {
  const field = (key: string) =>
    dict.form.fields[key] ?? { label: key, placeholder: "" };

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

        <DeploymentOrganisationFields
          field={field}
          legend={dict.form.fieldsets.organisation}
          form={form}
          options={options}
          selectLabel={dict.form.select}
          optionFallback={ui.optionFallback}
          update={update}
        />
        <DeploymentContactFields
          field={field}
          legend={dict.form.fieldsets.contact}
          form={form}
          options={options}
          selectLabel={dict.form.select}
          optionFallback={ui.optionFallback}
          update={update}
        />
        <DeploymentChallengeFields
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
            id="deployment-consent"
            type="checkbox"
            checked={form.consent}
            onChange={(event) => update("consent", event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-proof-500 accent-brass"
          />
          <label
            htmlFor="deployment-consent"
            className="text-sm leading-relaxed text-neutral-600"
          >
            {ui.legalJoinA}
            <Link
              href={termsHref}
              className="text-ink-800 no-underline hover:text-ink-950"
            >
              {dict.form.cguLabel}
            </Link>
            {ui.legalJoinB}
            <Link
              href={privacyHref}
              className="text-ink-800 no-underline hover:text-ink-950"
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

function DeploymentOrganisationFields({
  field,
  legend,
  form,
  optionFallback,
  options,
  selectLabel,
  update,
}: DeploymentFieldsetProps) {
  return (
    <fieldset className="space-y-4">
      <legend className={LEGEND_CLASS}>{legend}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DeploymentTextField
          id="deployment-companyName"
          label={`${field("companyName").label} *`}
          maxLength={200}
          placeholder={field("companyName").placeholder}
          value={form.companyName}
          onChange={(value) => update("companyName", value)}
        />
        <DeploymentSelectField
          id="deployment-sector"
          label={`${field("sector").label} *`}
          options={options.sectors}
          optionFallback={optionFallback}
          selectLabel={selectLabel}
          value={form.sector}
          onChange={(value) => update("sector", value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DeploymentSelectField
          id="deployment-employeeRange"
          label={`${field("employeeRange").label} *`}
          options={options.employeeRanges}
          optionFallback={optionFallback}
          selectLabel={selectLabel}
          value={form.employeeRange}
          onChange={(value) => update("employeeRange", value)}
        />
        <DeploymentSelectField
          id="deployment-siteCount"
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

function DeploymentContactFields({
  field,
  legend,
  form,
  optionFallback,
  options,
  selectLabel,
  update,
}: DeploymentFieldsetProps) {
  return (
    <fieldset className="space-y-4 border-t border-neutral-200/80 pt-6">
      <legend className={LEGEND_CLASS}>{legend}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DeploymentTextField
          id="deployment-firstName"
          label={field("firstName").label}
          maxLength={100}
          value={form.firstName}
          onChange={(value) => update("firstName", value)}
        />
        <DeploymentTextField
          id="deployment-lastName"
          label={field("lastName").label}
          maxLength={100}
          value={form.lastName}
          onChange={(value) => update("lastName", value)}
        />
      </div>

      <DeploymentSelectField
        id="deployment-role"
        label={field("role").label}
        options={options.roles}
        optionFallback={optionFallback}
        selectLabel={selectLabel}
        value={form.role}
        onChange={(value) => update("role", value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DeploymentTextField
          id="deployment-email"
          type="email"
          label={`${field("email").label} *`}
          maxLength={254}
          placeholder={field("email").placeholder}
          value={form.email}
          onChange={(value) => update("email", value)}
        />
        <DeploymentTextField
          id="deployment-phone"
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

function DeploymentChallengeFields({
  field,
  legend,
  form,
  optionFallback,
  options,
  selectLabel,
  update,
}: DeploymentFieldsetProps) {
  return (
    <fieldset className="space-y-4 border-t border-neutral-200/80 pt-6">
      <legend className={LEGEND_CLASS}>{legend}</legend>
      <DeploymentSelectField
        id="deployment-timeline"
        label={field("timeline").label}
        options={options.timelines}
        optionFallback={optionFallback}
        selectLabel={selectLabel}
        value={form.timeline}
        onChange={(value) => update("timeline", value)}
      />
      <DeploymentTextField
        id="deployment-currentStack"
        label={field("currentStack").label}
        maxLength={300}
        placeholder={field("currentStack").placeholder}
        value={form.currentStack}
        onChange={(value) => update("currentStack", value)}
      />
      <div>
        <label
          htmlFor="deployment-painPoint"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {field("painPoint").label}
        </label>
        <textarea
          id="deployment-painPoint"
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

function DeploymentTextField({
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

function DeploymentSelectField({
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

interface DeploymentFieldsetProps {
  field: (key: string) => { label: string; placeholder?: string };
  legend: string;
  form: DeploymentRequestFormData;
  optionFallback: string;
  options: DeploymentRequestFormOptions;
  selectLabel: string;
  update: (
    key: keyof DeploymentRequestFormData,
    value: string | boolean,
  ) => void;
}
