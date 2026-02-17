import { interpolate, useCurrentFrame } from "remotion";
import { Database, FileUp, ShieldCheck, TriangleAlert } from "lucide-react";
import { colors } from "../../tokens";
import { ActionButton, Card, PageFrame, TinyBadge } from "./view-primitives";

const datasets = [
  {
    name: "planning-sites-16-02.csv",
    lines: "2 930",
    quality: "98.7%",
    status: "Valide",
  },
  {
    name: "absences-hebdo.xlsx",
    lines: "1 120",
    quality: "95.9%",
    status: "A verifier",
  },
  {
    name: "capacite-interim.json",
    lines: "480",
    quality: "99.3%",
    status: "Valide",
  },
  {
    name: "contrats-trimestre.csv",
    lines: "7 842",
    quality: "97.1%",
    status: "Valide",
  },
];

export const DonneesDatasetsView: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <PageFrame
      eyebrow="Donnees"
      title="Fichiers importes"
      subtitle="Centralisez les jeux de donnees operationnels, suivez la qualite d'ingestion et corrigez les anomalies avant projection."
      actions={
        <>
          <ActionButton label="Controle qualite" />
          <ActionButton label="Importer un dataset" tone="primary" />
        </>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1.35fr",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Sante du pipeline">
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
                    Integrite globale
                  </div>
                  <div
                    style={{ fontSize: 20, color: colors.ink, fontWeight: 700 }}
                  >
                    97.9%
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
                <TriangleAlert size={15} color={colors.warning} />
                <div>
                  <div style={{ fontSize: 11, color: colors.inkTertiary }}>
                    Alertes qualite
                  </div>
                  <div
                    style={{ fontSize: 20, color: colors.ink, fontWeight: 700 }}
                  >
                    3
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Upload rapide">
            <div
              style={{
                borderRadius: 10,
                border: `1px dashed ${colors.borderHover}`,
                backgroundColor: "oklch(0.975 0.005 85 / 0.45)",
                minHeight: 112,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <FileUp size={18} color={colors.primary} />
              <div style={{ fontSize: 12, color: colors.inkSecondary }}>
                Glisser/deposer un fichier CSV, XLSX ou JSON
              </div>
              <TinyBadge
                label="Derniere importation: il y a 5 min"
                tone="neutral"
              />
            </div>
          </Card>
        </div>

        <Card title="Datasets disponibles" padding="10px 12px">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr .7fr .7fr .8fr",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {["Fichier", "Lignes", "Qualite", "Statut"].map((label) => (
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
            {datasets.map((dataset, index) => {
              const rowIn = interpolate(
                frame,
                [8 + index * 5, 20 + index * 5],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              );
              const warning = dataset.status === "A verifier";
              return (
                <div
                  key={dataset.name}
                  style={{
                    opacity: rowIn,
                    transform: `translateX(${(1 - rowIn) * 10}px)`,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.cardBg,
                    padding: "10px 10px",
                    display: "grid",
                    gridTemplateColumns: "1.5fr .7fr .7fr .8fr",
                    gap: 8,
                    alignItems: "center",
                    fontSize: 12,
                    color: colors.inkSecondary,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <Database size={13} color={colors.primary} />
                    <span
                      style={{
                        color: colors.ink,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dataset.name}
                    </span>
                  </span>
                  <span>{dataset.lines}</span>
                  <span>{dataset.quality}</span>
                  <TinyBadge
                    label={dataset.status}
                    tone={warning ? "warning" : "success"}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </PageFrame>
  );
};
