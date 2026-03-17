import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { SectionShellV2 } from "../shared/SectionShellV2";
import { ChipV2 } from "../shared/v2/ChipV2";

interface CredibilityRibbonSectionProps {
  locale: Locale;
}

export function CredibilityRibbonSection({
  locale,
}: CredibilityRibbonSectionProps) {
  const vp = getValuePropContent(locale);
  const ribbon = vp.credibilityRibbon;

  return (
    <SectionShellV2 id="credibilite" className="!py-10 md:!py-14">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {/* Stack chips */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-600">
            {ribbon.stackLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {ribbon.stackChips.map((chip) => (
              <ChipV2 key={chip} variant="neutral" label={chip} />
            ))}
          </div>
        </div>

        {/* Role chips */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-600">
            {ribbon.rolesLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {ribbon.roleChips.map((chip) => (
              <ChipV2 key={chip} variant="proof" label={chip} />
            ))}
          </div>
          <p className="text-xs text-ink-600">{ribbon.rolesMicrocopy}</p>
        </div>

        {/* Trust markers */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-600">
            {ribbon.trustLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {ribbon.trustMarkers.map((marker) => (
              <ChipV2 key={marker} variant="signal" label={marker} />
            ))}
          </div>
        </div>
      </div>
    </SectionShellV2>
  );
}
