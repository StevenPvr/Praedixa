import {
  buildContactIntentHref,
  getLocalizedPath,
} from "../../lib/i18n/config";
import type { Locale } from "../../lib/i18n/config";
import { HeroPulsorContent } from "./HeroPulsorContent";
import { HeroPulsorVideoBackdrop } from "./HeroPulsorVideoBackdrop";

interface HeroPulsorSectionProps {
  locale: Locale;
}

export function HeroPulsorSection({ locale }: HeroPulsorSectionProps) {
  const contactHref = buildContactIntentHref(locale, "deployment");
  const proofHref = getLocalizedPath(locale, "decisionLogProof");

  return (
    <section
      className="hero-pulsor relative isolate -mt-[var(--header-h)] overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #09111a 0%, #0b131c 58%, #111922 100%)",
      }}
    >
      <HeroPulsorVideoBackdrop />

      <div className="relative z-10 flex min-h-[100dvh] items-center pb-14 pt-[calc(var(--header-h)+3.25rem)]">
        <HeroPulsorContent
          locale={locale}
          contactHref={contactHref}
          proofHref={proofHref}
        />
      </div>
    </section>
  );
}
