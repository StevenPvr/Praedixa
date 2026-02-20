import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export type MouseAction = "move" | "click" | "scroll";

export type MouseKeyframe = {
  frame: number;
  x: number;
  y: number;
  action?: MouseAction;
};

interface MouseActorProps {
  keyframes: MouseKeyframe[];
  visibleFrom: number;
  visibleTo: number;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function resolvePosition(
  frame: number,
  keyframes: MouseKeyframe[],
): { x: number; y: number } {
  if (keyframes.length === 0) {
    return { x: 0, y: 0 };
  }
  if (frame <= keyframes[0].frame) {
    return { x: keyframes[0].x, y: keyframes[0].y };
  }
  for (let index = 0; index < keyframes.length - 1; index++) {
    const current = keyframes[index];
    const next = keyframes[index + 1];
    if (frame >= current.frame && frame <= next.frame) {
      const rawT = (frame - current.frame) / (next.frame - current.frame || 1);
      const t = smoothstep(rawT);
      return {
        x: current.x + (next.x - current.x) * t,
        y: current.y + (next.y - current.y) * t,
      };
    }
  }
  const last = keyframes[keyframes.length - 1];
  return { x: last.x, y: last.y };
}

export const MouseActor: React.FC<MouseActorProps> = ({
  keyframes,
  visibleFrom,
  visibleTo,
}) => {
  const frame = useCurrentFrame();
  const visible = frame >= visibleFrom && frame <= visibleTo;
  const position = resolvePosition(frame, keyframes);

  let clickPulse = 0;
  let scrollNudge = 0;
  for (const keyframe of keyframes) {
    if (keyframe.action === "click") {
      const pulse = interpolate(
        frame,
        [keyframe.frame, keyframe.frame + 3, keyframe.frame + 14],
        [0, 1, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        },
      );
      clickPulse = Math.max(clickPulse, pulse);
    }
    if (keyframe.action === "scroll") {
      const nudge = interpolate(
        frame,
        [keyframe.frame - 6, keyframe.frame, keyframe.frame + 10],
        [0, 10, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        },
      );
      scrollNudge = Math.max(scrollNudge, nudge);
    }
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: visible ? 1 : 0 }}>
      <div
        style={{
          position: "absolute",
          left: position.x,
          top: position.y - scrollNudge,
          transform: "translate(-4px, -2px)",
          zIndex: 80,
        }}
      >
        <svg
          width={28}
          height={36}
          viewBox="0 0 28 36"
          fill="none"
          style={{
            filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35))",
          }}
        >
          <path
            d="M3 2 L3 30 L9.8 23.7 L14.8 34 L19 31.9 L14 21.9 L23.8 21.9 Z"
            fill="white"
            stroke="oklch(0.22 0.02 255)"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>

        <div
          style={{
            position: "absolute",
            left: 5,
            top: 6,
            width: 26,
            height: 26,
            borderRadius: "999px",
            border: "2px solid oklch(0.63 0.145 247 / 0.78)",
            transform: `scale(${0.7 + clickPulse * 0.8})`,
            opacity: clickPulse,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
