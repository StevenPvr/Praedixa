import { lazy, Suspense } from "react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { HeroSection } from "../components/sections/HeroSection";
import { TrustBand } from "../components/sections/TrustBand";
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

function SectionSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto mb-12 h-8 w-64 animate-pulse rounded-lg bg-neutral-200" />
      <div className="mx-auto mb-6 h-4 w-96 animate-pulse rounded bg-neutral-100" />
      <div className="grid gap-8 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-2xl bg-neutral-100"
          />
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <TrustBand />
        <Suspense fallback={<SectionSkeleton />}>
          <ProblemSection />
        </Suspense>
        <SolutionSection />
        <Suspense fallback={<SectionSkeleton />}>
          <PipelineSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
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
