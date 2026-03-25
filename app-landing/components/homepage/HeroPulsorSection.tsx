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
          "radial-gradient(980px 520px at 78% 18%, rgba(240,179,93,0.08), transparent 42%), radial-gradient(720px 520px at 16% 78%, rgba(240,179,93,0.06), transparent 48%), linear-gradient(180deg, #ffffff 0%, #fffdf9 34%, #ffffff 100%)",
      }}
    >
      {/* Decorative depth layers (radial glow, columns, grain) — mouse-reactive parallax */}
      <HeroPulsorDepthLayers />

      {/* Front content */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col justify-between pb-4 pt-[calc(var(--header-h)+2.5rem)]">
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
