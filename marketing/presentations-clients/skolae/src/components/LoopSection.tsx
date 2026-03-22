import { motion } from "framer-motion";
import { Gauge, ListChecks, TrendUp } from "@phosphor-icons/react";
import { SectionHeading } from "@/components/SectionHeading";
import { skolaeMessaging } from "@/content/skolaeMessaging";

export function LoopSection() {
  const { loop } = skolaeMessaging;

  return (
    <section id="loop" className="section-shell">
      <div className="section-inner">
        <SectionHeading
          eyebrow={loop.eyebrow}
          title={loop.title}
          description={loop.description}
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-[2.1rem] border border-ink/10 bg-white/62 p-6 shadow-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
          >
            <div className="flex items-center gap-3">
              <Gauge size={22} className="text-oxide" weight="duotone" />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide">
                Pourquoi ça fonctionne
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              La plateforme n'a pas besoin d'en faire plus au départ. Elle doit
              simplement relier le bon signal, le bon arbitrage et la bonne
              preuve de manière assez claire pour être lisible en comité
              mensuel.
            </p>
            <div className="mt-6 rounded-[1.6rem] border border-ink/8 bg-limestone/75 p-4">
              <div className="flex items-center gap-3">
                <ListChecks size={18} className="text-oxide" weight="duotone" />
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Ce que Skolae obtient
                </p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink/76">
                Un dispositif léger, des options déjà comparées, une action
                validée humainement et une preuve relue en comité.
              </p>
            </div>
          </motion.aside>

          <div className="grid gap-4">
            {loop.steps.map((step, index) => (
              <motion.article
                key={step.number}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="grid gap-4 rounded-[1.85rem] border border-ink/8 bg-limestone/74 p-5 sm:grid-cols-[90px_1fr]"
              >
                <div className="flex h-fit items-center gap-3 sm:block">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-oxide">
                    étape
                  </span>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                    {step.number}
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-[1.8rem] border border-ink/8 bg-ink px-5 py-4 text-limestone shadow-diffusion">
          <TrendUp
            size={18}
            className="shrink-0 text-oxide-soft"
            weight="duotone"
          />
          <p className="text-sm leading-relaxed text-limestone/84">
            {loop.footer}
          </p>
        </div>
      </div>
    </section>
  );
}
