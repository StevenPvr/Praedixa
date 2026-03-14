"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";

interface MagneticPilotLinkProps {
  href: string;
  label: string;
  meta: string;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

export function MagneticPilotLink({
  href,
  label,
  meta,
}: MagneticPilotLinkProps) {
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const smoothX = useSpring(x, SPRING);
  const smoothY = useSpring(y, SPRING);

  const rotateX = useTransform(smoothY, [-12, 12], [3, -3]);
  const rotateY = useTransform(smoothX, [-12, 12], [-3, 3]);

  function onPointerMove(event: MouseEvent<HTMLAnchorElement>) {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);

    x.set(Math.max(-12, Math.min(12, offsetX * 0.12)));
    y.set(Math.max(-12, Math.min(12, offsetY * 0.12)));
  }

  function onPointerLeave() {
    if (reducedMotion) return;
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      className="will-change-transform"
      style={
        reducedMotion
          ? undefined
          : {
              x: smoothX,
              y: smoothY,
              rotateX,
              rotateY,
              transformPerspective: 900,
            }
      }
    >
      <Link
        href={href}
        onMouseMove={onPointerMove}
        onMouseLeave={onPointerLeave}
        className="group btn-primary-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white no-underline shadow-[0_24px_48px_-38px_rgba(2,6,23,0.88)] transition-all duration-300 [transition-timing-function:var(--ease-snappy)] hover:shadow-[0_32px_66px_-48px_rgba(2,6,23,0.9)] active:-translate-y-[1px] active:scale-[0.98]"
      >
        {label}
        <span
          aria-hidden="true"
          className="transition-transform duration-200 [transition-timing-function:var(--ease-snappy)] group-hover:translate-x-0.5"
        >
          <ArrowRight size={16} weight="bold" />
        </span>
      </Link>
      <p className="mt-2 text-xs text-[rgba(255,255,255,0.82)]">{meta}</p>
    </motion.div>
  );
}
