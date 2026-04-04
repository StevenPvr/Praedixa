import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { SectionShellV2 } from "../shared/SectionShellV2";
import { FinalCtaClient } from "./FinalCtaClient";

interface FinalCtaSectionProps {
  locale: Locale;
}

export function FinalCtaSection({ locale }: FinalCtaSectionProps) {
  const vp = getValuePropContent(locale);
  const cta = vp.finalCta;

  return (
    <SectionShellV2 id="contact">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-surface-0 shadow-2">
        <div className="grid grid-cols-1 md:grid-cols-[5fr_7fr]">
          {/* Left panel — promise */}
          <div className="flex flex-col justify-center bg-surface-50 p-8 md:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-proof-500">
              {cta.label}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-950 md:text-3xl">
              {cta.heading}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              {cta.body}
            </p>
            <ul className="mt-6 space-y-2.5">
              {cta.promiseItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-ink-700"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-500"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right panel — form */}
          <div className="p-8 md:p-10">
            <FinalCtaClient
              locale={locale}
              cta={cta}
              calendlyExpertLabel={vp.ctaCalendlyExpert}
            />
          </div>
        </div>
      </div>
    </SectionShellV2>
  );
}
