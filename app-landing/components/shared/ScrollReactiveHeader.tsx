"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";
import { resolveHeaderScrollState } from "./header-scroll-state";

interface ScrollReactiveHeaderProps {
  children: React.ReactNode;
}

function getHeaderAnimation(hidden: boolean, reducedMotion: boolean | null) {
  if (reducedMotion) {
    return {
      y: hidden ? -20 : 0,
      opacity: hidden ? 0 : 1,
    };
  }

  return {
    y: hidden ? "-108%" : "0%",
    opacity: hidden ? 0 : 1,
    scale: hidden ? 0.985 : 1,
  };
}

function getHeaderTransition(reducedMotion: boolean | null) {
  if (reducedMotion) {
    return { duration: 0.16 };
  }

  return {
    y: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
    opacity: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
    scale: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
  };
}

function useHeaderScrollState() {
  const [hidden, setHidden] = useState(false);
  const [elevated, setElevated] = useState(false);
  const previousYRef = useRef(0);
  const hiddenRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    hiddenRef.current = hidden;
  }, [hidden]);

  useEffect(() => {
    const update = () => {
      frameRef.current = null;

      const currentY = window.scrollY;
      const nextState = resolveHeaderScrollState({
        currentY,
        previousY: previousYRef.current,
        hidden: hiddenRef.current,
      });

      previousYRef.current = currentY;
      hiddenRef.current = nextState.hidden;
      setHidden(nextState.hidden);
      setElevated(nextState.elevated);
    };

    previousYRef.current = window.scrollY;
    update();

    const onScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return { elevated, hidden };
}

export function ScrollReactiveHeader({ children }: ScrollReactiveHeaderProps) {
  const reducedMotion = useReducedMotion();
  const { elevated, hidden } = useHeaderScrollState();

  return (
    <motion.header
      data-scroll-state={hidden ? "hidden" : "visible"}
      data-scroll-surface={elevated ? "elevated" : "top"}
      className={cn(
        "sticky top-0 z-30 transition-[border-color,background-color,box-shadow] duration-300 [transition-timing-function:var(--ease-snappy)]",
        hidden ? "pointer-events-none" : "pointer-events-auto",
        elevated
          ? "border-b border-white/10 bg-white/30 shadow-[0_20px_44px_-28px_rgba(15,23,42,0.18)] backdrop-blur-xl"
          : "bg-transparent",
      )}
      animate={getHeaderAnimation(hidden, reducedMotion)}
      transition={getHeaderTransition(reducedMotion)}
    >
      {children}
    </motion.header>
  );
}
