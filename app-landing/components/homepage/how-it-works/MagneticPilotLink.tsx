"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";

interface MagneticPilotLinkProps {
  href: string;
  label: string;
  meta: string;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

export function MagneticPilotLink({ href, label, meta }: MagneticPilotLinkProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const smoothX = useSpring(x, SPRING);
  const smoothY = useSpring(y, SPRING);

  const rotateX = useTransform(smoothY, [-12, 12], [3, -3]);
  const rotateY = useTransform(smoothX, [-12, 12], [-3, 3]);

  function onPointerMove(event: MouseEvent<HTMLAnchorElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);

    x.set(Math.max(-12, Math.min(12, offsetX * 0.12)));
    y.set(Math.max(-12, Math.min(12, offsetY * 0.12)));
  }

  function onPointerLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      style={{
        x: smoothX,
        y: smoothY,
        rotateX,
        rotateY,
        transformPerspective: 900,
      }}
    >
      <Link
        href={href}
        onMouseMove={onPointerMove}
        onMouseLeave={onPointerLeave}
        className="btn-primary-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white no-underline transition-all duration-150 active:scale-[0.98] active:-translate-y-[1px]"
      >
        {label}
        <ArrowRight size={16} weight="bold" />
      </Link>
      <p className="mt-2 text-xs text-neutral-200">{meta}</p>
    </motion.div>
  );
}
