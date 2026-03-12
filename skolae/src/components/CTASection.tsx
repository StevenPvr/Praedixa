import { CalendarCheck, CompassTool } from "@phosphor-icons/react";
import { MagneticButton } from "@/components/MagneticButton";
import { skolaeMessaging } from "@/content/skolaeMessaging";

export function CTASection() {
  const { cta } = skolaeMessaging;

  return (
    <section id="cta" className="section-shell pt-12">
      <div className="section-inner">
        <div className="grid gap-6 rounded-[2.8rem] border border-ink/10 bg-ink px-6 py-8 text-limestone shadow-diffusion sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-oxide-soft">
              {cta.eyebrow}
            </p>
            <h2 className="mt-4 text-balance font-display text-4xl tracking-tight text-white sm:text-5xl">
              {cta.title}
              <span className="block text-oxide-soft">{cta.highlighted}</span>
            </h2>
            <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-limestone/76">
              {cta.subtitle}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MagneticButton href={cta.primaryHref} external>
                {cta.primaryLabel}
              </MagneticButton>
              <MagneticButton href={cta.secondaryHref} variant="secondary">
                {cta.secondaryLabel}
              </MagneticButton>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-limestone/48">{cta.note}</p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3">
              <CompassTool size={18} className="text-oxide-soft" weight="duotone" />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                {cta.agendaTitle}
              </p>
            </div>
            <ul className="mt-5 space-y-4">
              {cta.agendaItems.map((item) => (
                <li key={item} className="flex gap-3 border-b border-white/8 pb-4 last:border-b-0 last:pb-0">
                  <CalendarCheck size={18} className="mt-0.5 shrink-0 text-oxide-soft" weight="duotone" />
                  <span className="text-sm leading-relaxed text-limestone/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

