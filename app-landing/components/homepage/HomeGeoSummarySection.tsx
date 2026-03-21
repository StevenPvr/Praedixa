import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { GeoSummaryPanel } from "../shared/GeoSummaryPanel";
import { SectionShellV2 } from "../shared/SectionShellV2";

interface HomeGeoSummarySectionProps {
  locale: Locale;
}

function buildHomeTakeaways(locale: Locale) {
  const valueProp = getValuePropContent(locale);

  return [
    valueProp.mechanism,
    valueProp.stackComparison.bottomNote,
    valueProp.reassurance[0] ?? "",
  ];
}

export function HomeGeoSummarySection({ locale }: HomeGeoSummarySectionProps) {
  const valueProp = getValuePropContent(locale);

  return (
    <SectionShellV2 id="resume" className="!py-0 pb-8 md:pb-12">
      <div className="mx-auto max-w-4xl">
        <GeoSummaryPanel
          locale={locale}
          summary={valueProp.promise}
          takeaways={buildHomeTakeaways(locale)}
          eyebrow={
            locale === "fr"
              ? "Point d'entrée canonique"
              : "Canonical entry point"
          }
          title={locale === "fr" ? "Praedixa en bref" : "Praedixa at a glance"}
        />
      </div>
    </SectionShellV2>
  );
}
