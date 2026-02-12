import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { HeroSection } from "../components/sections/HeroSection";
import { TrustBand } from "../components/sections/TrustBand";
import { ProblemSection } from "../components/sections/ProblemSection";
import { SolutionSection } from "../components/sections/SolutionSection";
import { PipelineSection } from "../components/sections/PipelineSection";
import { DeliverablesSection } from "../components/sections/DeliverablesSection";
import { PilotSection } from "../components/sections/PilotSection";
import { FaqSection } from "../components/sections/FaqSection";
import { ContactSection } from "../components/sections/ContactSection";
import { StickyMobileCTA } from "../components/layout/StickyMobileCTA";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <TrustBand />
        <ProblemSection />
        <SolutionSection />
        <PipelineSection />
        <DeliverablesSection />
        <PilotSection />
        <FaqSection />
        <ContactSection />
      </main>
      <Footer />
      <StickyMobileCTA />
    </>
  );
}
