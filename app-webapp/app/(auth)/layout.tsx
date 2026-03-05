"use client";

import { ShieldCheck, Sparkle, Target } from "@phosphor-icons/react";
import { PraedixaLogo } from "../../components/praedixa-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[100dvh] bg-page lg:grid-cols-2">
      {/* Left branding panel */}
      <section className="relative hidden overflow-hidden border-r border-border bg-[radial-gradient(120%_120%_at_0%_0%,oklch(0.97_0.03_160)_0%,transparent_55%),linear-gradient(165deg,var(--page-bg-strong),var(--page-bg))] p-14 text-ink lg:block">
        {/* Ambient glow effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_18%_12%,oklch(0.92_0.06_160_/_0.65)_0%,transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_42%_at_80%_88%,oklch(0.90_0.03_245_/_0.45)_0%,transparent_65%)]" />

        <div className="relative z-10 flex h-full flex-col justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <PraedixaLogo size={34} className="text-accent" />
            <span className="font-sans text-2xl font-bold tracking-tight">
              Praedixa
            </span>
          </div>

          {/* Hero content */}
          <div className="max-w-xl space-y-9">
            <p className="text-overline text-ink-tertiary">Client workspace</p>
            <h1 className="font-sans text-4xl font-bold leading-none tracking-tighter md:text-6xl">
              Comprendre la situation en quelques secondes.
            </h1>
            <p className="max-w-[60ch] text-body leading-relaxed text-ink-secondary">
              Une interface claire pour suivre les tensions, prioriser les
              actions et décider rapidement, sans jargon ni surcharge.
            </p>

            <div className="space-y-4">
              {[
                {
                  icon: Sparkle,
                  text: "Vue claire des tensions sur 3, 7 et 14 jours.",
                },
                {
                  icon: Target,
                  text: "Priorisation nette des alertes par impact réel.",
                },
                {
                  icon: ShieldCheck,
                  text: "Tracabilite complete des decisions prises.",
                },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-start gap-3 text-body-sm text-ink"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-elevated">
                    <Icon className="h-3.5 w-3.5 text-accent" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <p className="text-caption text-ink-tertiary">
            Accès réservé aux équipes clientes autorisées.
          </p>
        </div>
      </section>

      {/* Right form panel */}
      <section
        id="main-content"
        className="relative flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(ellipse_80%_58%_at_14%_10%,oklch(0.95_0.05_160_/_0.55)_0%,transparent_62%),radial-gradient(ellipse_54%_44%_at_88%_84%,oklch(0.93_0.03_250_/_0.34)_0%,transparent_68%),var(--page-bg)] p-6 sm:p-10"
      >
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-glass p-8 shadow-floating backdrop-blur-[22px] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.1)]">
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
