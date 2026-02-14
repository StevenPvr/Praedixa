"use client";

import { useEffect, useRef, useState } from "react";

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}

const DEFAULT_MARGIN: Margin = { top: 12, right: 16, bottom: 32, left: 48 };

export function useChartDimensions(
  margin: Margin = DEFAULT_MARGIN,
): [React.RefObject<HTMLDivElement | null>, ChartDimensions] {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<ChartDimensions>({
    width: 0,
    height: 0,
    innerWidth: 0,
    innerHeight: 0,
    margin,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions({
        width,
        height,
        innerWidth: Math.max(0, width - margin.left - margin.right),
        innerHeight: Math.max(0, height - margin.top - margin.bottom),
        margin,
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [margin.top, margin.right, margin.bottom, margin.left]);

  return [ref, dimensions];
}
