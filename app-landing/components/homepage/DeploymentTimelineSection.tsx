import type { Locale } from "../../lib/i18n/config";
import { buildContactIntentHref } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { SectionShellV2 } from "../shared/SectionShellV2";
import { Kicker } from "../shared/Kicker";
import { ButtonPrimary } from "../shared/v2/ButtonPrimary";

interface DeploymentTimelineSectionProps {
  locale: Locale;
}

type DeploymentStep = ReturnType<
  typeof getValuePropContent
>["deployment"]["steps"][number];

export function DeploymentTimelineSection({
  locale,
}: DeploymentTimelineSectionProps) {
  const vp = getValuePropContent(locale);
  const dep = vp.deployment;

  return (
    <SectionShellV2 id="deploiement">
      <DeploymentTimelineHeader
        kicker={dep.kicker}
        heading={dep.heading}
        subheading={dep.subheading}
      />
      <DeploymentTimelineDesktop steps={dep.steps} />
      <DeploymentTimelineMobile steps={dep.steps} />
      <DeploymentTimelineNotBlock locale={locale} items={dep.notItems} />
      <DeploymentTimelineCta
        href={buildContactIntentHref(locale, "deployment")}
        label={vp.ctaSecondary}
        microcopy={dep.ctaMicrocopy}
      />
    </SectionShellV2>
  );
}

function DeploymentTimelineHeader({
  kicker,
  heading,
  subheading,
}: {
  kicker: string;
  heading: string;
  subheading: string;
}) {
  return (
    <div className="mx-auto max-w-text">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-950 md:text-4xl">
        {heading}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-ink-700">
        {subheading}
      </p>
    </div>
  );
}

function DeploymentTimelineDesktop({ steps }: { steps: DeploymentStep[] }) {
  return (
    <div className="mt-14 hidden lg:block">
      <div className="relative flex items-start justify-between">
        <div
          className="absolute left-0 right-0 top-5 h-0.5 bg-v2-border-200"
          aria-hidden="true"
        />
        <div
          className="absolute left-0 right-0 top-5 h-0.5 origin-left bg-proof-500"
          style={{ width: "100%" }}
          aria-hidden="true"
        />
        {steps.map((step) => (
          <DeploymentTimelineDesktopStep key={step.marker} step={step} />
        ))}
      </div>
    </div>
  );
}

function DeploymentTimelineDesktopStep({ step }: { step: DeploymentStep }) {
  return (
    <div className="relative flex w-1/5 flex-col items-center text-center">
      <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-proof-500 font-mono text-sm font-medium text-white shadow-1">
        {step.marker}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink-950">{step.title}</h3>
      <p className="mt-1.5 max-w-[18ch] text-xs leading-relaxed text-ink-700">
        {step.description}
      </p>
    </div>
  );
}

function DeploymentTimelineMobile({ steps }: { steps: DeploymentStep[] }) {
  return (
    <div className="mt-10 lg:hidden">
      <div className="relative ml-5 border-l-2 border-proof-500 pl-8">
        {steps.map((step) => (
          <DeploymentTimelineMobileStep key={step.marker} step={step} />
        ))}
      </div>
    </div>
  );
}

function DeploymentTimelineMobileStep({ step }: { step: DeploymentStep }) {
  return (
    <div className="relative pb-8 last:pb-0">
      <div className="absolute -left-[calc(0.625rem+1.25rem)] flex h-8 w-8 items-center justify-center rounded-full bg-proof-500 font-mono text-xs font-medium text-white">
        {step.marker}
      </div>
      <h3 className="text-sm font-semibold text-ink-950">{step.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-700">
        {step.description}
      </p>
    </div>
  );
}

function DeploymentTimelineNotBlock({
  locale,
  items,
}: {
  locale: Locale;
  items: string[];
}) {
  return (
    <div className="mx-auto mt-14 max-w-text rounded-card border border-v2-border-200 bg-surface-50 p-6">
      <p className="text-sm font-semibold text-ink-950">
        {locale === "fr"
          ? "Ce que ce déploiement n'est pas"
          : "What this deployment is not"}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-sm text-ink-700"
          >
            <span
              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-risk-500"
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeploymentTimelineCta({
  href,
  label,
  microcopy,
}: {
  href: string;
  label: string;
  microcopy: string;
}) {
  return (
    <div className="mt-10 text-center">
      <ButtonPrimary href={href} label={label} />
      <p className="mt-3 text-xs text-ink-600">{microcopy}</p>
    </div>
  );
}
