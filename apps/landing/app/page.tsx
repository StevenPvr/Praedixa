import { lazy, Suspense } from "react";
import { Navbar, Footer, HeroSection } from "../components";

const ImpactRevealSection = lazy(() =>
  import("../components/sections/ImpactRevealSection").then((m) => ({
    default: m.ImpactRevealSection,
  })),
);
const PainPointsScrollSection = lazy(() =>
  import("../components/sections/PainPointsScrollSection").then((m) => ({
    default: m.PainPointsScrollSection,
  })),
);
const SolutionSection = lazy(() =>
  import("../components/sections/SolutionSection").then((m) => ({
    default: m.SolutionSection,
  })),
);
const HowItWorksSection = lazy(() =>
  import("../components/sections/HowItWorksSection").then((m) => ({
    default: m.HowItWorksSection,
  })),
);
const ProofSection = lazy(() =>
  import("../components/sections/ProofSection").then((m) => ({
    default: m.ProofSection,
  })),
);
const FaqSection = lazy(() =>
  import("../components/sections/FaqSection").then((m) => ({
    default: m.FaqSection,
  })),
);
const ContactSection = lazy(() =>
  import("../components/sections/ContactSection").then((m) => ({
    default: m.ContactSection,
  })),
);

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <Suspense fallback={null}>
          <ImpactRevealSection />
          <PainPointsScrollSection />
          <SolutionSection />
          <HowItWorksSection />
          <ProofSection />
          <FaqSection />
          <ContactSection />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
