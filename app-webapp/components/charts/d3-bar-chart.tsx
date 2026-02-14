"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import * as d3 from "d3";
import { useChartDimensions, type Margin } from "./use-chart-dimensions";
import { CHART_GRADIENT, CHART_A11Y, getSeriesColor } from "./chart-theme";

/* ─── Types ─── */

export interface D3BarChartProps {
  data: Record<string, string | number>[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (v: number) => string;
  showLegend?: boolean;
  showGridLines?: boolean;
  className?: string;
  margin?: Margin;
  ariaLabel?: string;
}

/* ─── Component ─── */

export const D3BarChart = memo(function D3BarChart({
  data,
  index,
  categories,
  colors,
  valueFormatter = (v) => v.toFixed(0),
  showLegend = false,
  showGridLines = false,
  className,
  margin: marginProp,
  ariaLabel = "Bar chart",
}: D3BarChartProps) {
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
        .attr("id", `bar-grad-${catIdx}`)
        .attr("x1", "0")
        .attr("x2", "0")
        .attr("y1", "0")
        .attr("y2", "1");
      grad
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", resolvedColors[catIdx])
        .attr("stop-opacity", CHART_GRADIENT.barOpacityStart);
      grad
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", resolvedColors[catIdx])
        .attr("stop-opacity", CHART_GRADIENT.barOpacityEnd);
    });
    const glowFilter = defs
      .append("filter")
      .attr("id", "bar-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", 2)
      .attr("result", "blur");
    const merge = glowFilter.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => String(d[index])))
      .range([0, innerWidth])
      .padding(0.35);

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
        .selectAll("line")
        .data(yScale.ticks(4))
        .join("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", (d) => yScale(d))
        .attr("y2", (d) => yScale(d))
        .attr("stroke", "var(--border)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3")
        .attr("opacity", 0.5);
    }

    // Axes
    const xAxis = d3.axisBottom(xScale).tickSize(0).tickPadding(8);
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "var(--ink-tertiary)")
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
      .attr("fill", "var(--ink-tertiary)")
      .attr("font-size", "10px")
      .attr("font-family", "var(--font-sans)");

    // Zero line
    if (yMin < 0) {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", "var(--border-hover)")
        .attr("stroke-width", 1);
    }

    // Bars
    const barWidth = xScale.bandwidth() / categories.length;
    categories.forEach((cat, catIdx) => {
      g.selectAll(`.bar-${catIdx}`)
        .data(data)
        .join("rect")
        .attr("x", (d) => (xScale(String(d[index])) ?? 0) + catIdx * barWidth)
        .attr("y", yScale(0))
        .attr("width", Math.max(0, barWidth - 2))
        .attr("height", 0)
        .attr("fill", `url(#bar-grad-${catIdx})`)
        .attr("rx", Math.min(4, barWidth / 3))
        .attr("ry", Math.min(4, barWidth / 3))
        .transition()
        .duration(600)
        .delay((_, i) => i * 50 + catIdx * 80)
        .ease(d3.easeCubicOut)
        .attr("y", (d) => {
          const val = Number(d[cat]) || 0;
          return val >= 0 ? yScale(val) : yScale(0);
        })
        .attr("height", (d) => {
          const val = Number(d[cat]) || 0;
          return Math.abs(yScale(val) - yScale(0));
        });
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
