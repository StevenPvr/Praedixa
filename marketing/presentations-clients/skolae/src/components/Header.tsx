import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Benefices", href: "#benefits" },
  { label: "Methode", href: "#method" },
  { label: "Pilote", href: "#pilot" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-500 ease-premium",
        scrolled
          ? "border-b border-ink/5 bg-chalk/88 shadow-[0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-[1340px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-semibold tracking-tight text-ink">
            Praedixa
          </span>
          <span className="text-sm font-light text-steel/50">&times;</span>
          <span className="text-[17px] font-semibold tracking-tight text-skolae">
            Skolae
          </span>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-steel transition-colors duration-300 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#cta"
            className="rounded-full bg-skolae px-4 py-2 text-[13px] font-medium text-white shadow-glow transition-all duration-300 hover:shadow-[0_16px_36px_-14px_rgba(77,101,255,0.55)]"
          >
            Demander l'audit
          </a>
        </nav>

        <a
          href="#cta"
          className="rounded-full bg-skolae px-3.5 py-1.5 text-[13px] font-medium text-white md:hidden"
        >
          Audit gratuit
        </a>
      </div>
    </header>
  );
}
