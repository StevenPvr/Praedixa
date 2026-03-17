import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { SectionShellV2 } from "../shared/SectionShellV2";
import { Kicker } from "../shared/Kicker";
import { MethodBlockClient } from "./MethodBlockClient";

interface MethodBlockSectionProps {
  locale: Locale;
}

export function MethodBlockSection({ locale }: MethodBlockSectionProps) {
  const vp = getValuePropContent(locale);
  const method = vp.method;

  return (
    <SectionShellV2 id="methode">
      <div className="mx-auto max-w-text">
        <Kicker>{method.kicker}</Kicker>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-950 md:text-4xl">
          {method.heading}
        </h2>
      </div>
      <MethodBlockClient steps={method.steps} />
    </SectionShellV2>
  );
}
