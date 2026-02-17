import { interpolate, useCurrentFrame } from "remotion";
import { ArrowRight, CircleDashed, ShieldAlert, Zap } from "lucide-react";
import { colors } from "../../tokens";
import { ActionButton, Card, PageFrame, TinyBadge } from "./view-primitives";

const queue = [
  {
    id: "A-2194",
    site: "Site 105",
    gap: "4.2h",
    impact: "5 200 EUR",
    urgency: "2h",
  },
  {
    id: "A-2191",
    site: "Site 212",
    gap: "3.8h",
    impact: "4 100 EUR",
    urgency: "6h",
  },
  {
    id: "A-2189",
    site: "Site 031",
    gap: "2.1h",
    impact: "1 900 EUR",
    urgency: "14h",
  },
];

export const ActionsTraitementView: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <PageFrame
      eyebrow="Traitement"
      title="Alertes a traiter"
      subtitle="Priorisez les arbitrages, comparez les options de couverture et validez les decisions avant rupture."
      actions={
        <>
          <ActionButton label="Ouvrir diagnostic complet" />
          <ActionButton label="Valider la solution proposee" tone="primary" />
        </>
      }
    >
      <div
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}
      >
        <Card title="File prioritaire">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {queue.map((item, index) => {
              const rowIn = interpolate(
                frame,
                [8 + index * 7, 24 + index * 7],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              );
              const critical = index === 0;
              return (
                <div
                  key={item.id}
                  style={{
                    opacity: rowIn,
                    transform: `translateY(${(1 - rowIn) * 8}px)`,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    borderLeft: `3px solid ${critical ? colors.danger : colors.warning}`,
                    backgroundColor: colors.cardBg,
                    padding: "11px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: critical
                          ? colors.dangerLight
                          : colors.warningLight,
                        color: critical ? colors.danger : colors.warning,
                      }}
                    >
                      <Zap size={15} />
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          color: colors.ink,
                          fontWeight: 600,
                        }}
                      >
                        {item.id} · {item.site}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: colors.inkTertiary,
                          marginTop: 2,
                        }}
                      >
                        Gap {item.gap} · Impact {item.impact} · Rupture{" "}
                        {item.urgency}
                      </div>
                    </div>
                  </div>
                  <TinyBadge
                    label={critical ? "Critique" : "Elevee"}
                    tone={critical ? "danger" : "warning"}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Diagnostic en cours">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  borderRadius: 10,
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: colors.surfaceElevated,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 11, color: colors.inkTertiary }}>
                  Option A
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: colors.ink,
                    fontWeight: 600,
                    marginTop: 3,
                  }}
                >
                  Renfort interne + permutation d'equipe
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: colors.inkSecondary,
                    marginTop: 3,
                  }}
                >
                  Cout estime: 1 250 EUR · Couverture 92%
                </div>
              </div>
              <div
                style={{
                  borderRadius: 10,
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: colors.surfaceElevated,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 11, color: colors.inkTertiary }}>
                  Option B
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: colors.ink,
                    fontWeight: 600,
                    marginTop: 3,
                  }}
                >
                  Interim + heures supplementaires
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: colors.inkSecondary,
                    marginTop: 3,
                  }}
                >
                  Cout estime: 1 980 EUR · Couverture 98%
                </div>
              </div>
            </div>
          </Card>

          <Card title="Decision recommandee">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShieldAlert size={16} color={colors.success} />
              <div style={{ fontSize: 12, color: colors.inkSecondary }}>
                Selectionner Option A pour minimiser le cout tout en evitant la
                rupture.
              </div>
            </div>
            <div
              style={{
                marginTop: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ActionButton label="Valider Option A" tone="primary" />
              <ArrowRight size={14} color={colors.inkPlaceholder} />
              <TinyBadge label="Transmission vers historique" tone="success" />
            </div>
            <div
              style={{
                marginTop: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: colors.inkTertiary,
              }}
            >
              <CircleDashed size={12} />
              Journalisation automatique des impacts et hypothese de risque.
            </div>
          </Card>
        </div>
      </div>
    </PageFrame>
  );
};
