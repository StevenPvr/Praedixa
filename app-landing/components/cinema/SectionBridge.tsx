interface SectionBridgeProps {
  from: string;
  to: string;
  height?: number;
  flip?: boolean;
}

export function SectionBridge({
  from,
  to,
  height = 80,
  flip = false,
}: SectionBridgeProps) {
  const gradientId = `bridge-${from}-${to}-${height}-${flip ? "flip" : "base"}`
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase();

  const wave = flip
    ? `M0,0 L0,${height * 0.6} Q${50},${height} ${100},${height * 0.6} L100,0 Z`
    : `M0,${height} L0,${height * 0.4} Q50,0 100,${height * 0.4} L100,${height} Z`;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height, marginTop: -1, marginBottom: -1 }}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        style={{
          animation: "bridge-breathe 8s ease-in-out infinite",
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <rect width="100" height={height} fill={to} />
        <path d={wave} fill={`url(#${gradientId})`} />
      </svg>
    </div>
  );
}
