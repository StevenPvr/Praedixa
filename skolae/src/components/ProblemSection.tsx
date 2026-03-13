import { motion } from "framer-motion";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { SectionHeading } from "@/components/SectionHeading";
import { evidenceLabels, skolaeMessaging } from "@/content/skolaeMessaging";

export function ProblemSection() {
  const { whyNow } = skolaeMessaging;

  return (
    <section id="problem" className="section-shell">
      <div className="section-inner">
        <SectionHeading
          eyebrow={whyNow.eyebrow}
          title={whyNow.title}
          highlighted={whyNow.highlighted}
          description={whyNow.description}
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="rounded-[2rem] border border-ink/5 bg-white/60 p-7 shadow-panel backdrop-blur-sm"
          >
            <div className="space-y-5 text-base leading-relaxed text-steel">
              {whyNow.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </motion.div>

          <div className="grid gap-4">
            {whyNow.signals.map((signal, index) => (
              <motion.article
                key={signal.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-[1.75rem] border border-ink/5 bg-chalk/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-skolae">
                      {signal.label}
                    </p>
                    <p className="mt-2.5 max-w-[42ch] text-lg font-medium leading-snug text-ink">
                      {signal.value}
                    </p>
                  </div>
                  {signal.href ? (
                    <a
                      href={signal.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-ink/6 p-2 text-ink/45 transition-colors duration-300 hover:text-ink"
                    >
                      <ArrowSquareOut size={16} weight="bold" />
                    </a>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {signal.qualifier}
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {evidenceLabels[signal.evidence]}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
