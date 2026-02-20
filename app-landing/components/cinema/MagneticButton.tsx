"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { cn } from "../../lib/utils";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  as?: "button" | "a";
  href?: string;
  onClick?: () => void;
}

export function MagneticButton({
  children,
  className,
  as: Tag = "button",
  href,
  onClick,
  ...rest
}: MagneticButtonProps & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ripple, setRipple] = useState<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const isMobile = useRef(false);

  useEffect(() => {
    isMobile.current = "ontouchstart" in window;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isMobile.current) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distX = e.clientX - centerX;
    const distY = e.clientY - centerY;
    const dist = Math.sqrt(distX * distX + distY * distY);
    const maxDist = 150;

    if (dist < maxDist) {
      const force = 1 - dist / maxDist;
      const nextX = distX * force * 0.08;
      const nextY = distY * force * 0.08;
      setOffset({
        x: Math.max(-8, Math.min(8, nextX)),
        y: Math.max(-8, Math.min(8, nextY)),
      });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        id: Date.now(),
      });
      setTimeout(() => setRipple(null), 500);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([10]);
      }
      onClick?.();
    },
    [onClick],
  );

  const props: Record<string, unknown> = {
    ref,
    className: cn("group relative overflow-hidden", className),
    style: {
      transform: `translate(${offset.x}px, ${offset.y}px)`,
      transition: "transform 300ms cubic-bezier(0.23, 1, 0.32, 1)",
    },
    onClick: handleClick,
    onMouseLeave: handleMouseLeave,
    ...rest,
  };

  if (Tag === "a") props.href = href;

  return (
    <Tag {...(props as Record<string, unknown>)}>
      {children}
      {ripple && (
        <span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            background: "oklch(0.63 0.165 246 / 0.25)",
            transform: "translate(-50%, -50%)",
            animation: "magnetic-ripple 500ms ease-out forwards",
          }}
        />
      )}
    </Tag>
  );
}
