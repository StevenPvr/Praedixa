import type { ReactNode } from "react";
import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  external?: boolean;
}

export function MagneticButton({
  href,
  children,
  variant = "primary",
  className,
  external = false,
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 180, damping: 18, mass: 0.5 });
  const y = useSpring(rawY, { stiffness: 180, damping: 18, mass: 0.5 });

  const handlePointerMove = (event: React.PointerEvent<HTMLAnchorElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;

    rawX.set((dx / rect.width) * 16);
    rawY.set((dy / rect.height) * 12);
  };

  const handlePointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x, y }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      whileTap={{ scale: 0.98, y: 1 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition-all duration-300 ease-premium",
        "active:-translate-y-[1px]",
        variant === "primary" &&
          "border-oxide bg-oxide text-white shadow-diffusion shadow-[0_14px_32px_-18px_rgba(58,137,141,0.55)]",
        variant === "secondary" &&
          "border-ink/12 bg-white/65 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.66)] backdrop-blur-sm",
        className,
      )}
      rel={external ? "noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      <span>{children}</span>
      <ArrowRight size={16} weight="bold" />
    </motion.a>
  );
}

