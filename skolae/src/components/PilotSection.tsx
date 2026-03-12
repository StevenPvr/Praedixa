import { motion } from "framer-motion";
import { Files, Gauge, SealCheck } from "@phosphor-icons/react";
import { SectionHeading } from "@/components/SectionHeading";
import { skolaeMessaging } from "@/content/skolaeMessaging";

export function PilotSection() {
  const { pilot } = skolaeMessaging;

  return (
    <section id="pilot" className="section-shell">
      <div className="section-inner">
        <SectionHeading
          eyebrow={pilot.eyebrow}
          title={pilot.title}
          description={pilot.subtitle}
        />

        <div className="mt-8 flex flex-wrap gap-2.5">
          {pilot.scope.map((item) => (
            <span
              key={item}
              className="rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/72"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4">
            {pilot.timeline.map((step, index) => (
              <motion.article
                key={step.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="rounded-[1.9rem] border border-ink/8 bg-limestone/75 p-5"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide">{step.label}</p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </motion.article>
            ))}
          </div>

          <div className="grid gap-4">
            <motion.article
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5 }}
              className="rounded-[2rem] border border-ink/8 bg-white/68 p-6 shadow-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]"
            >
              <div className="flex items-center gap-3">
                <Files size={18} className="text-oxide" weight="duotone" />
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide">
                  Données minimales
                </p>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {pilot.dataInputs.map((item) => (
                  <li key={item} className="border-b border-ink/8 pb-3 last:border-b-0 last:pb-0">
                    {item}
                  </li>
                ))}
              </ul>
            </motion.article>

            <div className="grid gap-4 md:grid-cols-2">
              <motion.article
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="rounded-[2rem] border border-ink/8 bg-limestone/74 p-6"
              >
                <div className="flex items-center gap-3">
                  <Gauge size={18} className="text-oxide" weight="duotone" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide">
                    Bénéfices mesurés
                  </p>
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {pilot.kpis.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </motion.article>

              <motion.article
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="rounded-[2rem] border border-ink/8 bg-limestone/74 p-6"
              >
                <div className="flex items-center gap-3">
                  <SealCheck size={18} className="text-oxide" weight="duotone" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide">
                    Gouvernance
                  </p>
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {pilot.governance.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </motion.article>
            </div>

            <motion.article
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="rounded-[2rem] border border-ink/8 bg-ink p-6 text-limestone shadow-diffusion"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                Livrables de sortie
              </p>
              <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-limestone/80">
                {pilot.deliverables.map((item) => (
                  <li key={item} className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
                    {item}
                  </li>
                ))}
              </ul>
            </motion.article>
          </div>
        </div>
      </div>
    </section>
  );
}
