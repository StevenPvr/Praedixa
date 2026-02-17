import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors, fonts, layout, shadows } from "../../tokens";

interface PageFrameProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageFrame: React.FC<PageFrameProps> = ({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 16], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: fade,
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
            {eyebrow}
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
                  fontSize: 42,
                  lineHeight: 1.04,
                  letterSpacing: "-0.02em",
                  color: colors.ink,
                }}
              >
                {title}
              </h1>
              <p
                style={{
                  marginTop: 8,
                  marginBottom: 0,
                  maxWidth: 780,
                  fontSize: 15,
                  lineHeight: 1.5,
                  color: colors.inkSecondary,
                }}
              >
                {subtitle}
              </p>
            </div>
            {actions ? (
              <div style={{ display: "inline-flex", gap: 10 }}>{actions}</div>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const Card: React.FC<{
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  padding?: string;
}> = ({ title, action, children, padding = "16px" }) => {
  return (
    <section
      style={{
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.cardBg,
        boxShadow: shadows.raised,
        overflow: "hidden",
      }}
    >
      {title ? (
        <>
          <div
            style={{
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 15, color: colors.ink, fontWeight: 700 }}>
              {title}
            </div>
            {action ?? null}
          </div>
          <div
            style={{
              height: 1,
              background:
                "linear-gradient(to right, transparent, oklch(0.68 0.13 72 / 0.15), oklch(0.87 0.008 65), oklch(0.68 0.13 72 / 0.15), transparent)",
            }}
          />
        </>
      ) : null}
      <div style={{ padding }}>{children}</div>
    </section>
  );
};

export const TinyBadge: React.FC<{
  label: string;
  tone?: "neutral" | "danger" | "warning" | "success";
}> = ({ label, tone = "neutral" }) => {
  const styles: Record<string, { color: string; bg: string }> = {
    neutral: { color: colors.inkSecondary, bg: "oklch(0.96 0.004 80 / 0.85)" },
    warning: { color: colors.warningText, bg: colors.warningLight },
    danger: { color: colors.dangerText, bg: colors.dangerLight },
    success: { color: colors.successText, bg: colors.successLight },
  };
  return (
    <span
      style={{
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        color: styles[tone].color,
        backgroundColor: styles[tone].bg,
      }}
    >
      {label}
    </span>
  );
};

export const ActionButton: React.FC<{
  label: string;
  tone?: "default" | "primary";
}> = ({ label, tone = "default" }) => {
  const primary = tone === "primary";
  return (
    <button
      style={{
        height: 38,
        borderRadius: 10,
        border: primary ? 0 : `1px solid ${colors.border}`,
        background: primary
          ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
          : colors.cardBg,
        color: primary ? "white" : colors.inkSecondary,
        padding: "0 13px",
        display: "inline-flex",
        alignItems: "center",
        fontSize: 12,
        fontWeight: 600,
        boxShadow: primary ? shadows.premiumGlow : "none",
      }}
    >
      {label}
    </button>
  );
};
