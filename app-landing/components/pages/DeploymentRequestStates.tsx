"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import {
  AlertDiamondIcon,
  CheckBadgeIcon,
} from "../shared/icons/MarketingIcons";
import { ScopingCallRequestPanel } from "../shared/ScopingCallRequestPanel";
import type { DeploymentRequestPageUi } from "./deployment-request.types";

export function DeploymentRequestMissingState({
  homeHref,
  ui,
}: {
  homeHref: string;
  ui: DeploymentRequestPageUi;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
      <div className="rounded-[2rem] border border-neutral-200/80 bg-white/95 p-8 text-center shadow-[0_22px_46px_-40px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.85)]">
        <AlertDiamondIcon size={44} className="mx-auto text-neutral-500" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
          {ui.missingTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-[52ch] text-base leading-relaxed text-neutral-600">
          {ui.missingBody}
        </p>
        <Link
          href={homeHref}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-neutral-50 active:-translate-y-[1px] active:scale-[0.99]"
        >
          <ArrowLeft size={16} />
          {ui.backToSite}
        </Link>
      </div>
    </div>
  );
}

export function DeploymentRequestSuccessState({
  companyName,
  dict,
  email,
  homeHref,
  locale,
  offerHref,
}: {
  companyName: string;
  dict: Dictionary;
  email: string;
  homeHref: string;
  locale: Locale;
  offerHref: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(165deg,rgba(244,231,198,0.62)_0%,rgba(252,248,238,0.9)_72%,rgba(255,255,255,0.96)_100%)] p-8 text-center shadow-[0_22px_46px_-38px_rgba(32,24,4,0.45),inset_0_1px_0_rgba(255,255,255,0.82)] md:p-10">
          <CheckBadgeIcon size={56} className="mx-auto text-amber-700" />
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {dict.form.success.title}
          </h1>
          <p className="mx-auto mt-3 max-w-[58ch] text-base leading-relaxed text-neutral-700">
            {dict.form.success.description}
          </p>
        </div>

        <ScopingCallRequestPanel
          locale={locale}
          defaultCompanyName={companyName}
          defaultEmail={email}
          source="deployment_success"
        />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={homeHref}
            className="inline-flex items-center gap-2 rounded-xl border border-brass-300 bg-white/80 px-4 py-2.5 text-sm font-semibold text-brass-800 no-underline transition-all duration-200 [transition-timing-function:var(--ease-snappy)] hover:border-brass-400 hover:bg-white active:-translate-y-[1px] active:scale-[0.99]"
          >
            <ArrowLeft size={16} />
            {dict.form.success.backToSite}
          </Link>
          <Link
            href={offerHref}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-all duration-200 [transition-timing-function:var(--ease-snappy)] hover:border-neutral-400 hover:bg-neutral-50 active:-translate-y-[1px] active:scale-[0.99]"
          >
            {dict.form.success.checkEmail}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
