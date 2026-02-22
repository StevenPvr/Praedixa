import { HeroSection } from "./HeroSection";
import { ProblemSection } from "./ProblemSection";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";

interface HeroTransitionWrapperProps {
  dict: Dictionary;
  locale: Locale;
}

export function HeroTransitionWrapper({
  dict,
  locale,
}: HeroTransitionWrapperProps) {
  return (
    <>
      <HeroSection dict={dict} locale={locale} />
      <ProblemSection dict={dict} />
    </>
  );
}
