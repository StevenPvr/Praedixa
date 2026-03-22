import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PraedixaLogo } from "./PraedixaLogo";

const navLinks = [
  { label: "Douleurs", href: "#why-now" },
  { label: "Boucle", href: "#loop" },
  { label: "Offre", href: "#pilot" },
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
          ? "border-b border-white/12 bg-ink/88 shadow-[0_18px_40px_-28px_rgba(3,8,41,0.75)] backdrop-blur-xl"
          : "border-b border-white/10 bg-ink/72 backdrop-blur-lg",
      )}
    >
      <div className="mx-auto flex max-w-[1340px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2.5 text-limestone">
            <PraedixaLogo
              size={22}
              color="currentColor"
              className="shrink-0 text-limestone"
            />
            <span className="text-[17px] font-semibold tracking-tight text-limestone">
              Praedixa
            </span>
          </span>
          <span className="text-sm font-light text-limestone/45">&times;</span>
          <span className="font-display text-[22px] uppercase tracking-[0.16em] text-oxide-soft">
            Greekia
          </span>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-white/78 transition-colors duration-300 hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#cta"
            className="rounded-full border border-oxide bg-oxide px-4 py-2 text-[13px] font-semibold text-ink transition-all duration-300 hover:-translate-y-px hover:bg-oxide-soft"
          >
            Voir la preuve
          </a>
        </nav>

        <a
          href="#cta"
          className="rounded-full border border-oxide bg-oxide px-3.5 py-1.5 text-[13px] font-semibold text-ink md:hidden"
        >
          La preuve
        </a>
      </div>
    </header>
  );
}
