import { ShieldCheck, Sparkles, Target } from "lucide-react";
import { PraedixaLogo } from "../../components/praedixa-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-[var(--hero-blue-deep)] lg:grid-cols-2">
      {/* Left branding panel */}
      <section className="relative hidden overflow-hidden border-r border-white/16 bg-[linear-gradient(165deg,color-mix(in_oklch,var(--hero-blue-deep)_90%,black),var(--hero-blue-deep))] p-12 text-white lg:block">
        {/* Ambient glow effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_10%,var(--hero-blue-aurora-1)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_90%,var(--hero-blue-aurora-2)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,var(--hero-blue-aurora-3)_0%,transparent_60%)]" />

        <div className="relative z-10 flex h-full flex-col justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <PraedixaLogo size={34} className="text-white" color="white" />
            <span className="font-sans font-bold text-2xl tracking-tight">
              Praedixa
            </span>
          </div>

          {/* Hero content */}
          <div className="max-w-xl space-y-8">
            <p className="text-overline text-white/80">
              Executive operations platform
            </p>
            <h1 className="font-sans font-bold text-display-lg text-balance leading-[1.02]">
              Pilotez vos decisions critiques avant la rupture.
            </h1>
            <p className="max-w-lg text-body leading-relaxed text-white/75">
              Praedixa centralise le risque operationnel, les arbitrages de
              capacite et les decisions terrain dans une war room unique, concue
              pour les directions exigeantes.
            </p>

            <div className="space-y-3.5">
              {[
                {
                  icon: Sparkles,
                  text: "Vision consolidee des risques a 3, 7 et 14 jours.",
                },
                {
                  icon: Target,
                  text: "Priorisation automatique des alertes selon impact metier.",
                },
                {
                  icon: ShieldCheck,
                  text: "Gouvernance des decisions et tracabilite board-ready.",
                },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-start gap-3 text-body-sm text-white/85"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/14">
                    <Icon className="h-3.5 w-3.5 text-accent" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <p className="text-caption text-white/50">
            Reserved for authorized client teams only.
          </p>
        </div>
      </section>

      {/* Right form panel */}
      <section
        id="main-content"
        className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_80%_60%_at_20%_10%,var(--hero-blue-aurora-1)_0%,transparent_60%),radial-gradient(ellipse_60%_50%_at_80%_90%,var(--hero-blue-aurora-2)_0%,transparent_60%),radial-gradient(ellipse_50%_40%_at_50%_50%,var(--hero-blue-aurora-3)_0%,transparent_60%),var(--hero-blue-deep)] p-6 sm:p-10"
      >
        <div className="w-full max-w-md space-y-6 rounded-xl border border-white/18 bg-[oklch(0.985_0.016_252_/_0.92)] p-8 shadow-floating backdrop-blur-[24px]">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <PraedixaLogo size={44} />
            <h1 className="font-sans font-bold text-heading-lg text-ink">
              Praedixa
            </h1>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
