"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  type SpringOptions,
} from "framer-motion";
import { cn } from "../../lib/utils";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  as?: "button" | "a";
  href?: string;
  onClick?: () => void;
}

const springConfig: SpringOptions = {
  stiffness: 100,
  damping: 20,
  mass: 0.6,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function MagneticButton({
  children,
  className,
  as = "button",
  href,
  onClick,
  ...rest
}: MagneticButtonProps & Record<string, unknown>) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const isTouchDevice = useRef(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const [ripple, setRipple] = useState<{
    id: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    isTouchDevice.current =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const resetPosition = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      if (isTouchDevice.current) return;
      const element = ref.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = event.clientX - centerX;
      const distY = event.clientY - centerY;
      const influence = 0.14;

      x.set(clamp(distX * influence, -8, 8));
      y.set(clamp(distY * influence, -8, 8));
    },
    [x, y],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      const element = ref.current;
      if (!element) {
        onClick?.();
        return;
      }

      const rect = element.getBoundingClientRect();
      setRipple({
        id: Date.now(),
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      window.setTimeout(() => setRipple(null), 480);
      onClick?.();
    },
    [onClick],
  );

  if (as === "a") {
    return (
      <motion.a
        {...(rest as Record<string, unknown>)}
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={cn("group relative overflow-hidden", className)}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPosition}
        onBlur={resetPosition}
        onClick={handleClick}
        whileTap={{ y: 1, scale: 0.98 }}
        style={{ x: springX, y: springY }}
      >
        {children}
        {ripple && (
          <span
            key={ripple.id}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 2,
              height: 2,
              transform: "translate(-50%, -50%)",
              background: "oklch(0.98 0.002 250 / 0.65)",
              animation: "magnetic-ripple 480ms ease-out forwards",
            }}
          />
        )}
      </motion.a>
    );
  }

  return (
    <motion.button
      {...(rest as Record<string, unknown>)}
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      className={cn("group relative overflow-hidden", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPosition}
      onBlur={resetPosition}
      onClick={handleClick}
      whileTap={{ y: 1, scale: 0.98 }}
      style={{ x: springX, y: springY }}
    >
      {children}
      {ripple && (
        <span
          key={ripple.id}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 2,
            height: 2,
            transform: "translate(-50%, -50%)",
            background: "oklch(0.98 0.002 250 / 0.65)",
            animation: "magnetic-ripple 480ms ease-out forwards",
          }}
        />
      )}
    </motion.button>
  );
}
