import { ArrowSquareOut } from "@phosphor-icons/react";
import { skolaeMessaging } from "@/content/skolaeMessaging";

export function Footer() {
  const { footer } = skolaeMessaging;

  return (
    <footer className="px-4 pb-12 pt-10 sm:px-6 lg:px-8">
      <div className="section-inner border-t border-ink/8 pt-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <p className="max-w-[58ch] text-sm leading-relaxed text-muted-foreground">{footer.note}</p>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide">Sources clés</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {footer.sources.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-[1.4rem] border border-ink/8 bg-white/62 px-4 py-3 text-sm text-ink/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-300 hover:-translate-y-[1px] hover:text-ink"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>{source.label}</span>
                    <ArrowSquareOut size={16} className="shrink-0 text-oxide transition-colors duration-300 group-hover:text-ink" />
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

