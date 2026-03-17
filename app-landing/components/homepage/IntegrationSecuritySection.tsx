import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { SectionShellV2 } from "../shared/SectionShellV2";
import { Kicker } from "../shared/Kicker";
import { ChipV2 } from "../shared/v2/ChipV2";

interface IntegrationSecuritySectionProps {
  locale: Locale;
}

function IntegrationControlCard({
  badge,
  title,
  body,
}: {
  badge: string;
  title: string;
  body: string;
}) {
  return (
    <article className="group rounded-card border border-white/[0.08] bg-white/[0.04] p-5 transition-all duration-300 hover:border-[rgba(91,115,255,0.4)]">
      <span className="inline-flex rounded-full bg-signal-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-signal-500">
        {badge}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-[rgba(255,255,255,0.64)]">
        {body}
      </p>
    </article>
  );
}

function IntegrationStackRibbon({ items }: { items: readonly string[] }) {
  return (
    <div className="mt-10 flex flex-wrap justify-center gap-2">
      {items.map((item) => (
        <ChipV2
          key={item}
          variant="neutral"
          label={item}
          className="border-white/10 bg-white/[0.06] text-[rgba(255,255,255,0.65)]"
        />
      ))}
    </div>
  );
}

export function IntegrationSecuritySection({
  locale,
}: IntegrationSecuritySectionProps) {
  const vp = getValuePropContent(locale);
  const is = vp.integrationSecurity;

  return (
    <SectionShellV2 id="integration" variant="dark" className="bg-[#121925]">
      <div className="mx-auto max-w-text">
        <Kicker className="text-signal-500">{is.kicker}</Kicker>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {is.heading}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[rgba(255,255,255,0.72)]">
          {is.subheading}
        </p>
      </div>

      {/* Control cards grid */}
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {is.controls.map((control) => (
          <IntegrationControlCard
            key={control.title}
            badge={control.badge}
            title={control.title}
            body={control.body}
          />
        ))}
      </div>

      <IntegrationStackRibbon items={is.stackItems} />
    </SectionShellV2>
  );
}
