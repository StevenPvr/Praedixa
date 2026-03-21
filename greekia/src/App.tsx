import { CTASection } from "@/components/CTASection";
import { DecisionFocusSection } from "@/components/DecisionFocusSection";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
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
        className="pointer-events-none fixed inset-0 z-0 bg-grid-ink bg-[size:96px_96px] opacity-[0.12]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[-10vw] top-[12vh] z-0 h-[26rem] w-[26rem] rounded-full bg-oxide/14 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-[-12vh] right-[-6vw] z-0 h-[32rem] w-[32rem] rounded-full bg-ink/10 blur-3xl"
      />
      <main className="relative z-10">
        <Header />
        <HeroSection />
        <section className="overflow-hidden border-y border-ink/12 bg-ink py-3 text-limestone">
          <div className="whitespace-nowrap font-display text-xl uppercase tracking-[0.16em] text-limestone/92 sm:text-2xl">
            <span className="inline-block px-6">
              marge
              <span className="mx-4 text-oxide-soft">+</span>
              fraicheur
              <span className="mx-4 text-oxide-soft">+</span>
              debit
              <span className="mx-4 text-oxide-soft">+</span>
              reseau
              <span className="mx-4 text-oxide-soft">+</span>
              ouverture
            </span>
            <span className="inline-block px-6">
              marge
              <span className="mx-4 text-oxide-soft">+</span>
              fraicheur
              <span className="mx-4 text-oxide-soft">+</span>
              debit
              <span className="mx-4 text-oxide-soft">+</span>
              reseau
              <span className="mx-4 text-oxide-soft">+</span>
              ouverture
            </span>
          </div>
        </section>
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
