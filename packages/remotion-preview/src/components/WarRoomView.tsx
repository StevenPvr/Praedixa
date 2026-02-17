import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  FileText,
  Lightbulb,
  ShieldAlert,
  Siren,
  Target,
} from "lucide-react";
import { colors, fonts, layout, shadows } from "../tokens";

type AlertSeverity = "critical" | "high";

type AlertItem = {
  id: string;
  siteId: string;
  shift: string;
  alertDate: string;
  horizon: string;
  severity: AlertSeverity;
  gapH: number;
  pRupture: number;
  drivers: string[];
};

const kpis = [
  {
    label: "Alertes ouvertes",
    value: 7,
    status: "danger" as const,
    trend: -2.3,
    icon: Siren,
  },
  {
    label: "Sites exposes",
    value: 3,
    status: "warning" as const,
    icon: ShieldAlert,
  },
  {
    label: "Couverture humaine",
    value: 91.4,
    unit: "%",
    status: "warning" as const,
    icon: Target,
  },
  {
    label: "Precision prevision",
    value: 94.2,
    unit: "%",
    status: "good" as const,
    icon: Target,
  },
];

const topAlerts: AlertItem[] = [
  {
    id: "a1",
    siteId: "105",
    shift: "Matin",
    alertDate: "18 fev",
    horizon: "J3",
    severity: "critical",
    gapH: 4.2,
    pRupture: 0.87,
    drivers: ["Absence", "Grippe"],
  },
  {
    id: "a2",
    siteId: "212",
    shift: "Nuit",
    alertDate: "19 fev",
    horizon: "J7",
    severity: "critical",
    gapH: 3.8,
    pRupture: 0.72,
    drivers: ["Conges", "Formation"],
  },
  {
    id: "a3",
    siteId: "031",
    shift: "Apres-midi",
    alertDate: "20 fev",
    horizon: "J7",
    severity: "high",
    gapH: 2.1,
    pRupture: 0.58,
    drivers: ["RTT", "Surcharge"],
  },
  {
    id: "a4",
    siteId: "087",
    shift: "Matin",
    alertDate: "21 fev",
    horizon: "J14",
    severity: "high",
    gapH: 1.5,
    pRupture: 0.41,
    drivers: ["Effectif reduit"],
  },
];

const chartData = [
  { date: "10 fev", capacity: 94, demand: 86 },
  { date: "11 fev", capacity: 93, demand: 88 },
  { date: "12 fev", capacity: 95, demand: 91 },
  { date: "13 fev", capacity: 92, demand: 90 },
  { date: "14 fev", capacity: 91, demand: 93 },
  { date: "15 fev", capacity: 90, demand: 89 },
  { date: "16 fev", capacity: 88, demand: 82 },
  { date: "17 fev", capacity: 92, demand: 85 },
  { date: "18 fev", capacity: 93, demand: 92 },
  { date: "19 fev", capacity: 91, demand: 95 },
  { date: "20 fev", capacity: 90, demand: 88 },
  { date: "21 fev", capacity: 94, demand: 87 },
  { date: "22 fev", capacity: 95, demand: 84 },
  { date: "23 fev", capacity: 93, demand: 82 },
];

const scenarios = [
  {
    label: "Impact financier",
    helper: "12 400 EUR en jeu",
    color: colors.chartImpact,
    value: 0.85,
  },
  {
    label: "Heures a couvrir",
    helper: "11.6 h a arbitrer",
    color: colors.chartDemand,
    value: 0.65,
  },
  {
    label: "Urgence < 24h",
    helper: "3 alertes avant rupture",
    color: colors.chartCapacity,
    value: 0.45,
  },
];

const statusMap = {
  good: {
    border: colors.success,
    dot: colors.success,
    iconBg: colors.successLight,
    iconFg: colors.success,
    bg: `linear-gradient(145deg, ${colors.cardBg} 0%, oklch(0.97 0.01 150) 100%)`,
  },
  warning: {
    border: colors.warning,
    dot: colors.warning,
    iconBg: colors.warningLight,
    iconFg: colors.warning,
    bg: `linear-gradient(145deg, ${colors.cardBg} 0%, oklch(0.97 0.02 75) 100%)`,
  },
  danger: {
    border: colors.danger,
    dot: colors.danger,
    iconBg: colors.dangerLight,
    iconFg: colors.danger,
    bg: `linear-gradient(145deg, ${colors.cardBg} 0%, oklch(0.97 0.015 25) 100%)`,
  },
} as const;

const CHART_W = 700;
const CHART_H = 260;
const PAD_X = 36;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;

function sx(i: number): number {
  return PAD_X + (i / (chartData.length - 1)) * (CHART_W - PAD_X * 2);
}

function sy(v: number): number {
  const min = 75;
  const max = 100;
  return (
    PAD_TOP + (1 - (v - min) / (max - min)) * (CHART_H - PAD_TOP - PAD_BOTTOM)
  );
}

function linePath(key: "capacity" | "demand", progress: number): string {
  const pts = chartData.map((d, i) => ({ x: sx(i), y: sy(d[key]) }));
  const count = Math.floor(progress * pts.length);
  const frac = progress * pts.length - count;
  const visible = pts.slice(0, count + 1);
  if (count < pts.length - 1 && frac > 0) {
    const a = pts[count];
    const b = pts[count + 1];
    visible.push({
      x: a.x + (b.x - a.x) * frac,
      y: a.y + (b.y - a.y) * frac,
    });
  }
  return visible
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
}

function demandAreaPath(progress: number): string {
  const line = linePath("demand", progress);
  const pts = chartData.map((d, i) => ({ x: sx(i), y: sy(d.demand) }));
  const count = Math.min(Math.floor(progress * pts.length) + 1, pts.length);
  const firstX = pts[0].x;
  const lastX = pts[Math.max(0, count - 1)].x;
  return `${line} L ${lastX} ${CHART_H - PAD_BOTTOM} L ${firstX} ${CHART_H - PAD_BOTTOM} Z`;
}

function CoverageRing({ progress }: { progress: number }) {
  const size = 72;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)", flexShrink: 0 }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={colors.border}
        strokeWidth={strokeWidth}
        opacity={0.3}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={colors.warning}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
}

export const WarRoomView: React.FC = () => {
  const frame = useCurrentFrame();

  const contentFade = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const chartProgress = interpolate(frame, [38, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringProgress = interpolate(frame, [100, 150], [0, 0.914], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const criticalCount = topAlerts.filter(
    (a) => a.severity === "critical",
  ).length;
  const highCount = topAlerts.filter((a) => a.severity === "high").length;

  return (
    <AbsoluteFill
      style={{
        opacity: contentFade,
        overflow: "hidden",
        padding: `${layout.pagePaddingY}px ${layout.pagePaddingX}px`,
        fontFamily: fonts.sans,
        background: `
          radial-gradient(ellipse 80% 60% at 10% 20%, oklch(0.68 0.13 72 / 0.04) 0%, transparent 60%),
          radial-gradient(ellipse 60% 80% at 85% 70%, oklch(0.58 0.14 68 / 0.04) 0%, transparent 60%),
          radial-gradient(ellipse 70% 50% at 50% 90%, oklch(0.65 0.15 155 / 0.03) 0%, transparent 50%),
          ${colors.pageBg}
        `,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: layout.maxPageWidth,
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: colors.primary,
              marginBottom: 6,
            }}
          >
            Centre decisionnel
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontFamily: fonts.serif,
                  fontWeight: 400,
                  fontSize: 44,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  color: colors.ink,
                }}
              >
                War room operationnelle
              </h1>
              <p
                style={{
                  marginTop: 8,
                  marginBottom: 0,
                  maxWidth: 720,
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: colors.inkSecondary,
                }}
              >
                Identifiez les risques critiques, priorisez les arbitrages et
                declenchez les actions avant rupture.
              </p>
            </div>
            <div style={{ display: "inline-flex", gap: 10 }}>
              <button
                style={{
                  height: 40,
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.cardBg,
                  color: colors.inkSecondary,
                  padding: "0 14px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <FileText size={16} />
                Rapport executif
              </button>
              <button
                style={{
                  height: 40,
                  borderRadius: 10,
                  border: 0,
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                  color: "white",
                  padding: "0 14px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: shadows.premiumGlow,
                }}
              >
                <ArrowUpRight size={16} />
                Centre de traitement
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${colors.dangerLight}`,
            borderRadius: 10,
            background: "oklch(0.998 0.001 85 / 0.72)",
            backdropFilter: "blur(24px) saturate(1.5)",
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "14px 16px",
            marginBottom: 18,
            boxShadow: `0 0 0 1px ${colors.border}, 0 0 28px -6px oklch(0.60 0.20 25 / 0.20)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 3,
              height: "100%",
              borderRadius: "10px 0 0 10px",
              backgroundColor: colors.danger,
            }}
          />
          <AlertOctagon
            size={20}
            color={colors.danger}
            style={{ marginTop: 1 }}
          />
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: colors.dangerText,
                marginBottom: 2,
              }}
            >
              Risque critique detecte
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                color: colors.dangerText,
                opacity: 0.9,
              }}
            >
              {criticalCount} alerte(s) critique(s) et {highCount} alerte(s)
              elevee(s) necessitent une decision immediate.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {kpis.map((kpi, index) => {
            const cardIn = interpolate(
              frame,
              [14 + index * 5, 30 + index * 5],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
            const metricValue = interpolate(
              frame,
              [20 + index * 5, 52 + index * 5],
              [0, kpi.value],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const Icon = kpi.icon;
            const status = statusMap[kpi.status];

            return (
              <div
                key={kpi.label}
                style={{
                  opacity: cardIn,
                  transform: `translateY(${(1 - cardIn) * 10}px)`,
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `3px solid ${status.border}`,
                  background: status.bg,
                  padding: "14px 16px",
                  boxShadow: shadows.raised,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          backgroundColor: status.dot,
                          boxShadow: `0 0 0 3px ${status.iconBg}`,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: colors.inkTertiary,
                          fontWeight: 600,
                        }}
                      >
                        {kpi.label}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "baseline",
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: fonts.serif,
                          fontSize: 34,
                          lineHeight: 1,
                          color: colors.ink,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {kpi.unit
                          ? metricValue.toFixed(1)
                          : Math.round(metricValue)}
                      </span>
                      {kpi.unit ? (
                        <span
                          style={{ fontSize: 14, color: colors.inkSecondary }}
                        >
                          {kpi.unit}
                        </span>
                      ) : null}
                    </div>
                    {kpi.trend ? (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 11,
                          color: colors.success,
                          fontWeight: 600,
                        }}
                      >
                        {kpi.trend.toFixed(1)}% vs sem. prec.
                      </div>
                    ) : null}
                  </div>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: status.iconBg,
                      color: status.iconFg,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}
        >
          <div
            style={{
              flex: 2,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <section
              style={{
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.cardBg,
                boxShadow: shadows.raised,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{ fontSize: 15, color: colors.ink, fontWeight: 700 }}
                >
                  Projection de charge
                </div>
                <div
                  style={{
                    borderRadius: 6,
                    border: `1px solid ${colors.border}`,
                    fontSize: 11,
                    fontWeight: 600,
                    color: colors.inkSecondary,
                    padding: "2px 10px",
                  }}
                >
                  Live
                </div>
              </div>
              <div
                style={{
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, oklch(0.68 0.13 72 / 0.15), oklch(0.87 0.008 65), oklch(0.68 0.13 72 / 0.15), transparent)",
                }}
              />
              <div style={{ padding: 18 }}>
                <div
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.surfaceElevated,
                    boxShadow: shadows.raised,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "16px 18px 4px" }}>
                    <div
                      style={{
                        fontSize: 14,
                        color: colors.ink,
                        fontWeight: 700,
                      }}
                    >
                      Pression capacitaire a 14 jours
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 3,
                        color: colors.inkSecondary,
                      }}
                    >
                      Lecture executive des ecarts entre demande previsionnelle
                      et capacite disponible.
                    </div>
                  </div>
                  <div style={{ padding: "10px 18px 16px" }}>
                    <div
                      style={{
                        borderRadius: 12,
                        border: "1px solid oklch(0.96 0.03 25)",
                        backgroundColor: "oklch(0.96 0.03 25 / 0.5)",
                        color: colors.dangerText,
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "oklch(0.90 0.06 25)",
                          marginTop: 1,
                        }}
                      >
                        <Lightbulb size={12} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          Analyse
                        </div>
                        <div
                          style={{ fontSize: 11, marginTop: 2, opacity: 0.9 }}
                        >
                          2 jour(s) depassent la capacite prevue. Deficit
                          maximal estime: 4.2 heures.
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        borderRadius: 12,
                        border: `1px solid ${colors.borderSubtle}`,
                        backgroundColor: colors.surfaceElevated,
                        padding: 8,
                      }}
                    >
                      <svg
                        width={CHART_W}
                        height={CHART_H}
                        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                      >
                        {[80, 85, 90, 95].map((v) => (
                          <g key={v}>
                            <line
                              x1={PAD_X}
                              x2={CHART_W - PAD_X}
                              y1={sy(v)}
                              y2={sy(v)}
                              stroke={colors.borderSubtle}
                              strokeWidth={1}
                              strokeDasharray="4 6"
                            />
                            <text
                              x={PAD_X - 6}
                              y={sy(v) + 4}
                              textAnchor="end"
                              fontSize={10}
                              fill={colors.inkPlaceholder}
                            >
                              {v}
                            </text>
                          </g>
                        ))}

                        {chartData.map((d, i) => (
                          <text
                            key={d.date}
                            x={sx(i)}
                            y={CHART_H - 8}
                            textAnchor="middle"
                            fontSize={10}
                            fill={colors.inkPlaceholder}
                          >
                            {d.date}
                          </text>
                        ))}

                        <path
                          d={demandAreaPath(chartProgress)}
                          fill="oklch(0.71 0.135 78 / 0.18)"
                        />
                        <path
                          d={linePath("capacity", chartProgress)}
                          fill="none"
                          stroke={colors.chartCapacity}
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={linePath("demand", chartProgress)}
                          fill="none"
                          stroke={colors.chartDemand}
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {chartData.map((d, i) => {
                          const dotProgress = interpolate(
                            chartProgress,
                            [
                              i / chartData.length,
                              (i + 0.5) / chartData.length,
                            ],
                            [0, 1],
                            {
                              extrapolateLeft: "clamp",
                              extrapolateRight: "clamp",
                            },
                          );
                          return (
                            <circle
                              key={`dem-dot-${d.date}`}
                              cx={sx(i)}
                              cy={sy(d.demand)}
                              r={3 * dotProgress}
                              fill={colors.cardBg}
                              stroke={colors.chartDemand}
                              strokeWidth={2}
                            />
                          );
                        })}
                      </svg>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 18,
                        marginTop: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          color: colors.inkSecondary,
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            backgroundColor: colors.chartCapacity,
                          }}
                        />
                        Capacite disponible
                      </div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          color: colors.inkSecondary,
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            backgroundColor: colors.chartDemand,
                          }}
                        />
                        Demande previsionnelle
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              style={{
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.cardBg,
                boxShadow: shadows.raised,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{ fontSize: 15, color: colors.ink, fontWeight: 700 }}
                >
                  Priorites a traiter
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: colors.primary,
                    fontWeight: 500,
                  }}
                >
                  Voir la file complete
                </div>
              </div>
              <div
                style={{
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, oklch(0.68 0.13 72 / 0.15), oklch(0.87 0.008 65), oklch(0.68 0.13 72 / 0.15), transparent)",
                }}
              />
              <div
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {topAlerts.map((alert, index) => {
                  const inAt = 58 + index * 8;
                  const rowIn = interpolate(frame, [inAt, inAt + 14], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  const isCritical = alert.severity === "critical";

                  return (
                    <div
                      key={alert.id}
                      style={{
                        opacity: rowIn,
                        transform: `translateX(${(1 - rowIn) * 12}px)`,
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                        borderLeft: `3px solid ${isCritical ? colors.danger : colors.warning}`,
                        backgroundColor: colors.cardBg,
                        boxShadow: shadows.raised,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <span
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isCritical
                                ? colors.dangerLight
                                : colors.warningLight,
                              color: isCritical
                                ? colors.danger
                                : colors.warning,
                            }}
                          >
                            {isCritical ? (
                              <Siren size={16} />
                            ) : (
                              <ShieldAlert size={16} />
                            )}
                          </span>
                          <div>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: colors.ink,
                                }}
                              >
                                Site {alert.siteId}
                              </span>
                              <span
                                style={{
                                  width: 3,
                                  height: 3,
                                  borderRadius: 999,
                                  backgroundColor: colors.inkPlaceholder,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  letterSpacing: "0.05em",
                                  textTransform: "uppercase",
                                  color: colors.inkSecondary,
                                }}
                              >
                                {alert.shift}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: colors.inkTertiary,
                                marginTop: 2,
                              }}
                            >
                              {alert.alertDate} · Horizon{" "}
                              {alert.horizon.toUpperCase()}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              borderRadius: 6,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: 600,
                              color: isCritical
                                ? colors.dangerText
                                : colors.warningText,
                              backgroundColor: isCritical
                                ? colors.dangerLight
                                : colors.warningLight,
                            }}
                          >
                            {isCritical ? "Critique" : "Elevee"}
                          </span>
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontFamily: fonts.serif,
                                fontSize: 20,
                                color: colors.ink,
                                lineHeight: 1,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {alert.gapH.toFixed(1)} h
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: colors.inkPlaceholder,
                              }}
                            >
                              Ecart
                            </div>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          marginLeft: 46,
                          display: "flex",
                          alignItems: "center",
                          gap: 18,
                          fontSize: 11,
                          color: colors.inkTertiary,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <AlertTriangle size={14} />
                          Risque rupture:
                          <strong style={{ color: colors.inkSecondary }}>
                            {(alert.pRupture * 100).toFixed(0)}%
                          </strong>
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <Target size={14} />
                          Drivers:
                          <strong style={{ color: colors.inkSecondary }}>
                            {alert.drivers.slice(0, 2).join(", ")}
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <section
              style={{
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.cardBg,
                boxShadow: shadows.raised,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  fontSize: 15,
                  color: colors.ink,
                  fontWeight: 700,
                }}
              >
                Scenarios
              </div>
              <div
                style={{
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, oklch(0.68 0.13 72 / 0.15), oklch(0.87 0.008 65), oklch(0.68 0.13 72 / 0.15), transparent)",
                }}
              />
              <div style={{ padding: 16 }}>
                <div
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.surfaceElevated,
                    boxShadow: shadows.raised,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "16px 16px 4px" }}>
                    <div
                      style={{
                        fontSize: 14,
                        color: colors.ink,
                        fontWeight: 700,
                      }}
                    >
                      Indice d'exposition immediate
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 3,
                        color: colors.inkSecondary,
                      }}
                    >
                      Lecture synthese pour arbitrer l'ordre de traitement.
                    </div>
                  </div>

                  <div style={{ padding: "10px 16px 14px" }}>
                    <div
                      style={{
                        borderRadius: 12,
                        border: "1px solid oklch(0.96 0.03 25)",
                        backgroundColor: "oklch(0.96 0.03 25 / 0.5)",
                        color: colors.dangerText,
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "oklch(0.90 0.06 25)",
                          marginTop: 1,
                        }}
                      >
                        <Lightbulb size={12} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          Analyse
                        </div>
                        <div
                          style={{ fontSize: 11, marginTop: 2, opacity: 0.9 }}
                        >
                          3 sujets en file de traitement. Priorite: limiter
                          l'impact financier des alertes avec rupture &lt; 24h.
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        borderRadius: 12,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.surfaceAlt,
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {scenarios.map((s, idx) => {
                        const barFill = interpolate(
                          frame,
                          [78 + idx * 10, 108 + idx * 10],
                          [0, s.value],
                          {
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                          },
                        );
                        return (
                          <div key={s.label}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 4,
                                fontSize: 11,
                              }}
                            >
                              <span
                                style={{ color: colors.ink, fontWeight: 600 }}
                              >
                                {s.label}
                              </span>
                              <span style={{ color: colors.inkSecondary }}>
                                {s.helper}
                              </span>
                            </div>
                            <div
                              style={{
                                height: 9,
                                borderRadius: 999,
                                backgroundColor: "oklch(0.92 0.005 70)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${barFill * 100}%`,
                                  borderRadius: 999,
                                  backgroundColor: s.color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p
                      style={{
                        marginTop: 10,
                        marginBottom: 0,
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: colors.inkSecondary,
                      }}
                    >
                      Cet indice combine le cout potentiel, le volume d'heures
                      manquantes et le temps avant rupture pour structurer la
                      priorisation.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section
              style={{
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: `linear-gradient(145deg, ${colors.cardBg} 0%, ${colors.cardBgMuted} 100%)`,
                boxShadow: shadows.raised,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <CoverageRing progress={ringProgress} />
                <div>
                  <div
                    style={{ fontSize: 14, color: colors.ink, fontWeight: 700 }}
                  >
                    Score de couverture
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontFamily: fonts.serif,
                      fontSize: 34,
                      lineHeight: 1,
                      color: colors.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {Math.round(ringProgress * 100)}
                    <span
                      style={{
                        marginLeft: 2,
                        fontSize: 16,
                        color: colors.inkTertiary,
                      }}
                    >
                      %
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: colors.inkSecondary,
                    }}
                  >
                    Capacite vs. besoin sur l'horizon courant.
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
