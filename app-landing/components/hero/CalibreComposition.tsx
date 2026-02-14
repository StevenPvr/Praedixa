import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const BRASS = "#b08d57";
const BRASS_LIGHT = "#c89d6a";
const BRASS_DARK = "#8a6d3b";
const BRASS_DIM = "rgba(176, 141, 87, 0.2)";
const INK = "oklch(0.13 0.008 55)";
const INK_DEEP = "oklch(0.08 0.005 55)";

type CalibreProps = {
  locale: "fr" | "en";
};

type Stage = {
  label: string;
  sub: string;
  part: string;
  value: string;
  metric: string;
};

const toCartesian = (cx: number, cy: number, radius: number, angle: number) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
};

const describeArc = (
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = toCartesian(cx, cy, radius, endAngle);
  const end = toCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const chapterActivation = (
  cycleFrame: number,
  stageIndex: number,
  stageFrames: number,
) => {
  const stageStart = stageIndex * stageFrames;
  const stageEnd = stageStart + stageFrames;
  if (cycleFrame < stageStart || cycleFrame >= stageEnd) {
    return 0;
  }
  const t = (cycleFrame - stageStart) / stageFrames;
  return clamp01(
    interpolate(t, [0, 0.12, 0.76, 0.95, 1], [0, 1, 1, 0.35, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
};

function GearPath({
  cx,
  cy,
  outerR,
  innerR,
  teeth,
  rotation,
  opacity = 0.65,
}: {
  cx: number;
  cy: number;
  outerR: number;
  innerR: number;
  teeth: number;
  rotation: number;
  opacity?: number;
}) {
  const points: string[] = [];
  const toothAngle = (2 * Math.PI) / teeth;
  const toothWidth = toothAngle * 0.35;

  for (let i = 0; i < teeth; i++) {
    const baseAngle = i * toothAngle;
    points.push(
      `${cx + innerR * Math.cos(baseAngle - toothWidth)},${cy + innerR * Math.sin(baseAngle - toothWidth)}`,
    );
    points.push(
      `${cx + outerR * Math.cos(baseAngle - toothWidth * 0.6)},${cy + outerR * Math.sin(baseAngle - toothWidth * 0.6)}`,
    );
    points.push(
      `${cx + outerR * Math.cos(baseAngle + toothWidth * 0.6)},${cy + outerR * Math.sin(baseAngle + toothWidth * 0.6)}`,
    );
    points.push(
      `${cx + innerR * Math.cos(baseAngle + toothWidth)},${cy + innerR * Math.sin(baseAngle + toothWidth)}`,
    );
  }

  return (
    <g transform={`rotate(${rotation}, ${cx}, ${cy})`} opacity={opacity}>
      <polygon
        points={points.join(" ")}
        fill="none"
        stroke={BRASS}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <circle
        cx={cx}
        cy={cy}
        r={innerR * 0.35}
        fill="none"
        stroke={BRASS}
        strokeWidth="0.6"
      />
      {[0, 60, 120].map((a) => (
        <line
          key={a}
          x1={cx + innerR * 0.35 * Math.cos((a * Math.PI) / 180)}
          y1={cy + innerR * 0.35 * Math.sin((a * Math.PI) / 180)}
          x2={cx + innerR * 0.85 * Math.cos((a * Math.PI) / 180)}
          y2={cy + innerR * 0.85 * Math.sin((a * Math.PI) / 180)}
          stroke={BRASS}
          strokeWidth="0.4"
          opacity="0.45"
        />
      ))}
    </g>
  );
}

function BalanceWheel({
  cx,
  cy,
  radius,
  rotation,
  opacity,
}: {
  cx: number;
  cy: number;
  radius: number;
  rotation: number;
  opacity: number;
}) {
  const spiralPoints: string[] = [];
  const turns = 3.5;
  const steps = 120;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * 2 * Math.PI;
    const r = 4 + t * (radius * 0.4);
    spiralPoints.push(
      `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`,
    );
  }

  return (
    <g transform={`rotate(${rotation}, ${cx}, ${cy})`} opacity={opacity}>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={BRASS_LIGHT}
        strokeWidth="1.2"
      />
      <circle
        cx={cx}
        cy={cy}
        r={radius - 3}
        fill="none"
        stroke={BRASS}
        strokeWidth="0.3"
        opacity="0.3"
      />
      {[0, 90, 180, 270].map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <line
            key={a}
            x1={cx}
            y1={cy}
            x2={cx + (radius - 2) * Math.cos(rad)}
            y2={cy + (radius - 2) * Math.sin(rad)}
            stroke={BRASS}
            strokeWidth="0.7"
            opacity="0.5"
          />
        );
      })}
      {[45, 135, 225, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <circle
            key={a}
            cx={cx + radius * Math.cos(rad)}
            cy={cy + radius * Math.sin(rad)}
            r="2"
            fill={BRASS_DARK}
            opacity="0.6"
          />
        );
      })}
      <polyline
        points={spiralPoints.join(" ")}
        fill="none"
        stroke={BRASS}
        strokeWidth="0.35"
        opacity="0.35"
      />
      <circle cx={cx} cy={cy} r="3" fill={BRASS_DARK} opacity="0.7" />
      <circle cx={cx} cy={cy} r="1.5" fill={BRASS_LIGHT} opacity="0.5" />
    </g>
  );
}

export const CalibreComposition: React.FC<CalibreProps> = ({ locale }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const cx = width / 2;
  const cy = height / 2;

  const stages: Stage[] =
    locale === "fr"
      ? [
          {
            label: "Signal",
            sub: "J+14 \u2192 J+3",
            part: "Roue de détection",
            value: "Détecte les tensions avant la rupture terrain",
            metric: "Lead time utile: 3 à 14 jours",
          },
          {
            label: "Arbitrage",
            sub: "Coût vs service",
            part: "Train d'engrenages",
            value: "Compare les scénarios économiques possibles",
            metric: "Scénarios comparés: 4 options classées",
          },
          {
            label: "Décision",
            sub: "Traçable",
            part: "Échappement",
            value: "Verrouille une option claire et exécutable",
            metric: "Journal: hypothèses + action validée",
          },
          {
            label: "Preuve",
            sub: "0% / 100% / réel",
            part: "Compteur d'impact",
            value: "Mesure l'impact observé pour Ops + DAF",
            metric: "Attribution: baseline vs appliqué vs observé",
          },
        ]
      : [
          {
            label: "Signal",
            sub: "D+14 \u2192 D+3",
            part: "Detection wheel",
            value: "Flags coverage stress before field disruption",
            metric: "Useful lead time: 3 to 14 days",
          },
          {
            label: "Trade-off",
            sub: "Cost vs service",
            part: "Gear train",
            value: "Compares economic scenarios side by side",
            metric: "Scenarios compared: 4 ranked options",
          },
          {
            label: "Decision",
            sub: "Traceable",
            part: "Escapement",
            value: "Locks one executable and accountable action",
            metric: "Log: assumptions + selected action",
          },
          {
            label: "Proof",
            sub: "0% / 100% / actual",
            part: "Impact counter",
            value: "Measures observed impact for Ops + Finance",
            metric: "Attribution: baseline vs applied vs actual",
          },
        ];

  const cycleFrames = durationInFrames;
  const cycleFrame = frame % cycleFrames;
  const stageFrames = cycleFrames / stages.length;
  const activeStageIndex = Math.floor(cycleFrame / stageFrames) % stages.length;
  const stageLocalFrame = cycleFrame - activeStageIndex * stageFrames;
  const stageLocalProgress = stageLocalFrame / stageFrames;
  const stageActivations = stages.map((_, index) =>
    chapterActivation(cycleFrame, index, stageFrames),
  );
  const fallbackStage: Stage =
    locale === "fr"
      ? {
          label: "Signal",
          sub: "J+14 \u2192 J+3",
          part: "Roue de détection",
          value: "",
          metric: "",
        }
      : {
          label: "Signal",
          sub: "D+14 \u2192 D+3",
          part: "Detection wheel",
          value: "",
          metric: "",
        };
  const activeStage = stages[activeStageIndex] ?? fallbackStage;

  const reveal = spring({
    frame,
    fps,
    durationInFrames: Math.round(fps * 1.6),
    config: { damping: 200 },
  });

  const revealScale = interpolate(reveal, [0, 1], [0.94, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const revealOpacity = interpolate(reveal, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stagePhase = interpolate(cycleFrame, [0, cycleFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const gear1Rot = frame * 1.15;
  const gear2Rot = -frame * 2;
  const gear3Rot = frame * 3.5;

  const beatPeriod = fps * 0.72;
  const beatPhase = (frame % beatPeriod) / beatPeriod;
  const balanceAngle = interpolate(
    Math.sin(beatPhase * Math.PI * 2),
    [-1, 1],
    [-24, 24],
  );

  const plateRotation = interpolate(stagePhase, [0, 1], [0, 8], {
    easing: Easing.inOut(Easing.quad),
  });

  const stageAngles = [-45, 45, 135, 225];
  let previousAngle =
    stageAngles[
      (activeStageIndex + stageAngles.length - 1) % stageAngles.length
    ] ?? -45;
  const currentStageAngle = stageAngles[activeStageIndex] ?? -45;
  if (previousAngle > currentStageAngle) {
    previousAngle -= 360;
  }
  const handSweep = interpolate(
    stageLocalFrame,
    [0, stageFrames * 0.32],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  );
  const handBaseAngle = interpolate(
    handSweep,
    [0, 1],
    [previousAngle, currentStageAngle],
  );
  const handMicro =
    Math.sin(stageLocalProgress * Math.PI * 2) * (1 - handSweep) * 1.8;
  const handAngle = handBaseAngle + handMicro;
  const sweepCycle = (frame % (fps * 6)) / (fps * 6);
  const sweepX = interpolate(sweepCycle, [0, 1], [-30, 130]);
  const sweepOpacity = interpolate(
    sweepCycle,
    [0, 0.08, 0.45, 0.85, 1],
    [0, 0.16, 0.26, 0.16, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const g1 = { x: cx - 30, y: cy + 15, outerR: 62, innerR: 48, teeth: 24 };
  const g2 = { x: cx + 55, y: cy - 25, outerR: 42, innerR: 32, teeth: 16 };
  const g3 = { x: cx + 30, y: cy + 70, outerR: 28, innerR: 20, teeth: 12 };
  const bw = { x: cx - 55, y: cy - 60, radius: 30 };

  const jewels = [
    { x: cx, y: cy - 55, delay: 0 },
    { x: cx + 85, y: cy + 30, delay: 0.5 },
    { x: cx - 75, y: cy + 65, delay: 1.0 },
    { x: cx + 45, y: cy - 85, delay: 1.5 },
    { x: cx - 85, y: cy - 25, delay: 2.0 },
  ];

  const flowTracks = [
    {
      from: { x: g1.x + 38, y: g1.y - 22 },
      to: { x: g2.x - 18, y: g2.y + 8 },
      offset: 0.2,
    },
    {
      from: { x: g2.x - 12, y: g2.y + 22 },
      to: { x: g3.x + 10, y: g3.y - 16 },
      offset: 0.65,
    },
    {
      from: { x: bw.x + 22, y: bw.y + 12 },
      to: { x: g1.x - 30, y: g1.y - 28 },
      offset: 0.05,
    },
  ];

  const outerRingRadius = Math.min(width, height) * 0.425;
  const stageGap = 7;

  const horizons =
    locale === "fr"
      ? ["J+14", "J+7", "J+3", "J+0"]
      : ["D+14", "D+7", "D+3", "D+0"];

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        transform: `scale(${revealScale})`,
        opacity: revealOpacity,
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <defs>
          <radialGradient id="calibre-plate-gradient" cx="50%" cy="48%" r="40%">
            <stop offset="0%" stopColor="oklch(0.24 0.02 68)" />
            <stop offset="55%" stopColor="oklch(0.17 0.015 62)" />
            <stop offset="100%" stopColor="oklch(0.11 0.008 55)" />
          </radialGradient>
          <radialGradient id="calibre-jewel-glow">
            <stop offset="0%" stopColor={BRASS_LIGHT} stopOpacity="0.85" />
            <stop offset="100%" stopColor={BRASS} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={width} height={height} fill={INK_DEEP} />
        <circle
          cx={cx}
          cy={cy}
          r={Math.min(width, height) * 0.5}
          fill="none"
          stroke="oklch(0.42 0.02 70 / 0.15)"
          strokeWidth="26"
        />
        <circle
          cx={cx}
          cy={cy}
          r={Math.min(width, height) * 0.38}
          fill="url(#calibre-plate-gradient)"
          transform={`rotate(${plateRotation}, ${cx}, ${cy})`}
        />

        {Array.from({ length: 14 }, (_, i) => {
          const yOffset = cy - 90 + i * 14;
          return (
            <line
              key={`stripe-${i}`}
              x1={cx - 130}
              y1={yOffset}
              x2={cx + 130}
              y2={yOffset}
              stroke={BRASS}
              strokeWidth="0.2"
              opacity="0.06"
            />
          );
        })}

        <GearPath
          cx={g1.x}
          cy={g1.y}
          outerR={g1.outerR}
          innerR={g1.innerR}
          teeth={g1.teeth}
          rotation={gear1Rot}
          opacity={0.56}
        />
        <GearPath
          cx={g2.x}
          cy={g2.y}
          outerR={g2.outerR}
          innerR={g2.innerR}
          teeth={g2.teeth}
          rotation={gear2Rot}
          opacity={0.52}
        />
        <GearPath
          cx={g3.x}
          cy={g3.y}
          outerR={g3.outerR}
          innerR={g3.innerR}
          teeth={g3.teeth}
          rotation={gear3Rot}
          opacity={0.46}
        />

        <BalanceWheel
          cx={bw.x}
          cy={bw.y}
          radius={bw.radius}
          rotation={balanceAngle}
          opacity={0.62}
        />

        <rect
          x={g1.x - 35}
          y={g1.y - 5}
          width="70"
          height="10"
          rx="3"
          fill="none"
          stroke={BRASS_DARK}
          strokeWidth="0.5"
          opacity="0.2"
          transform={`rotate(15, ${g1.x}, ${g1.y})`}
        />
        <path
          d={`M ${g2.x - 10} ${g2.y + 5} Q ${cx + 50} ${cy + 30} ${g3.x + 10} ${g3.y - 5}`}
          fill="none"
          stroke={BRASS_DARK}
          strokeWidth="0.5"
          opacity="0.18"
        />

        {flowTracks.map((track, index) => {
          const travel = (frame / (fps * 1.35) + track.offset) % 1;
          const x = track.from.x + (track.to.x - track.from.x) * travel;
          const y = track.from.y + (track.to.y - track.from.y) * travel;
          return (
            <g key={`flow-${index}`}>
              <line
                x1={track.from.x}
                y1={track.from.y}
                x2={track.to.x}
                y2={track.to.y}
                stroke={BRASS}
                strokeWidth="0.4"
                strokeDasharray="2 3"
                opacity="0.2"
              />
              <circle cx={x} cy={y} r="2.2" fill={BRASS_LIGHT} opacity="0.7" />
            </g>
          );
        })}

        {jewels.map((jewel, i) => {
          const phase = (frame / fps - jewel.delay) % 2.8;
          const glowOpacity = interpolate(
            phase,
            [0, 0.5, 1.4, 2.1, 2.8],
            [0.12, 0.56, 0.56, 0.12, 0.12],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const glowScale = interpolate(
            phase,
            [0, 0.5, 1.4, 2.1, 2.8],
            [0.85, 1.3, 1.3, 0.85, 0.85],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <g key={`jewel-${i}`}>
              <circle
                cx={jewel.x}
                cy={jewel.y}
                r={12 * glowScale}
                fill="url(#calibre-jewel-glow)"
                opacity={glowOpacity * 0.6}
              />
              <circle
                cx={jewel.x}
                cy={jewel.y}
                r={3}
                fill={BRASS_LIGHT}
                opacity={0.35 + glowOpacity * 0.35}
              />
              <circle
                cx={jewel.x}
                cy={jewel.y}
                r={5}
                fill="none"
                stroke={BRASS}
                strokeWidth="0.45"
                opacity={0.26 + glowOpacity * 0.2}
              />
            </g>
          );
        })}

        <circle
          cx={cx}
          cy={cy}
          r={outerRingRadius}
          fill="none"
          stroke={BRASS}
          strokeWidth="0.9"
          opacity="0.2"
        />

        {stages.map((stage, index) => {
          const start = -90 + index * 90 + stageGap;
          const end = -90 + (index + 1) * 90 - stageGap;
          const activation = stageActivations[index] ?? 0;
          const strokeOpacity = interpolate(activation, [0, 1], [0.2, 0.9], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <g key={stage.label}>
              <path
                d={describeArc(cx, cy, outerRingRadius, start, end)}
                fill="none"
                stroke={BRASS}
                strokeWidth="3"
                opacity="0.15"
                strokeLinecap="round"
              />
              <path
                d={describeArc(cx, cy, outerRingRadius, start, end)}
                fill="none"
                stroke={BRASS_LIGHT}
                strokeWidth="4.2"
                opacity={strokeOpacity}
                strokeLinecap="round"
              />
              <circle
                cx={toCartesian(cx, cy, outerRingRadius, start + 45).x}
                cy={toCartesian(cx, cy, outerRingRadius, start + 45).y}
                r={interpolate(activation, [0, 1], [1.5, 3.5])}
                fill={BRASS_LIGHT}
                opacity={strokeOpacity}
              />
            </g>
          );
        })}

        {Array.from({ length: 60 }, (_, i) => {
          const angle = i * 6 - 90;
          const isMajor = i % 5 === 0;
          const outerR = outerRingRadius + 6;
          const innerR = isMajor ? outerR - 13 : outerR - 6;
          const p1 = toCartesian(cx, cy, outerR, angle);
          const p2 = toCartesian(cx, cy, innerR, angle);
          return (
            <line
              key={`tick-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={BRASS}
              strokeWidth={isMajor ? 1.4 : 0.45}
              opacity={isMajor ? 0.42 : 0.18}
              strokeLinecap="round"
            />
          );
        })}

        {horizons.map((label, index) => {
          const angle = -90 + index * 90;
          const p = toCartesian(cx, cy, outerRingRadius + 22, angle);
          return (
            <text
              key={label}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              fill={BRASS}
              fontFamily="Manrope, sans-serif"
              fontSize="8"
              fontWeight="700"
              letterSpacing="0.09em"
              opacity={0.72}
            >
              {label}
            </text>
          );
        })}

        <line
          x1={cx}
          y1={cy}
          x2={toCartesian(cx, cy, outerRingRadius - 28, handAngle).x}
          y2={toCartesian(cx, cy, outerRingRadius - 28, handAngle).y}
          stroke={BRASS_LIGHT}
          strokeWidth="1.6"
          opacity="0.75"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="4.5" fill={BRASS_DARK} opacity="0.84" />
        <circle cx={cx} cy={cy} r="2.2" fill={BRASS_LIGHT} opacity="0.92" />

        <text
          x={cx}
          y={cy + outerRingRadius * 0.68}
          fill={BRASS_LIGHT}
          fontSize="16"
          fontFamily="Cormorant Garamond, serif"
          textAnchor="middle"
          letterSpacing="0.02em"
        >
          {activeStage.label}
        </text>
        <text
          x={cx}
          y={cy + outerRingRadius * 0.68 + 16}
          fill="oklch(0.62 0.01 70)"
          fontSize="7.5"
          fontFamily="Manrope, sans-serif"
          fontWeight="700"
          textAnchor="middle"
          letterSpacing="0.18em"
        >
          {activeStage.sub.toUpperCase()}
        </text>
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: sweepOpacity,
          background: `linear-gradient(115deg, transparent ${sweepX - 15}%, ${BRASS_DIM} ${sweepX}%, transparent ${sweepX + 15}%)`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: interpolate(frame, [0, fps], [0, 0.34], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: "0.2em",
            color: BRASS,
            textTransform: "uppercase",
          }}
        >
          {locale === "fr"
            ? "Calibre Praedixa · Temps utile · Précision décisionnelle"
            : "Praedixa Calibre · Useful Time · Decision Precision"}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          pointerEvents: "none",
          boxShadow: "inset 0 0 75px 10px rgba(0,0,0,0.6)",
          mixBlendMode: "multiply",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 50%, transparent 42%, ${INK} 74%)`,
        }}
      />
    </div>
  );
};
