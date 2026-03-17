import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { SectionShellV2 } from "../shared/SectionShellV2";
import { Kicker } from "../shared/Kicker";
import { ButtonPrimary } from "../shared/v2/ButtonPrimary";
import { ProofBlockClient } from "./ProofBlockClient";

interface ProofBlockSectionProps {
  locale: Locale;
}

export function ProofBlockSection({ locale }: ProofBlockSectionProps) {
  const vp = getValuePropContent(locale);
  const pp = vp.proofPreview;
  const proofHref = getLocalizedPath(locale, "decisionLogProof");

  return (
    <SectionShellV2 id="preuve" variant="dark">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
        {/* Left — text */}
        <div className="lg:col-span-5">
          <Kicker className="text-signal-500">{pp.kicker}</Kicker>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {pp.heading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[rgba(255,255,255,0.74)]">
            {pp.body}
          </p>
          <div className="mt-8">
            <ButtonPrimary href={proofHref} label={vp.ctaPrimary} />
          </div>
        </div>

        {/* Right — interactive preview */}
        <div className="lg:col-span-7">
          <ProofBlockClient tabs={pp.tabs} metrics={pp.metrics} />
        </div>
      </div>
    </SectionShellV2>
  );
}
