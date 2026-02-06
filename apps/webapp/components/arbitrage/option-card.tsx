"use client";

import {
  Clock,
  UserPlus,
  ArrowLeftRight,
  ShieldAlert,
  GraduationCap,
  CalendarClock,
  Check,
  Loader2,
} from "lucide-react";
import { StatusBadge } from "@praedixa/ui";
import type { ArbitrageOption } from "@praedixa/shared-types";

/* ────────────────────────────────────────────── */
/*  Mappings                                       */
/* ────────────────────────────────────────────── */

const typeIcons: Record<string, typeof Clock> = {
  overtime: Clock,
  external: UserPlus,
  redistribution: ArrowLeftRight,
  no_action: ShieldAlert,
  replacement: UserPlus,
  postponement: CalendarClock,
  training: GraduationCap,
};

const riskVariant: Record<string, "success" | "warning" | "danger"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

const riskLabel: Record<string, string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Eleve",
};

/* ────────────────────────────────────────────── */
/*  Props                                          */
/* ────────────────────────────────────────────── */

interface OptionCardProps {
  option: ArbitrageOption;
  index: number;
  isRecommended: boolean;
  isSelected: boolean;
  onValidate: (index: number) => void;
  validating: boolean;
  disabled?: boolean;
}

/* ────────────────────────────────────────────── */
/*  Component                                      */
/* ────────────────────────────────────────────── */

export function OptionCard({
  option,
  index,
  isRecommended,
  isSelected,
  onValidate,
  validating,
  disabled = false,
}: OptionCardProps) {
  /* v8 ignore next */
  const Icon = typeIcons[option.type] ?? ShieldAlert;
  const isDisabled = disabled || validating;

  return (
    <article
      aria-label={`Option : ${option.label}`}
      className={[
        "relative flex flex-col rounded-card border bg-card p-5 shadow-card transition-shadow duration-200",
        // Recommended: amber left border
        isRecommended
          ? "border-l-4 border-l-amber-500 border-t-gray-200 border-r-gray-200 border-b-gray-200"
          : "border-gray-200",
        // Selected: amber ring
        /* v8 ignore next */
        isSelected && "ring-2 ring-amber-500 shadow-card-hover",
        // Hover (only when interactive)
        !isDisabled && "hover:shadow-card-hover",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ── Header: Icon + label + recommended badge ── */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <Icon className="h-5 w-5 text-gray-600" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug text-charcoal">
            {option.label}
          </h3>
        </div>
        {isRecommended && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            <Check className="h-3 w-3" aria-hidden="true" />
            Recommande
          </span>
        )}
      </div>

      {/* ── Cost KPI ── */}
      <div className="mt-4">
        <span className="font-serif text-2xl font-bold text-charcoal">
          {option.cost.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          })}
        </span>
        <span className="ml-1.5 text-xs text-gray-400">cout estime</span>
      </div>

      {/* ── Metrics row ── */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          {option.delayDays} jour{option.delayDays > 1 ? "s" : ""}
        </span>
        <span>
          Couverture{" "}
          <span
            className={
              option.coverageImpactPct > 0
                ? "font-medium text-success-600"
                : option.coverageImpactPct < 0
                  ? "font-medium text-danger-600"
                  : "font-medium text-charcoal"
            }
          >
            {option.coverageImpactPct > 0 ? "+" : ""}
            {option.coverageImpactPct}%
          </span>
        </span>
        <StatusBadge
          /* v8 ignore next 2 */
          variant={riskVariant[option.riskLevel] ?? "warning"}
          label={riskLabel[option.riskLevel] ?? option.riskLevel}
          size="sm"
        />
      </div>

      {/* ── Risk details ── */}
      <p className="mt-3 text-xs leading-relaxed text-gray-400">
        {option.riskDetails}
      </p>

      {/* ── Pros / Cons ── */}
      {(option.pros.length > 0 || option.cons.length > 0) && (
        <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          {option.pros.length > 0 && (
            <div>
              <p className="mb-1.5 font-semibold text-success-700">Avantages</p>
              <ul className="space-y-1 text-gray-600" aria-label="Avantages">
                {option.pros.map((pro) => (
                  <li key={pro} className="flex items-start gap-1.5">
                    <span
                      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success-500"
                      aria-hidden="true"
                    />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {option.cons.length > 0 && (
            <div>
              <p className="mb-1.5 font-semibold text-danger-700">
                Inconvenients
              </p>
              <ul
                className="space-y-1 text-gray-600"
                aria-label="Inconvenients"
              >
                {option.cons.map((con) => (
                  <li key={con} className="flex items-start gap-1.5">
                    <span
                      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-danger-500"
                      aria-hidden="true"
                    />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Action button ── */}
      <div className="mt-auto pt-5">
        <button
          type="button"
          onClick={() => onValidate(index)}
          disabled={isDisabled}
          aria-busy={validating}
          className={[
            "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
            isDisabled && "cursor-not-allowed opacity-50",
            isRecommended
              ? "bg-amber-500 text-charcoal hover:bg-amber-400 active:bg-amber-600"
              : "border border-gray-200 bg-white text-charcoal hover:bg-gray-50 active:bg-gray-100",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {validating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Validation...
            </>
          ) : (
            "Valider cette option"
          )}
        </button>
      </div>
    </article>
  );
}
