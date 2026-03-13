import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChartLineUp,
  Database,
  Handshake,
  ShieldCheck,
} from "@phosphor-icons/react";
import { SectionHeading } from "@/components/SectionHeading";
import { skolaeMessaging } from "@/content/skolaeMessaging";

const icons = {
  marie: Handshake,
  ops: ShieldCheck,
  finance: ChartLineUp,
  dsi: Database,
} as const;

export function StakeholderSection() {
  const { stakeholders } = skolaeMessaging;
  const [activeId, setActiveId] =
    useState<(typeof stakeholders.views)[number]["id"]>("ops");

  const activeView = useMemo(
    () =>
      stakeholders.views.find((view) => view.id === activeId) ??
      stakeholders.views[0],
    [activeId, stakeholders.views],
  );

  const ActiveIcon = icons[activeView.id];

  return (
    <section id="stakeholders" className="section-shell">
      <div className="section-inner">
        <SectionHeading
          eyebrow={stakeholders.eyebrow}
          title={stakeholders.title}
          description={stakeholders.description}
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
          <div className="rounded-[2.2rem] border border-ink/8 bg-white/68 p-3 shadow-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-sm">
            <div className="grid gap-2">
              {stakeholders.views.map((view) => {
                const Icon = icons[view.id];
                const isActive = view.id === activeId;

                return (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => setActiveId(view.id)}
                    className="relative overflow-hidden rounded-[1.5rem] px-4 py-4 text-left"
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="stakeholder-highlight"
                        className="absolute inset-0 rounded-[1.5rem] border border-ink/10 bg-limestone"
                        transition={{
                          type: "spring",
                          stiffness: 100,
                          damping: 20,
                        }}
                      />
                    ) : null}
                    <span className="relative flex items-center gap-3">
                      <span className="rounded-full border border-ink/8 bg-white/70 p-2">
                        <Icon
                          size={18}
                          className={isActive ? "text-oxide" : "text-ink/60"}
                          weight="duotone"
                        />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-ink">
                          {view.label}
                        </span>
                        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                          {view.title}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2.4rem] border border-ink/10 bg-ink p-6 text-limestone shadow-diffusion sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28 }}
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/6 p-2">
                    <ActiveIcon
                      size={18}
                      className="text-oxide-soft"
                      weight="duotone"
                    />
                  </span>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                    Lecture {activeView.label}
                  </p>
                </div>

                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {activeView.title}
                </h3>
                <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-limestone/78">
                  {activeView.summary}
                </p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                      Ce qui doit résonner
                    </p>
                    <ul className="mt-4 space-y-3 text-sm leading-relaxed text-limestone/80">
                      {activeView.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="border-b border-white/8 pb-3 last:border-b-0 last:pb-0"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid gap-4">
                    <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                        Objection probable
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-limestone/80">
                        {activeView.objection}
                      </p>
                    </div>
                    <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                        Réponse à tenir
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-limestone/80">
                        {activeView.response}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                      Preuve attendue
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-limestone/80">
                      {activeView.proofMetric}
                    </p>
                  </div>
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                      Prochain pas
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-limestone/80">
                      {activeView.nextStep}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
