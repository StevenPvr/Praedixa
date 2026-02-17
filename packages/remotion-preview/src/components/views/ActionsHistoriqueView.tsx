import { interpolate, useCurrentFrame } from "remotion";
import { History, ShieldCheck, TrendingDown } from "lucide-react";
import { colors } from "../../tokens";
import { ActionButton, Card, PageFrame, TinyBadge } from "./view-primitives";

const historyRows = [
  {
    date: "16 fev 22:50",
    site: "Site 105",
    decision: "Option A",
    impact: "1 250 EUR",
    outcome: "Rupture evitee",
  },
  {
    date: "16 fev 19:10",
    site: "Site 212",
    decision: "Option B",
    impact: "1 980 EUR",
    outcome: "Stabilise",
  },
  {
    date: "16 fev 16:30",
    site: "Site 031",
    decision: "Option A",
    impact: "860 EUR",
    outcome: "Sous controle",
  },
  {
    date: "16 fev 13:05",
    site: "Site 087",
    decision: "Option A",
    impact: "740 EUR",
    outcome: "Sous controle",
  },
];

export const ActionsHistoriqueView: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <PageFrame
      eyebrow="Traitement"
      title="Decisions passees"
      subtitle="Consultez la trace des arbitrages valides, leurs impacts et le resultat operationnel constate."
      actions={
        <>
          <ActionButton label="Filtrer par site" />
          <ActionButton label="Exporter le journal" tone="primary" />
        </>
      }
    >
      <div
        style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 18 }}
      >
        <Card title="Journal de decision" padding="10px 12px">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {["Date", "Site", "Decision", "Impact", "Resultat"].map((label) => (
              <div
                key={label}
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: colors.inkTertiary,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {historyRows.map((row, index) => {
              const rowIn = interpolate(
                frame,
                [6 + index * 5, 20 + index * 5],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              );
              return (
                <div
                  key={`${row.date}-${row.site}`}
                  style={{
                    opacity: rowIn,
                    transform: `translateY(${(1 - rowIn) * 8}px)`,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.cardBg,
                    padding: "10px 10px",
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr",
                    gap: 8,
                    alignItems: "center",
                    fontSize: 12,
                    color: colors.inkSecondary,
                  }}
                >
                  <span>{row.date}</span>
                  <span style={{ color: colors.ink }}>{row.site}</span>
                  <span style={{ color: colors.ink }}>{row.decision}</span>
                  <span>{row.impact}</span>
                  <TinyBadge
                    label={row.outcome}
                    tone={index === 0 ? "success" : "neutral"}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Performance decisionnelle">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  borderRadius: 10,
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: colors.surfaceElevated,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ShieldCheck size={15} color={colors.success} />
                <div>
                  <div style={{ fontSize: 11, color: colors.inkTertiary }}>
                    Ruptures evitees
                  </div>
                  <div
                    style={{ fontSize: 20, color: colors.ink, fontWeight: 700 }}
                  >
                    94%
                  </div>
                </div>
              </div>
              <div
                style={{
                  borderRadius: 10,
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: colors.surfaceElevated,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TrendingDown size={15} color={colors.warning} />
                <div>
                  <div style={{ fontSize: 11, color: colors.inkTertiary }}>
                    Cout moyen / decision
                  </div>
                  <div
                    style={{ fontSize: 20, color: colors.ink, fontWeight: 700 }}
                  >
                    1 207 EUR
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Conformite & audit">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: colors.inkSecondary,
              }}
            >
              <History size={14} color={colors.info} />
              Historique horodate, exportable et aligne avec la gouvernance.
            </div>
          </Card>
        </div>
      </div>
    </PageFrame>
  );
};
