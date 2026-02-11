import { ShieldCheck, Sparkles, Target } from "lucide-react";
import { PraedixaLogo } from "../../components/praedixa-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-page lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r border-black/[0.06] bg-[linear-gradient(165deg,oklch(0.23_0.03_258),oklch(0.19_0.028_258))] p-12 text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(245,198,90,0.25),transparent_38%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_84%,rgba(96,124,255,0.18),transparent_40%)]" />

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-center gap-3">
            <PraedixaLogo size={36} className="text-white" color="white" />
            <span className="font-heading text-2xl tracking-tight">
              Praedixa
            </span>
          </div>

          <div className="max-w-xl space-y-8">
            <p className="text-xs uppercase tracking-[0.16em] text-white/85">
              Executive operations platform
            </p>
            <h1 className="font-heading text-5xl leading-[1.02] text-balance">
              Pilotez vos decisions critiques avant la rupture.
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-white/[0.82]">
              Praedixa centralise le risque operationnel, les arbitrages de
              capacite et les decisions terrain dans une war room unique, concue
              pour les directions exigeantes.
            </p>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2 text-white/90">
                <Sparkles className="mt-0.5 h-4 w-4 text-amber-300" />
                Vision consolidée des risques a 3, 7 et 14 jours.
              </div>
              <div className="flex items-start gap-2 text-white/90">
                <Target className="mt-0.5 h-4 w-4 text-amber-300" />
                Priorisation automatique des alertes selon impact metier.
              </div>
              <div className="flex items-start gap-2 text-white/90">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-amber-300" />
                Gouvernance des decisions et traçabilite board-ready.
              </div>
            </div>
          </div>

          <p className="text-xs text-white/78">
            Reserved for authorized client teams only.
          </p>
        </div>
      </section>

      <section
        id="main-content"
        className="relative flex items-center justify-center p-6 sm:p-10"
      >
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-black/[0.08] bg-white/[0.88] p-8 shadow-elevated backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <PraedixaLogo size={44} />
            <h1 className="font-heading text-2xl font-semibold text-ink">
              Praedixa
            </h1>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
