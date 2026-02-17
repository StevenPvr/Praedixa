import { interpolate } from "remotion";
import {
  ChevronLeft,
  Clock3,
  Database,
  FileBarChart,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { colors, fonts, layout, shadows } from "../tokens";

type SidebarGroup =
  | "pilotage"
  | "donnees"
  | "anticipation"
  | "traitement"
  | "support";

export type SidebarItemId =
  | "dashboard"
  | "donnees"
  | "previsions"
  | "actions"
  | "messages"
  | "rapports"
  | "parametres";

export type SidebarChildId =
  | "donnees-sites"
  | "donnees-datasets"
  | "donnees-canonique"
  | "previsions-vue"
  | "previsions-alertes"
  | "actions-traitement"
  | "actions-historique";

type SidebarItem = {
  id: SidebarItemId;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  group: SidebarGroup;
  accent: string;
  badge?: number;
  children?: Array<{ id: SidebarChildId; label: string }>;
};

const items: SidebarItem[] = [
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    group: "pilotage",
    accent: "oklch(0.70 0.14 82)",
  },
  {
    id: "donnees",
    label: "Donnees operationnelles",
    icon: Database,
    group: "donnees",
    accent: "oklch(0.60 0.16 245)",
    children: [
      { id: "donnees-sites", label: "Mes sites" },
      { id: "donnees-datasets", label: "Fichiers importes" },
      { id: "donnees-canonique", label: "Donnees consolidees" },
    ],
  },
  {
    id: "previsions",
    label: "Anticipation",
    icon: TrendingUp,
    group: "anticipation",
    accent: "oklch(0.60 0.18 300)",
    children: [
      { id: "previsions-vue", label: "Vue par site" },
      { id: "previsions-alertes", label: "Toutes les alertes" },
    ],
  },
  {
    id: "actions",
    label: "Traitement",
    icon: Zap,
    group: "traitement",
    accent: "oklch(0.62 0.18 35)",
    badge: 3,
    children: [
      { id: "actions-traitement", label: "Alertes a traiter" },
      { id: "actions-historique", label: "Decisions passees" },
    ],
  },
  {
    id: "messages",
    label: "Support",
    icon: MessageSquare,
    group: "support",
    accent: "oklch(0.58 0.11 180)",
    badge: 2,
  },
  {
    id: "rapports",
    label: "Rapports",
    icon: FileBarChart,
    group: "support",
    accent: "oklch(0.48 0.06 240)",
  },
  {
    id: "parametres",
    label: "Reglages",
    icon: Settings,
    group: "support",
    accent: "oklch(0.58 0.01 240)",
  },
];

const groupLabels: Record<SidebarGroup, string> = {
  pilotage: "Pilotage",
  donnees: "Donnees",
  anticipation: "Anticipation",
  traitement: "Traitement",
  support: "Support & gouvernance",
};

const groupOrder: SidebarGroup[] = [
  "pilotage",
  "donnees",
  "anticipation",
  "traitement",
  "support",
];

interface SidebarProps {
  frame: number;
  activeItemId: SidebarItemId;
  activeChildId?: SidebarChildId;
  expandedItemIds?: SidebarItemId[];
}

function LogoMark() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        stroke={colors.primary}
        strokeWidth="2"
      />
      <line
        x1="18"
        y1="16"
        x2="18"
        y2="48"
        stroke={colors.primary}
        strokeWidth="3"
      />
      <line
        x1="18"
        y1="16"
        x2="38"
        y2="16"
        stroke={colors.primary}
        strokeWidth="3"
      />
      <line
        x1="38"
        y1="16"
        x2="38"
        y2="29"
        stroke={colors.primary}
        strokeWidth="3"
      />
      <line
        x1="38"
        y1="29"
        x2="18"
        y2="29"
        stroke={colors.primary}
        strokeWidth="3"
      />
      <circle cx="50" cy="42" r="4" fill={colors.primary} />
    </svg>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({
  frame,
  activeItemId,
  activeChildId,
  expandedItemIds,
}) => {
  const slideIn = interpolate(frame, [0, 16], [-layout.sidebarWidth, 0], {
    extrapolateRight: "clamp",
  });
  const expanded = new Set<SidebarItemId>(expandedItemIds ?? [activeItemId]);

  return (
    <aside
      style={{
        width: layout.sidebarWidth,
        height: "100%",
        backgroundColor: colors.sidebarBg,
        borderRight: `1px solid ${colors.sidebarBorder}`,
        display: "flex",
        flexDirection: "column",
        transform: `translateX(${slideIn}px)`,
        fontFamily: fonts.sans,
        boxShadow: shadows.raised,
      }}
    >
      <div
        style={{
          height: 2,
          width: "100%",
          background:
            "linear-gradient(to right, oklch(0.68 0.13 72), oklch(0.68 0.13 72 / 0.65), transparent)",
        }}
      />

      <div
        style={{
          height: layout.topbarHeight,
          borderBottom: `1px solid ${colors.sidebarBorder}`,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LogoMark />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: colors.sidebarText,
                lineHeight: 1.05,
              }}
            >
              Praedixa
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: colors.sidebarMuted,
              }}
            >
              Client Workspace
            </div>
          </div>
        </div>
      </div>

      <nav
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {groupOrder.map((group, groupIndex) => {
          const sectionItems = items.filter((item) => item.group === group);
          return (
            <section
              key={group}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div
                style={{
                  padding: "0 12px",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: colors.sidebarMuted,
                  fontWeight: 600,
                }}
              >
                {groupLabels[group]}
              </div>

              {sectionItems.map((item, itemIndex) => {
                const rowIn = interpolate(
                  frame,
                  [
                    8 + groupIndex * 5 + itemIndex * 3,
                    24 + groupIndex * 5 + itemIndex * 3,
                  ],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                );
                const itemActive = item.id === activeItemId;
                const hasActiveChild = item.children?.some(
                  (child) => child.id === activeChildId,
                );
                const Icon = item.icon;
                const open = Boolean(
                  item.children && (expanded.has(item.id) || itemActive),
                );

                return (
                  <div
                    key={item.id}
                    style={{
                      opacity: rowIn,
                      transform: `translateY(${(1 - rowIn) * 6}px)`,
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        borderRadius: 8,
                        backgroundColor:
                          itemActive || hasActiveChild
                            ? colors.sidebarBgActive
                            : "transparent",
                        color:
                          itemActive || hasActiveChild
                            ? colors.sidebarText
                            : colors.sidebarMuted,
                        minHeight: 44,
                        display: "flex",
                        alignItems: "center",
                        padding: "0 12px",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 4,
                          top: 10,
                          bottom: 10,
                          width: 4,
                          borderRadius: 999,
                          backgroundColor: item.accent,
                          opacity: itemActive || hasActiveChild ? 1 : 0,
                        }}
                      />
                      <Icon
                        size={17}
                        color={
                          itemActive || hasActiveChild
                            ? colors.sidebarText
                            : colors.sidebarMuted
                        }
                      />
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 13,
                          fontWeight: itemActive || hasActiveChild ? 600 : 500,
                        }}
                      >
                        {item.label}
                      </span>

                      {item.badge ? (
                        <span
                          style={{
                            borderRadius: 999,
                            minWidth: 18,
                            padding: "2px 7px",
                            textAlign: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            color:
                              item.id === "actions"
                                ? colors.dangerText
                                : colors.primary,
                            backgroundColor:
                              item.id === "actions"
                                ? colors.dangerLight
                                : "oklch(0.68 0.13 72 / 0.15)",
                          }}
                        >
                          {item.badge}
                        </span>
                      ) : item.id === "dashboard" || item.id === "actions" ? (
                        <Star
                          size={12}
                          color={colors.primary}
                          fill={colors.primary}
                        />
                      ) : null}
                    </div>

                    {open ? (
                      <div
                        style={{
                          marginTop: 2,
                          marginLeft: 40,
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        {item.children?.map((child) => {
                          const childActive = child.id === activeChildId;
                          return (
                            <div
                              key={child.id}
                              style={{
                                borderRadius: 6,
                                padding: "6px 8px",
                                fontSize: 12,
                                color: childActive
                                  ? colors.sidebarText
                                  : colors.sidebarMuted,
                                backgroundColor: childActive
                                  ? "oklch(0.94 0.04 82 / 0.8)"
                                  : "transparent",
                              }}
                            >
                              {child.label}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          );
        })}

        <div
          style={{
            height: 1,
            margin: "6px 0",
            background:
              "linear-gradient(to right, transparent, oklch(0.68 0.13 72 / 0.15), oklch(0.87 0.008 65), oklch(0.68 0.13 72 / 0.15), transparent)",
          }}
        />

        <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              padding: "0 12px",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: colors.sidebarMuted,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Star size={12} />
            Favoris
          </div>
          <div
            style={{
              marginLeft: 12,
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 12,
              color:
                activeItemId === "dashboard"
                  ? colors.sidebarText
                  : colors.sidebarMuted,
              backgroundColor:
                activeItemId === "dashboard"
                  ? "oklch(0.94 0.04 82 / 0.8)"
                  : "transparent",
            }}
          >
            Tableau de bord
          </div>
          <div
            style={{
              marginLeft: 12,
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 12,
              color:
                activeItemId === "actions"
                  ? colors.sidebarText
                  : colors.sidebarMuted,
              backgroundColor:
                activeItemId === "actions"
                  ? "oklch(0.94 0.04 82 / 0.8)"
                  : "transparent",
            }}
          >
            Traitement
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              padding: "0 12px",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: colors.sidebarMuted,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Clock3 size={12} />
            Recents
          </div>
          <div
            style={{ marginLeft: 12, fontSize: 12, color: colors.sidebarMuted }}
          >
            Alertes a traiter
          </div>
          <div
            style={{ marginLeft: 12, fontSize: 12, color: colors.sidebarMuted }}
          >
            Toutes les alertes
          </div>
        </section>
      </nav>

      <div
        style={{ borderTop: `1px solid ${colors.sidebarBorder}`, padding: 12 }}
      >
        <button
          style={{
            width: "100%",
            height: 36,
            border: 0,
            borderRadius: 8,
            backgroundColor: "transparent",
            color: colors.sidebarMuted,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <ChevronLeft size={14} />
          Reduire le menu
        </button>
      </div>
    </aside>
  );
};
