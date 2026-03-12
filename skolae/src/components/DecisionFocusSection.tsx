import { motion } from "framer-motion";
import {
  ArrowsClockwise,
  CalendarDots,
  Lightning,
  ShieldCheck,
} from "@phosphor-icons/react";
import { SectionHeading } from "@/components/SectionHeading";
import { skolaeMessaging } from "@/content/skolaeMessaging";

const frameIcons = [Lightning, ArrowsClockwise, ShieldCheck] as const;

export function DecisionFocusSection() {
  const { decisionFocus } = skolaeMessaging;

  return (
    <section id="decision-focus" className="section-shell">
      <div className="section-inner space-y-10">
        <SectionHeading
          eyebrow={decisionFocus.eyebrow}
          title={decisionFocus.title}
          highlighted={decisionFocus.highlighted}
          description={decisionFocus.body}
        />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-[2.6rem] border border-ink/10 bg-ink px-6 py-7 text-limestone shadow-diffusion sm:px-8"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
              La question clé
            </p>
            <h3 className="mt-3 max-w-[20ch] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {decisionFocus.statement}
            </h3>

            <div className="mt-8 grid gap-4">
              {decisionFocus.frame.map((item, index) => {
                const Icon = frameIcons[index];
                return (
                  <div
                    key={item.label}
                    className="rounded-[1.8rem] border border-white/10 bg-white/6 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                        {item.label}
                      </p>
                      <Icon size={18} className="text-oxide-soft" weight="duotone" />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-limestone/80">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </motion.article>

          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="rounded-[2.1rem] border border-ink/8 bg-white/68 p-6 shadow-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] backdrop-blur-sm"
          >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide">
              Actions que Skolae peut comparer
              </p>
            <ul className="mt-5 space-y-4">
              {decisionFocus.primaryLevers.map((lever) => (
                <li
                  key={lever}
                  className="flex gap-3 border-b border-ink/8 pb-4 text-sm leading-relaxed text-ink/78 last:border-b-0 last:pb-0"
                >
                  <CalendarDots size={18} className="mt-0.5 shrink-0 text-oxide" weight="duotone" />
                  <span>{lever}</span>
                </li>
              ))}
            </ul>
          </motion.aside>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {decisionFocus.extensions.map((extension, index) => (
            <motion.article
              key={extension.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              className="rounded-[1.9rem] border border-ink/8 bg-limestone/72 p-5"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide">
                {extension.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                <span className="font-medium">Risque vu plus tôt:</span> {extension.forecast}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-ink">Action priorisée:</span> {extension.optimize}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
