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

export function ScopeSection() {
  const { decisionFocus } = skolaeMessaging;

  return (
    <section id="scope" className="section-shell bg-sand/40">
      <div className="section-inner">
        <SectionHeading
          eyebrow={decisionFocus.eyebrow}
          title={decisionFocus.title}
          highlighted={decisionFocus.highlighted}
          description={decisionFocus.body}
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="rounded-[2.5rem] border border-ink/5 bg-ink px-6 py-7 text-chalk shadow-diffusion sm:px-8"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-skolae-soft">
              La question cle
            </p>
            <h3 className="mt-3 max-w-[22ch] text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {decisionFocus.statement}
            </h3>

            <div className="mt-8 grid gap-3.5">
              {decisionFocus.frame.map((item, index) => {
                const Icon = frameIcons[index];
                return (
                  <div
                    key={item.label}
                    className="rounded-[1.75rem] border border-white/8 bg-white/5 p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-skolae-soft">
                        {item.label}
                      </p>
                      <Icon
                        size={18}
                        className="text-skolae-soft"
                        weight="duotone"
                      />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-chalk/75">
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.article>

          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="rounded-[2rem] border border-ink/5 bg-white/65 p-6 shadow-panel backdrop-blur-sm"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-skolae">
              Actions que Skolae peut comparer
            </p>
            <ul className="mt-5 space-y-4">
              {decisionFocus.primaryLevers.map((lever) => (
                <li
                  key={lever}
                  className="flex gap-3 border-b border-ink/6 pb-4 text-sm leading-relaxed text-ink/75 last:border-b-0 last:pb-0"
                >
                  <CalendarDots
                    size={18}
                    className="mt-0.5 shrink-0 text-skolae"
                    weight="duotone"
                  />
                  <span>{lever}</span>
                </li>
              ))}
            </ul>
          </motion.aside>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {decisionFocus.extensions.map((extension, index) => (
            <motion.article
              key={extension.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              className="rounded-[1.75rem] border border-ink/5 bg-white/65 p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-panel"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-skolae">
                {extension.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                <span className="font-medium">Risque vu plus tot:</span>{" "}
                {extension.forecast}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-steel">
                <span className="font-medium text-ink">
                  Action priorisee:
                </span>{" "}
                {extension.optimize}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
