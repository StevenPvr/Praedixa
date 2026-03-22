import { motion } from "framer-motion";
import { Sparkle } from "@phosphor-icons/react";
import { skolaeMessaging } from "@/content/skolaeMessaging";

export function BenefitsSection() {
  const { whyNow } = skolaeMessaging;
  const coreBenefits = whyNow.benefits.slice(0, 7);
  const extensionBenefit = whyNow.benefits[7];

  return (
    <section id="benefits" className="section-shell bg-sand/40">
      <div className="section-inner">
        <div className="max-w-3xl">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-skolae">
            Ce que Praedixa peut aider a mieux piloter
          </p>
          <h2 className="text-balance font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Des gains concrets,
            <span className="block text-skolae">
              sur les vrais points de tension.
            </span>
          </h2>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {coreBenefits.map((benefit, index) => (
            <motion.article
              key={benefit.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              className="group rounded-[1.75rem] border border-ink/5 bg-white/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-sm transition-all duration-300 hover:shadow-panel"
            >
              <h3 className="text-lg font-semibold tracking-tight text-ink">
                {benefit.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-steel">
                {benefit.description}
              </p>
            </motion.article>
          ))}
        </div>

        {extensionBenefit ? (
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="mt-5 rounded-[2rem] border border-ink/5 bg-ink p-7 text-chalk shadow-diffusion"
          >
            <div className="flex items-start gap-3">
              <Sparkle
                size={20}
                className="mt-0.5 shrink-0 text-skolae-soft"
                weight="fill"
              />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-skolae-soft">
                  Extension de valeur premium
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                  {extensionBenefit.title}
                </h3>
                <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-chalk/72">
                  {extensionBenefit.description}
                </p>
              </div>
            </div>
          </motion.article>
        ) : null}
      </div>
    </section>
  );
}
