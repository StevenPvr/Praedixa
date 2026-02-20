"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
  tilt?: boolean;
  variant?: "light" | "dark";
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = "oklch(0.63 0.165 246 / 0.06)",
  tilt = false,
  variant = "light",
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [spotPos, setSpotPos] = useState({ x: 0.5, y: 0.5 });
  const [isHovered, setIsHovered] = useState(false);
  const [tiltStyle, setTiltStyle] = useState({});

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setSpotPos({ x, y });

      if (tilt) {
        const rotateX = (y - 0.5) * -6;
        const rotateY = (x - 0.5) * 6;
        setTiltStyle({
          transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        });
      }
    },
    [tilt],
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (tilt) {
      setTiltStyle({
        transform: "perspective(800px) rotateX(0deg) rotateY(0deg)",
      });
    }
  }, [tilt]);

  const baseClass =
    variant === "dark"
      ? "relative overflow-hidden rounded-xl border border-white/[0.06] bg-[oklch(0.20_0.022_247)] text-white"
      : "relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]";

  return (
    <div
      ref={cardRef}
      className={cn(baseClass, "transition-shadow duration-300", className)}
      style={{
        willChange: tilt ? "transform" : undefined,
        transition:
          "transform 600ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 300ms ease",
        ...tiltStyle,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(300px circle at ${spotPos.x * 100}% ${spotPos.y * 100}%, ${spotlightColor}, transparent 70%)`,
            maskImage:
              "linear-gradient(black, black) content-box, linear-gradient(black, black)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            padding: "1px",
          }}
        />
      )}
      {tilt && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.26 : 0.12,
            background:
              "linear-gradient(130deg, transparent 35%, oklch(0.95 0.01 255 / 0.22) 50%, transparent 65%)",
            transform: `translate3d(${(0.5 - spotPos.x) * 12}px, ${(0.5 - spotPos.y) * 12}px, 0)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
