"use client";

import { useCallback, useRef, useState } from "react";
import { useSpring, type SpringOptions } from "framer-motion";

interface MouseTiltOptions {
  /** Max rotation in degrees (default: 15) */
  maxRotation?: number;
  /** Spring config for smooth animation */
  springConfig?: SpringOptions;
  /** Whether the effect is disabled */
  disabled?: boolean;
}

interface MouseTiltResult {
  /** Ref to attach to the container element */
  ref: React.RefCallback<HTMLElement>;
  /** Animated rotateX value (pitch - up/down) */
  rotateX: ReturnType<typeof useSpring>;
  /** Animated rotateY value (yaw - left/right) */
  rotateY: ReturnType<typeof useSpring>;
  /** Whether mouse is currently over the element */
  isHovering: boolean;
}

/**
 * Hook for 3D mouse tilt effect on elements
 * Creates a subtle parallax-like tilt when hovering
 *
 * Usage:
 * ```tsx
 * const { ref, rotateX, rotateY } = useMouseTilt({ maxRotation: 10 });
 *
 * <motion.div
 *   ref={ref}
 *   style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
 * >
 *   Content
 * </motion.div>
 * ```
 */
export function useMouseTilt({
  maxRotation = 15,
  springConfig = { stiffness: 150, damping: 20, mass: 0.5 },
  disabled = false,
}: MouseTiltOptions = {}): MouseTiltResult {
  const elementRef = useRef<HTMLElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Spring-animated rotation values
  const rotateX = useSpring(0, springConfig);
  const rotateY = useSpring(0, springConfig);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (disabled || !elementRef.current) return;

      const rect = elementRef.current.getBoundingClientRect();

      // Calculate mouse position relative to element center (-1 to 1)
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Normalize to -1 to 1 range
      const normalizedX = (event.clientX - centerX) / (rect.width / 2);
      const normalizedY = (event.clientY - centerY) / (rect.height / 2);

      // Clamp values to prevent extreme rotations
      const clampedX = Math.max(-1, Math.min(1, normalizedX));
      const clampedY = Math.max(-1, Math.min(1, normalizedY));

      // Apply rotation (inverted for natural feel)
      // Moving mouse up -> rotateX negative (tilt back)
      // Moving mouse right -> rotateY positive (tilt right)
      rotateX.set(-clampedY * maxRotation);
      rotateY.set(clampedX * maxRotation);
    },
    [disabled, maxRotation, rotateX, rotateY],
  );

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    setIsHovering(true);
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    if (disabled) return;
    setIsHovering(false);
    // Reset to neutral position
    rotateX.set(0);
    rotateY.set(0);
  }, [disabled, rotateX, rotateY]);

  // Ref callback to attach event listeners
  const ref = useCallback(
    (element: HTMLElement | null) => {
      // Cleanup previous element
      if (elementRef.current) {
        elementRef.current.removeEventListener("mousemove", handleMouseMove);
        elementRef.current.removeEventListener("mouseenter", handleMouseEnter);
        elementRef.current.removeEventListener("mouseleave", handleMouseLeave);
      }

      elementRef.current = element;

      // Attach to new element
      if (element && !disabled) {
        element.addEventListener("mousemove", handleMouseMove);
        element.addEventListener("mouseenter", handleMouseEnter);
        element.addEventListener("mouseleave", handleMouseLeave);
      }
    },
    [disabled, handleMouseMove, handleMouseEnter, handleMouseLeave],
  );

  return {
    ref,
    rotateX,
    rotateY,
    isHovering,
  };
}
