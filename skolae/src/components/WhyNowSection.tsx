import { motion } from "framer-motion";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { SectionHeading } from "@/components/SectionHeading";
import { evidenceLabels, skolaeMessaging } from "@/content/skolaeMessaging";

export function WhyNowSection() {
  const { whyNow } = skolaeMessaging;

  return (
    <section id="why-now" className="section-shell">
      <div className="section-inner grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <SectionHeading
            eyebrow={whyNow.eyebrow}
            title={whyNow.title}
            highlighted={whyNow.highlighted}
            description={whyNow.description}
          />
        </div>

        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {whyNow.benefits.map((benefit, index) => (
              <motion.article
                key={benefit.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="rounded-[1.8rem] border border-ink/8 bg-ink p-5 text-limestone shadow-diffusion"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                  Bénéfice concret
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-limestone/78">
                  {benefit.description}
                </p>
              </motion.article>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
            className="rounded-[2rem] border border-ink/8 bg-white/65 p-6 shadow-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-sm"
          >
            <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
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
                className="rounded-[1.8rem] border border-ink/8 bg-limestone/78 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide">
                      {signal.label}
                    </p>
                    <p className="mt-2 max-w-[46ch] text-lg font-medium leading-relaxed text-ink">
                      {signal.value}
                    </p>
                  </div>
                  {signal.href ? (
                    <a
                      href={signal.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-ink/8 p-2 text-ink/64 transition-colors duration-300 hover:text-ink"
                    >
                      <ArrowSquareOut size={16} weight="bold" />
                    </a>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{signal.qualifier}</p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
