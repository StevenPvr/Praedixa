"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useChartDimensions, type Margin } from "./use-chart-dimensions";
import {
  CHART_AXIS,
  CHART_GRID,
  CHART_CROSSHAIR,
  CHART_ANIMATION,
  CHART_GRADIENT,
  CHART_GLOW,
  CHART_A11Y,
  getSeriesColor,
} from "./chart-theme";

/* ── Types ── */

export interface D3LineChartProps {
  data: Record<string, string | number>[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (v: number) => string;
  showLegend?: boolean;
  showGridLines?: boolean;
  curveType?: "natural" | "monotone" | "linear";
  yAxisWidth?: number;
  className?: string;
  margin?: Margin;
  ariaLabel?: string;
}

const CURVE_MAP = {
  natural: d3.curveNatural,
  monotone: d3.curveMonotoneX,
  linear: d3.curveLinear,
};

/* ── Component ── */

export const D3LineChart = memo(function D3LineChart({
  data,
  index,
  categories,
  colors,
  valueFormatter = (v) => v.toFixed(0),
  showLegend = true,
  showGridLines = true,
  curveType = "monotone",
  yAxisWidth = 48,
  className,
  margin: marginProp,
  ariaLabel = "Line chart showing data over time",
}: D3LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [activeSeries, setActiveSeries] = useState<string | null>(null);

  const defaultMargin: Margin = {
    top: showLegend ? 8 : 16,
    right: 16,
    bottom: 32,
    left: yAxisWidth,
  };
  const margin = marginProp ?? defaultMargin;
  const [containerRef, dims] = useChartDimensions(margin);

  const resolvedColors = categories.map(
    (_, i) => colors?.[i] ?? getSeriesColor(i),
  );

  const draw = useCallback(() => {
    const svg = d3.select(svgRef.current);
    const { width, innerWidth, innerHeight } = dims;
    if (!svgRef.current || width === 0 || data.length === 0) return;

    svg.selectAll("*").remove();

    // ── Defs: gradients and glow filter ──
    const defs = svg.append("defs");
    categories.forEach((_, catIdx) => {
      const grad = defs
        .append("linearGradient")
        .attr("id", `line-area-grad-${catIdx}`)
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
    const glowFilter = defs
      .append("filter")
      .attr("id", "chart-point-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", 3)
      .attr("result", "blur");
    const merge = glowFilter.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // ── Scales ──
    const xScale = d3
      .scalePoint<string>()
      .domain(data.map((d) => String(d[index])))
      .range([0, innerWidth])
      .padding(0.1);

    const allValues = data.flatMap((d) =>
      categories.map((cat) => Number(d[cat]) || 0),
    );
    const yMin = Math.min(0, d3.min(allValues) ?? 0);
    const yMax = d3.max(allValues) ?? 100;
    const yPad = (yMax - yMin) * 0.1;

    const yScale = d3
      .scaleLinear()
      .domain([yMin - yPad, yMax + yPad])
      .range([innerHeight, 0])
      .nice();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // ── Grid lines ──
    if (showGridLines) {
      const gridTicks = yScale.ticks(5);
      g.append("g")
        .attr("class", "grid")
        .selectAll("line")
        .data(gridTicks)
        .join("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", (d) => yScale(d))
        .attr("y2", (d) => yScale(d))
        .attr("stroke", CHART_GRID.color)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", CHART_GRID.dashArray)
        .attr("opacity", 0.5);
    }

    // ── Axes ──
    const xAxis = d3
      .axisBottom(xScale)
      .tickSize(CHART_AXIS.tickSize)
      .tickPadding(CHART_AXIS.tickPadding);
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((sel) => sel.select(".domain").remove())
      .selectAll("text")
      .attr("fill", CHART_AXIS.color)
      .attr("font-size", `${CHART_AXIS.fontSize}px`)
      .attr("font-family", CHART_AXIS.fontFamily);

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(CHART_AXIS.tickSize)
      .tickPadding(CHART_AXIS.tickPadding)
      .tickFormat((d) => valueFormatter(d as number));

    g.append("g")
      .call(yAxis)
      .call((sel) => sel.select(".domain").remove())
      .selectAll("text")
      .attr("fill", CHART_AXIS.color)
      .attr("font-size", `${CHART_AXIS.fontSize}px`)
      .attr("font-family", CHART_AXIS.fontFamily);

    // ── Lines ──
    const curveFactory = CURVE_MAP[curveType];
    categories.forEach((cat, catIdx) => {
      const color = resolvedColors[catIdx];
      const lineData = data.filter((d) => d[cat] != null);

      const lineFn = d3
        .line<(typeof data)[number]>()
        .x((d) => xScale(String(d[index]))!)
        .y((d) => yScale(Number(d[cat])))
        .curve(curveFactory);

      const path = g
        .append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", activeSeries && activeSeries !== cat ? 1.5 : 2.5)
        .attr("opacity", activeSeries && activeSeries !== cat ? 0.2 : 1)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("d", lineFn)
        .style("transition", "opacity 0.3s ease, stroke-width 0.3s ease");

      // Draw animation
      const totalLength =
        (path.node() as SVGPathElement)?.getTotalLength?.() ?? 0;
      if (totalLength > 0) {
        path
          .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .duration(CHART_ANIMATION.drawDuration)
          .delay(catIdx * CHART_ANIMATION.staggerDelay * 3)
          .ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);
      }

      // Dots
      g.selectAll(`.dot-${catIdx}`)
        .data(lineData)
        .join("circle")
        .attr("class", "chart-dot")
        .attr("data-key", (d) => String(d[index]))
        .attr("cx", (d) => xScale(String(d[index]))!)
        .attr("cy", (d) => yScale(Number(d[cat])))
        .attr("r", 0)
        .attr("fill", color)
        .attr("stroke", "var(--card-bg)")
        .attr("stroke-width", 2)
        .transition()
        .duration(300)
        .delay(
          (_, i) =>
            CHART_ANIMATION.drawDuration +
            catIdx * CHART_ANIMATION.staggerDelay * 3 +
            i * CHART_ANIMATION.staggerDelay,
        )
        .ease(d3.easeCubicOut)
        .attr("r", 3.5);
    });

    // ── Hover overlay ──
    const overlay = g
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "none")
      .attr("pointer-events", "all");

    const hoverLine = g
      .append("line")
      .attr("stroke", CHART_CROSSHAIR.color)
      .attr("stroke-width", CHART_CROSSHAIR.width)
      .attr("stroke-dasharray", CHART_CROSSHAIR.dashArray)
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("opacity", 0);

    overlay
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const domain = xScale.domain();
        const positions = domain.map((d) => xScale(d)!);
        let closestIdx = 0;
        let closestDist = Infinity;
        positions.forEach((pos, i) => {
          const dist = Math.abs(mx - pos);
          if (dist < closestDist) {
            closestDist = dist;
            closestIdx = i;
          }
        });

        const xPos = positions[closestIdx];
        const datum = data[closestIdx];
        if (!datum) return;

        hoverLine.attr("x1", xPos).attr("x2", xPos).attr("opacity", 1);

        const hoverKey = String(datum[index]);
        g.selectAll("circle.chart-dot")
          .attr("filter", function () {
            return d3.select(this).attr("data-key") === hoverKey
              ? "url(#chart-point-glow)"
              : null;
          })
          .attr("r", function () {
            return d3.select(this).attr("data-key") === hoverKey
              ? CHART_GLOW.pointRadius
              : 3.5;
          });

        const tooltip = tooltipRef.current;
        if (tooltip) {
          const values = categories
            .map((cat, i) => {
              const val = Number(datum[cat]);
              const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${resolvedColors[i]};margin-right:6px;flex-shrink:0;"></span>`;
              return `<div style="display:flex;align-items:center;gap:2px;white-space:nowrap;padding:1px 0;">${dot}<span style="color:var(--ink-secondary);font-size:11px;">${cat}</span><span style="margin-left:auto;font-weight:600;font-size:12px;padding-left:12px;font-variant-numeric:tabular-nums;">${valueFormatter(val)}</span></div>`;
            })
            .join("");

          tooltip.innerHTML = `<div style="font-size:11px;font-weight:600;color:var(--ink);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em;">${datum[index]}</div>${values}`;
          tooltip.style.opacity = "1";
          tooltip.style.transform = "translateY(0)";

          const tooltipLeft = xPos + margin.left + 14;
          const tooltipTop = 24;
          tooltip.style.left = `${tooltipLeft}px`;
          tooltip.style.top = `${tooltipTop}px`;

          if (tooltipLeft + 180 > width) {
            tooltip.style.left = `${xPos + margin.left - 194}px`;
          }
        }
      })
      .on("mouseleave", () => {
        hoverLine.attr("opacity", 0);
        g.selectAll("circle.chart-dot").attr("filter", null).attr("r", 3.5);
        const tooltip = tooltipRef.current;
        if (tooltip) {
          tooltip.style.opacity = "0";
          tooltip.style.transform = "translateY(4px)";
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
    activeSeries,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className={className} style={{ position: "relative" }}>
      {showLegend && categories.length > 1 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 pb-3">
          {categories.map((cat, i) => (
            <button
              key={cat}
              type="button"
              className="flex items-center gap-1.5 text-caption font-medium transition-opacity duration-fast"
              style={{
                color:
                  activeSeries && activeSeries !== cat
                    ? "var(--ink-placeholder)"
                    : "var(--ink-secondary)",
                opacity: activeSeries && activeSeries !== cat ? 0.5 : 1,
              }}
              onClick={() =>
                setActiveSeries((prev) => (prev === cat ? null : cat))
              }
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: resolvedColors[i] }}
              />
              {cat}
            </button>
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
        {/* Premium tooltip */}
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-10 surface-glass rounded-lg px-3.5 py-2.5 shadow-overlay"
          style={{
            opacity: 0,
            transform: "translateY(4px)",
            transition: `opacity ${CHART_ANIMATION.tooltipDuration}ms ease, transform ${CHART_ANIMATION.tooltipDuration}ms ease`,
            minWidth: "160px",
          }}
        />
      </div>
    </div>
  );
});
