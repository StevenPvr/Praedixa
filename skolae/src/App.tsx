import { CTASection } from "@/components/CTASection";
import { DecisionFocusSection } from "@/components/DecisionFocusSection";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/HeroSection";
import { LoopSection } from "@/components/LoopSection";
import { PilotSection } from "@/components/PilotSection";
import { StakeholderSection } from "@/components/StakeholderSection";
import { WhyNowSection } from "@/components/WhyNowSection";

export default function App() {
  return (
    <div className="relative overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-grid-ink bg-[size:72px_72px] opacity-[0.18]"
      />
      <main className="relative z-10">
        <HeroSection />
        <WhyNowSection />
        <DecisionFocusSection />
        <LoopSection />
        <StakeholderSection />
        <PilotSection />
        <CTASection />
        <Footer />
      </main>
    </div>
  );
}
