import { motion } from "framer-motion";
import { Gauge, ListChecks, TrendUp } from "@phosphor-icons/react";
import { SectionHeading } from "@/components/SectionHeading";
import { greekiaMessaging } from "@/content/greekiaMessaging";

export function LoopSection() {
  const { loop } = greekiaMessaging;

  return (
    <section id="loop" className="section-shell bg-ink text-limestone">
      <div className="section-inner">
        <SectionHeading
          eyebrow={loop.eyebrow}
          title={loop.title}
          description={loop.description}
          tone="dark"
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-[2.1rem] border border-white/10 bg-white/8 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <div className="flex items-center gap-3">
              <Gauge size={22} className="text-oxide-soft" weight="duotone" />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide">
                Pourquoi ca fonctionne
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-limestone/74">
              La plateforme n'a pas besoin d'en faire plus au depart. Elle doit
              simplement relier le bon signal, le bon arbitrage et la bonne
              preuve de maniere assez claire pour etre lisible en revue reseau.
            </p>
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/8 p-4">
              <div className="flex items-center gap-3">
                <ListChecks
                  size={18}
                  className="text-oxide-soft"
                  weight="duotone"
                />
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-limestone/56">
                  Ce que Greekia obtient
                </p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-limestone/78">
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
                className="grid gap-4 rounded-[1.85rem] border border-white/10 bg-white/8 p-5 sm:grid-cols-[90px_1fr]"
              >
                <div className="flex h-fit items-center gap-3 sm:block">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                    etape
                  </span>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {step.number}
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-limestone/74">
                    {step.text}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-[1.8rem] border border-white/10 bg-white/8 px-5 py-4 text-limestone">
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
