import { notFound } from "next/navigation";
import { isValidLocale } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { HeroSection } from "../../components/sections/HeroSection";
import { ProblemSection } from "../../components/sections/ProblemSection";
import { SolutionSection } from "../../components/sections/SolutionSection";
import { HowItWorksSection } from "../../components/sections/HowItWorksSection";
import { UseCasesSection } from "../../components/sections/UseCasesSection";
import { DeliverablesSection } from "../../components/sections/DeliverablesSection";
import { SecuritySection } from "../../components/sections/SecuritySection";
import { PilotSection } from "../../components/sections/PilotSection";
import { FaqSection } from "../../components/sections/FaqSection";
import { ContactSection } from "../../components/sections/ContactSection";
import { StickyMobileCTA } from "../../components/layout/StickyMobileCTA";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const dict = await getDictionary(locale);

  return (
    <>
      <Navbar dict={dict} locale={locale} />
      <main>
        <HeroSection dict={dict} locale={locale} />
        <ProblemSection dict={dict} />
        <SolutionSection dict={dict} />
        <HowItWorksSection dict={dict} />
        <UseCasesSection dict={dict} />
        <DeliverablesSection dict={dict} />
        <SecuritySection dict={dict} />
        <PilotSection dict={dict} locale={locale} />
        <FaqSection dict={dict} locale={locale} />
        <ContactSection dict={dict} locale={locale} />
      </main>
      <Footer dict={dict} locale={locale} />
      <StickyMobileCTA dict={dict} locale={locale} />
    </>
  );
}
