import { lazy, Suspense } from "react";
import { Navbar, Footer, HeroSection } from "../components";
import { SolutionSection } from "../components/sections/SolutionSection";
import { FaqSection } from "../components/sections/FaqSection";
import { ContactSection } from "../components/sections/ContactSection";
import { PilotSection } from "../components/sections/PilotSection";
import { StickyMobileCTA } from "../components/layout/StickyMobileCTA";

// Lazy-load visually heavy sections (SVG illustrations, mockup graphics)
const ProblemSection = lazy(() =>
  import("../components/sections/ProblemSection").then((m) => ({
    default: m.ProblemSection,
  })),
);
const PipelineSection = lazy(() =>
  import("../components/sections/PipelineSection").then((m) => ({
    default: m.PipelineSection,
  })),
);
const DeliverablesSection = lazy(() =>
  import("../components/sections/DeliverablesSection").then((m) => ({
    default: m.DeliverablesSection,
  })),
);

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <Suspense fallback={null}>
          <ProblemSection />
        </Suspense>
        <SolutionSection />
        <Suspense fallback={null}>
          <PipelineSection />
        </Suspense>
        <Suspense fallback={null}>
          <DeliverablesSection />
        </Suspense>
        <PilotSection />
        <FaqSection />
        <ContactSection />
      </main>
      <Footer />
      <StickyMobileCTA />
    </>
  );
}
