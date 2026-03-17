"use client";

import { useState } from "react";
import type { Locale } from "../../lib/i18n/config";
import type { FinalCtaContent } from "../../lib/content/value-prop/shared";

interface FinalCtaClientProps {
  locale: Locale;
  cta: FinalCtaContent;
}

type FormStep = 1 | 2 | "success";

function FinalCtaSuccess({ cta }: { cta: FinalCtaContent }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-signal-100">
        <span className="text-xl" aria-hidden="true">
          ✓
        </span>
      </div>
      <h3 className="mt-4 text-xl font-semibold text-ink-950">
        {cta.successTitle}
      </h3>
      <p className="mt-2 text-sm text-ink-700">{cta.successBody}</p>
    </div>
  );
}

function FinalCtaField({
  field,
  value,
  onChange,
}: {
  field:
    | FinalCtaContent["step1Fields"][number]
    | FinalCtaContent["step2Fields"][number];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-950">
        {field.name}
      </label>
      {field.type === "select" && "options" in field && field.options ? (
        <select
          className="h-14 w-full rounded-input border border-v2-border-200 bg-surface-0 px-4 text-sm text-ink-950 transition-colors focus:border-proof-500 focus:outline-none focus:ring-2 focus:ring-proof-500/20"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">—</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          rows={3}
          className="w-full rounded-input border border-v2-border-200 bg-surface-0 px-4 py-3 text-sm text-ink-950 transition-colors focus:border-proof-500 focus:outline-none focus:ring-2 focus:ring-proof-500/20"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          type={field.type}
          className="h-14 w-full rounded-input border border-v2-border-200 bg-surface-0 px-4 text-sm text-ink-950 transition-colors focus:border-proof-500 focus:outline-none focus:ring-2 focus:ring-proof-500/20"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

function StepIndicators({ step }: { step: Exclude<FormStep, "success"> }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <StepIndicator number={1} active={step === 1} />
      <div className="h-px flex-1 bg-v2-border-200" />
      <StepIndicator number={2} active={step === 2} />
    </div>
  );
}

function FinalCtaStepOne({
  cta,
  formData,
  onUpdate,
  onContinue,
}: {
  cta: FinalCtaContent;
  formData: Record<string, string>;
  onUpdate: (name: string, value: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      {cta.step1Fields.map((field) => (
        <FinalCtaField
          key={field.name}
          field={field}
          value={formData[field.name] ?? ""}
          onChange={(value) => onUpdate(field.name, value)}
        />
      ))}
      <button
        type="button"
        onClick={onContinue}
        className="mt-2 flex h-[52px] w-full items-center justify-center rounded-[14px] bg-signal-500 font-semibold text-ink-950 transition-all duration-200 hover:brightness-105 active:scale-[0.98]"
      >
        {cta.step1Cta}
      </button>
    </div>
  );
}

function FinalCtaStepTwo({
  locale,
  cta,
  formData,
  onUpdate,
  onBack,
  onSubmit,
}: {
  locale: Locale;
  cta: FinalCtaContent;
  formData: Record<string, string>;
  onUpdate: (name: string, value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      {cta.step2Fields.map((field) => (
        <FinalCtaField
          key={field.name}
          field={field}
          value={formData[field.name] ?? ""}
          onChange={(value) => onUpdate(field.name, value)}
        />
      ))}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-[52px] flex-1 items-center justify-center rounded-[14px] border border-v2-border-300 text-sm font-semibold text-ink-950 transition-colors hover:bg-surface-75"
        >
          {locale === "fr" ? "Retour" : "Back"}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="flex h-[52px] flex-[2] items-center justify-center rounded-[14px] bg-signal-500 font-semibold text-ink-950 transition-all duration-200 hover:brightness-105 active:scale-[0.98]"
        >
          {cta.step2Cta}
        </button>
      </div>
    </div>
  );
}

export function FinalCtaClient({ locale, cta }: FinalCtaClientProps) {
  const [step, setStep] = useState<FormStep>(1);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const updateField = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (step === "success") {
    return <FinalCtaSuccess cta={cta} />;
  }

  return (
    <div>
      <StepIndicators step={step} />
      {step === 1 ? (
        <FinalCtaStepOne
          cta={cta}
          formData={formData}
          onUpdate={updateField}
          onContinue={() => setStep(2)}
        />
      ) : (
        <FinalCtaStepTwo
          locale={locale}
          cta={cta}
          formData={formData}
          onUpdate={updateField}
          onBack={() => setStep(1)}
          onSubmit={() => setStep("success")}
        />
      )}
    </div>
  );
}

function StepIndicator({
  number,
  active,
}: {
  number: number;
  active: boolean;
}) {
  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
        active ? "bg-proof-500 text-white" : "bg-surface-100 text-ink-600"
      }`}
    >
      {number}
    </div>
  );
}
