import {
  buildContactIntentHref,
  getLocalizedPath,
} from "../../lib/i18n/config";
import type { Locale } from "../../lib/i18n/config";
import { HeroPulsorContent } from "./HeroPulsorContent";
import { HeroPulsorDepthLayers } from "./HeroPulsorDepthLayers";
import { HeroPulsorLogoRail } from "./HeroPulsorLogoRail";

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
          "linear-gradient(170deg, #FAFAFA 0%, #F4F5F8 35%, #EEF0F5 65%, #F2F3F6 100%)",
      }}
    >
      {/* Decorative depth layers (radial glow, columns, grain) — mouse-reactive parallax */}
      <HeroPulsorDepthLayers />

      {/* Front content */}
      <div className="relative z-10 flex min-h-[860px] flex-col items-center justify-center pb-4 pt-[calc(var(--header-h)+2rem)] min-[480px]:min-h-[880px] md:min-h-[900px] lg:min-h-[960px] xl:min-h-[1000px] 2xl:min-h-[1040px]">
        <HeroPulsorContent
          locale={locale}
          contactHref={contactHref}
          proofHref={proofHref}
        />

        {/* Logo rail — pinned to bottom */}
        <div className="mt-auto w-full pt-8">
          <HeroPulsorLogoRail locale={locale} />
        </div>
      </div>
    </section>
  );
}
