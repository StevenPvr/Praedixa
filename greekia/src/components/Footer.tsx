import { ArrowSquareOut } from "@phosphor-icons/react";
import { greekiaMessaging } from "@/content/greekiaMessaging";

export function Footer() {
  const { footer } = greekiaMessaging;

  return (
    <footer className="bg-ink px-4 pb-12 pt-10 text-limestone sm:px-6 lg:px-8">
      <div className="section-inner border-t border-white/10 pt-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <p className="max-w-[58ch] text-sm leading-relaxed text-limestone/66">
            {footer.note}
          </p>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
              Sources cles
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {footer.sources.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-[1.4rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-limestone/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-[1px] hover:text-white"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>{source.label}</span>
                    <ArrowSquareOut
                      size={16}
                      className="shrink-0 text-oxide-soft transition-colors duration-300 group-hover:text-white"
                    />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
