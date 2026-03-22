import { motion } from "framer-motion";
import { Gauge, ListChecks, TrendUp } from "@phosphor-icons/react";
import { SectionHeading } from "@/components/SectionHeading";
import { skolaeMessaging } from "@/content/skolaeMessaging";

export function MethodSection() {
  const { loop } = skolaeMessaging;

  return (
    <section id="method" className="section-shell">
      <div className="section-inner">
        <SectionHeading
          eyebrow={loop.eyebrow}
          title={loop.title}
          description={loop.description}
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.65fr_1.35fr]">
          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-[2rem] border border-ink/5 bg-white/60 p-6 shadow-panel backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <Gauge size={20} className="text-skolae" weight="duotone" />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-skolae">
                Pourquoi ca fonctionne
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-steel">
              La plateforme n'a pas besoin d'en faire plus au depart. Elle doit
              simplement relier le bon signal, le bon arbitrage et la bonne
              preuve de maniere assez claire pour etre lisible en comite
              mensuel.
            </p>
            <div className="mt-6 rounded-[1.5rem] border border-ink/5 bg-chalk/80 p-4">
              <div className="flex items-center gap-3">
                <ListChecks
                  size={16}
                  className="text-skolae"
                  weight="duotone"
                />
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Ce que Skolae obtient
                </p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-steel">
                Un dispositif leger, des options deja comparees, une action
                validee humainement et une preuve relue en comite.
              </p>
            </div>
          </motion.aside>

          <div className="grid gap-3.5">
            {loop.steps.map((step, index) => (
              <motion.article
                key={step.number}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="grid gap-4 rounded-[1.75rem] border border-ink/5 bg-chalk/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:grid-cols-[80px_1fr]"
              >
                <div className="flex h-fit items-center gap-3 sm:block">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-skolae">
                    etape
                  </span>
                  <p className="mt-1 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                    {step.number}
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-steel">
                    {step.text}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-[1.75rem] border border-ink/5 bg-ink px-5 py-4 text-chalk shadow-diffusion">
          <TrendUp
            size={18}
            className="shrink-0 text-skolae-soft"
            weight="duotone"
          />
          <p className="text-sm leading-relaxed text-chalk/80">{loop.footer}</p>
        </div>
      </div>
    </section>
  );
}
