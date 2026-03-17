"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "../../../lib/utils";
import { ButtonPrimary } from "./ButtonPrimary";

/* ------------------------------------------------------------------ */
/*  Fixed bottom CTA bar, visible only on mobile after the user       */
/*  scrolls past the hero section (~100vh).                           */
/* ------------------------------------------------------------------ */

interface StickyCTAMobileProps {
  href: string;
  label: string;
}

export function StickyCTAMobile({ href, label }: StickyCTAMobileProps) {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const threshold = window.innerHeight;

    const onScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    // Check immediately in case the page is already scrolled.
    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 lg:hidden",
        "bg-ink-950 rounded-t-card shadow-3",
        "px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        "transition-transform",
        reducedMotion ? "duration-0" : "duration-300 ease-out-expo",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <ButtonPrimary href={href} label={label} className="w-full" />
    </div>
  );
}
