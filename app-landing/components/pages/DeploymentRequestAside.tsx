"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";
import {
  CheckBadgeIcon,
  ClockPulseIcon,
  DecisionGraphIcon,
} from "../shared/icons/MarketingIcons";
import { ShimmerTrack } from "../shared/motion/ShimmerTrack";
import type {
  DeploymentRequestFormOptions,
  DeploymentRequestPageUi,
} from "./deployment-request.types";

export function DeploymentRequestAside({
  dict,
  homeHref,
  options,
  offerHref,
  ui,
}: {
  dict: Dictionary;
  homeHref: string;
  options: DeploymentRequestFormOptions;
  offerHref: string;
  ui: DeploymentRequestPageUi;
}) {
  return (
    <aside className="space-y-6 md:pt-2">
      <div>
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brass-700">
          <DecisionGraphIcon size={14} />
          {ui.formKicker}
        </span>
        <h1 className="mt-4 max-w-[18ch] text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
          {dict.form.pageTitle}
        </h1>
        <p className="mt-5 max-w-[54ch] text-base leading-relaxed text-neutral-600">
          {dict.form.pageSubtitle}
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
          {dict.form.pill}
        </p>
        <ul className="mt-4 list-none space-y-2.5 p-0">
          {options.valuePoints.map((point) => (
            <li
              key={point}
              className="m-0 flex items-start gap-2.5 text-sm text-neutral-700"
            >
              <CheckBadgeIcon
                size={16}
                className="mt-0.5 shrink-0 text-amber-600"
              />
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center gap-2 text-xs text-neutral-600">
          <ClockPulseIcon size={14} className="text-amber-700" />
          <span>
            {dict.form.estimatedTime}: {dict.form.estimatedTimeValue}
          </span>
        </div>
        <ShimmerTrack
          className="mt-4 bg-amber-100/80"
          indicatorClassName="via-amber-500/60"
        />
      </section>

      <section className="rounded-[1.75rem] border border-neutral-200/80 bg-white/95 p-5 md:p-6">
        <p className="text-sm leading-relaxed text-neutral-600">
          {ui.offerHint}
        </p>
        <Link
          href={offerHref}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-neutral-50 active:-translate-y-[1px] active:scale-[0.99]"
        >
          {dict.form.success.checkEmail}
          <ArrowRight size={14} />
        </Link>
      </section>
    </aside>
  );
}
