"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import * as d3 from "d3";
import { useChartDimensions, type Margin } from "./use-chart-dimensions";
import { CHART_GRADIENT, CHART_A11Y, getSeriesColor } from "./chart-theme";

/* ─── Types ─── */

export interface D3AreaChartProps {
  data: Record<string, string | number>[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (v: number) => string;
  showLegend?: boolean;
  showGridLines?: boolean;
  curveType?: "monotone" | "natural" | "linear";
  className?: string;
  margin?: Margin;
  ariaLabel?: string;
}

const CURVE_MAP = {
  natural: d3.curveNatural,
  monotone: d3.curveMonotoneX,
  linear: d3.curveLinear,
};

/* ─── Component ─── */

export const D3AreaChart = memo(function D3AreaChart({
  data,
  index,
  categories,
  colors,
  valueFormatter = (v) => v.toFixed(0),
  showLegend = false,
  showGridLines = false,
  curveType = "monotone",
  className,
  margin: marginProp,
  ariaLabel = "Area chart",
}: D3AreaChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const defaultMargin: Margin = { top: 8, right: 8, bottom: 24, left: 36 };
  const margin = marginProp ?? defaultMargin;
  const [containerRef, dims] = useChartDimensions(margin);

  const resolvedColors = categories.map(
    (_, i) => colors?.[i] ?? getSeriesColor(i),
  );

  const draw = useCallback(() => {
    const svg = d3.select(svgRef.current);
    const { innerWidth, innerHeight } = dims;
    if (!svgRef.current || innerWidth === 0 || data.length === 0) return;

    svg.selectAll("*").remove();

    // Defs for gradient
    const defs = svg.append("defs");
    categories.forEach((_, catIdx) => {
      const grad = defs
        .append("linearGradient")
        .attr("id", `area-grad-${catIdx}`)
        .attr("x1", "0")
        .attr("x2", "0")
        .attr("y1", "0")
        .attr("y2", "1");
      grad
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", resolvedColors[catIdx])
        .attr("stop-opacity", CHART_GRADIENT.areaOpacityStart);
      grad
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", resolvedColors[catIdx])
        .attr("stop-opacity", CHART_GRADIENT.areaOpacityEnd);
    });

    // Scales
    const xScale = d3
      .scalePoint<string>()
      .domain(data.map((d) => String(d[index])))
      .range([0, innerWidth])
      .padding(0.05);

    const allValues = data.flatMap((d) =>
      categories.map((cat) => Number(d[cat]) || 0),
    );
    const yMin = Math.min(0, d3.min(allValues) ?? 0);
    const yMax = d3.max(allValues) ?? 100;
    const yPad = (yMax - yMin) * 0.12;

    const yScale = d3
      .scaleLinear()
      .domain([yMin - yPad, yMax + yPad])
      .range([innerHeight, 0])
      .nice();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid
    if (showGridLines) {
      g.append("g")
        .attr("class", "grid")
        .selectAll("line")
        .data(yScale.ticks(4))
        .join("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", (d) => yScale(d))
        .attr("y2", (d) => yScale(d))
        .attr("stroke", "var(--chart-grid)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4")
        .attr("opacity", 0.5);
    }

    // Axes
    const xAxis = d3.axisBottom(xScale).tickSize(0).tickPadding(8);
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "var(--chart-axis)")
      .attr("font-size", "10px")
      .attr("font-family", "var(--font-sans)");

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickSize(0)
      .tickPadding(6)
      .tickFormat((d) => valueFormatter(d as number));

    g.append("g")
      .call(yAxis)
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "var(--chart-axis)")
      .attr("font-size", "10px")
      .attr("font-family", "var(--font-sans)");

    // Areas + Lines
    const curveFactory = CURVE_MAP[curveType];
    categories.forEach((cat, catIdx) => {
      const color = resolvedColors[catIdx];
      const catData = data.filter((d) => d[cat] != null);

      // Area
      const areaFn = d3
        .area<(typeof data)[number]>()
        .x((d) => xScale(String(d[index]))!)
        .y0(yScale(yMin - yPad))
        .y1((d) => yScale(Number(d[cat])))
        .curve(curveFactory);

      g.append("path")
        .datum(catData)
        .attr("fill", `url(#area-grad-${catIdx})`)
        .attr("d", areaFn)
        .attr("opacity", 0)
        .transition()
        .duration(800)
        .delay(catIdx * 100)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);

      // Line
      const lineFn = d3
        .line<(typeof data)[number]>()
        .x((d) => xScale(String(d[index]))!)
        .y((d) => yScale(Number(d[cat])))
        .curve(curveFactory);

      const path = g
        .append("path")
        .datum(catData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round")
        .attr("d", lineFn);

      // Animate line entry
      const totalLength =
        (path.node() as SVGPathElement)?.getTotalLength?.() ?? 0;
      if (totalLength > 0) {
        path
          .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .duration(1000)
          .delay(catIdx * 100)
          .ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);
      }
    });
  }, [
    data,
    index,
    categories,
    resolvedColors,
    dims,
    margin,
    valueFormatter,
    showGridLines,
    curveType,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className={className} style={{ position: "relative" }}>
      {showLegend && categories.length > 1 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pb-1.5">
          {categories.map((cat, i) => (
            <span
              key={cat}
              className="flex items-center gap-1 text-[10px] font-medium text-ink-secondary"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: resolvedColors[i] }}
              />
              {cat}
            </span>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ minHeight: 0 }}
      >
        <svg
          ref={svgRef}
          width={dims.width}
          height={dims.height}
          className="overflow-visible"
          role={CHART_A11Y.role}
          aria-label={ariaLabel}
        />
      </div>
    </div>
  );
});
