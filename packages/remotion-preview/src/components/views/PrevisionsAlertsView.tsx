import { interpolate, useCurrentFrame } from "remotion";
import { AlertTriangle, Gauge, Search, ShieldAlert } from "lucide-react";
import { colors } from "../../tokens";
import { ActionButton, Card, PageFrame, TinyBadge } from "./view-primitives";

const alerts = [
  {
    site: "Site 105",
    shift: "Matin",
    horizon: "J3",
    risk: "87%",
    severity: "Critique",
  },
  {
    site: "Site 212",
    shift: "Nuit",
    horizon: "J7",
    risk: "72%",
    severity: "Critique",
  },
  {
    site: "Site 031",
    shift: "Apres-midi",
    horizon: "J7",
    risk: "58%",
    severity: "Elevee",
  },
  {
    site: "Site 087",
    shift: "Matin",
    horizon: "J14",
    risk: "41%",
    severity: "Elevee",
  },
  {
    site: "Site 099",
    shift: "Nuit",
    horizon: "J14",
    risk: "36%",
    severity: "Moderee",
  },
];

export const PrevisionsAlertsView: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <PageFrame
      eyebrow="Anticipation"
      title="Toutes les alertes"
      subtitle="Filtrez les signaux de rupture, analysez le niveau de risque et priorisez les sujets a transmettre au centre de traitement."
      actions={
        <>
          <ActionButton label="Exporter la liste" />
          <ActionButton label="Creer une vue partagee" tone="primary" />
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
        <Card
          title="File des alertes previsionnelles"
          action={
            <div
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <TinyBadge label="Criticite: Haute" tone="warning" />
              <div
                style={{
                  height: 30,
                  minWidth: 180,
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: "oklch(0.97 0.05 255 / 0.58)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "0 10px",
                  fontSize: 11,
                  color: colors.inkPlaceholder,
                }}
              >
                <Search size={13} />
                Rechercher un site...
              </div>
            </div>
          }
          padding="12px 12px 10px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((alert, index) => {
              const rowIn = interpolate(
                frame,
                [8 + index * 6, 22 + index * 6],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              );
              const critical = alert.severity === "Critique";
              const high = alert.severity === "Elevee";
              return (
                <div
                  key={`${alert.site}-${alert.shift}`}
                  style={{
                    opacity: rowIn,
                    transform: `translateX(${(1 - rowIn) * 12}px)`,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    borderLeft: `3px solid ${critical ? colors.danger : high ? colors.warning : colors.info}`,
                    backgroundColor: colors.cardBg,
                    padding: "10px 12px",
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
                      {critical ? (
                        <AlertTriangle size={15} />
                      ) : (
                        <ShieldAlert size={15} />
                      )}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: colors.ink,
                        }}
                      >
                        {alert.site} · {alert.shift}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: colors.inkTertiary,
                          marginTop: 2,
                        }}
                      >
                        Horizon {alert.horizon} · Risque rupture {alert.risk}
                      </div>
                    </div>
                  </div>
                  <TinyBadge
                    label={alert.severity}
                    tone={critical ? "danger" : high ? "warning" : "neutral"}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Synthese live">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: "oklch(0.98 0.03 90 / 0.45)",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: colors.dangerText,
                    fontWeight: 600,
                  }}
                >
                  2 alertes critiques &lt; 24h
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: colors.dangerText,
                    marginTop: 3,
                  }}
                >
                  Priorite immediate: basculer vers Traitement.
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
                  gap: 10,
                }}
              >
                <Gauge size={16} color={colors.warning} />
                <div>
                  <div style={{ fontSize: 11, color: colors.inkTertiary }}>
                    Indice de pression
                  </div>
                  <div
                    style={{ fontSize: 18, color: colors.ink, fontWeight: 700 }}
                  >
                    78 / 100
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Actions conseillees">
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                color: colors.inkSecondary,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              <li>Confirmer les sites exposes avant 24h.</li>
              <li>Prioriser les ruptures a impact financier.</li>
              <li>Ouvrir les options de remplacement.</li>
            </ul>
          </Card>
        </div>
      </div>
    </PageFrame>
  );
};
