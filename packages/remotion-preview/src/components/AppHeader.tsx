import { interpolate } from "remotion";
import {
  Bell,
  Building2,
  ChevronRight,
  Clock3,
  Globe2,
  Languages,
  PanelLeft,
  Rows3,
  Search,
  SunMoon,
} from "lucide-react";
import { colors, fonts, layout, shadows } from "../tokens";

interface AppHeaderProps {
  frame: number;
  breadcrumbs: string[];
  dateLabel: string;
  updatedAtLabel: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  frame,
  breadcrumbs,
  dateLabel,
  updatedAtLabel,
}) => {
  const fadeIn = interpolate(frame, [5, 22], [0, 1], {
    extrapolateRight: "clamp",
  });
  const shellWidth = layout.logicalWidth - layout.sidebarWidth;
  const contentWidth = Math.min(
    layout.maxPageWidth,
    shellWidth - layout.pagePaddingX * 2,
  );

  return (
    <div style={{ opacity: fadeIn, fontFamily: fonts.sans }}>
      <div
        style={{
          height: layout.topbarHeight,
          borderBottom: `1px solid ${colors.borderSubtle}`,
          background: "oklch(0.998 0.001 85 / 0.85)",
          backdropFilter: "blur(20px) saturate(1.4)",
          boxShadow: shadows.raised,
        }}
      >
        <div
          style={{
            width: contentWidth,
            margin: "0 auto",
            padding: "0 2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {breadcrumbs.map((crumb, index) => (
              <div
                key={`${crumb}-${index}`}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                {index > 0 ? (
                  <ChevronRight size={12} color={colors.inkPlaceholder} />
                ) : null}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: index === breadcrumbs.length - 1 ? 600 : 500,
                    color:
                      index === breadcrumbs.length - 1
                        ? colors.ink
                        : colors.inkTertiary,
                  }}
                >
                  {crumb}
                </span>
              </div>
            ))}
            <span
              style={{ fontSize: 12, color: colors.inkTertiary, marginLeft: 6 }}
            >
              {dateLabel}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                height: 34,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: "oklch(0.975 0.005 85 / 0.5)",
                padding: "0 11px",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                minWidth: 220,
                fontSize: 12,
                color: colors.inkPlaceholder,
              }}
            >
              <Search size={14} />
              <span style={{ flex: 1 }}>Rechercher...</span>
              <span
                style={{
                  borderRadius: 4,
                  border: `1px solid ${colors.border}`,
                  padding: "1px 6px",
                  fontSize: 10,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontWeight: 600,
                  color: colors.inkSecondary,
                }}
              >
                ⌘K
              </span>
            </div>

            <div
              style={{
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: "oklch(0.96 0.004 80 / 0.7)",
                padding: 2,
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <button
                style={{
                  border: 0,
                  borderRadius: 6,
                  backgroundColor: colors.cardBg,
                  color: colors.ink,
                  height: 28,
                  padding: "0 9px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <Rows3 size={13} />
                Compact
              </button>
              <button
                style={{
                  border: 0,
                  borderRadius: 6,
                  backgroundColor: "transparent",
                  color: colors.inkTertiary,
                  height: 28,
                  padding: "0 9px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <PanelLeft size={13} />
                Confort
              </button>
            </div>

            <button
              style={{
                width: 36,
                height: 36,
                border: 0,
                borderRadius: 8,
                backgroundColor: "transparent",
                color: colors.inkTertiary,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Notifications"
            >
              <Bell size={16} />
            </button>

            <button
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: "oklch(0.998 0.001 85)",
                color: colors.inkTertiary,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Theme"
            >
              <SunMoon size={15} />
            </button>

            <button
              style={{
                height: 30,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surfaceElevated,
                color: colors.ink,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                padding: "0 9px",
              }}
              aria-label="Langue"
            >
              <Languages size={14} color={colors.inkTertiary} />
              FR
            </button>

            <span
              style={{
                width: 1,
                height: 20,
                backgroundColor: colors.border,
                margin: "0 2px",
              }}
              aria-hidden="true"
            />

            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                color: "white",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                boxShadow: shadows.premiumGlow,
              }}
            >
              M
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          height: layout.contextBarHeight,
          borderBottom: `1px solid ${colors.borderSubtle}`,
          background: "oklch(0.96 0.004 80 / 0.55)",
        }}
      >
        <div
          style={{
            width: contentWidth,
            margin: "0 auto",
            padding: "0 2px",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div
            style={{
              borderRadius: 999,
              backgroundColor: colors.cardBg,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              fontSize: 11,
              color: colors.inkSecondary,
            }}
          >
            <Building2 size={13} color={colors.primary} />
            <strong style={{ color: colors.ink, fontWeight: 600 }}>
              Tenant:
            </strong>
            Praedixa Corporate
          </div>
          <div
            style={{
              borderRadius: 999,
              backgroundColor: colors.cardBg,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              fontSize: 11,
              color: colors.inkSecondary,
            }}
          >
            <Globe2 size={13} color={colors.info} />
            <strong style={{ color: colors.ink, fontWeight: 600 }}>
              Environment:
            </strong>
            Production
          </div>
          <div
            style={{
              borderRadius: 999,
              backgroundColor: colors.cardBg,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              fontSize: 11,
              color: colors.inkSecondary,
            }}
          >
            <Clock3 size={13} color={colors.warning} />
            <strong style={{ color: colors.ink, fontWeight: 600 }}>
              Timezone:
            </strong>
            Europe/Paris
          </div>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: colors.inkTertiary,
            }}
          >
            Derniere sync: {updatedAtLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
