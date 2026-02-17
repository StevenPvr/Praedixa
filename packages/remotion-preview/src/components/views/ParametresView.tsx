import { interpolate, useCurrentFrame } from "remotion";
import { Bell, Globe2, Lock, Save, SlidersHorizontal } from "lucide-react";
import { colors } from "../../tokens";
import { ActionButton, Card, PageFrame, TinyBadge } from "./view-primitives";

function Toggle({
  label,
  description,
  enabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.cardBg,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: colors.ink, fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: colors.inkTertiary, marginTop: 2 }}>
          {description}
        </div>
      </div>
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          backgroundColor: enabled ? colors.primary : "oklch(0.90 0.006 70)",
          position: "relative",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: enabled ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: 999,
            backgroundColor: "white",
          }}
        />
      </div>
    </div>
  );
}

export const ParametresView: React.FC = () => {
  const frame = useCurrentFrame();
  const panelIn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <PageFrame
      eyebrow="Reglages"
      title="Parametres de l'espace de travail"
      subtitle="Ajustez les preferences de navigation, notifications et securite pour votre usage quotidien."
      actions={
        <>
          <ActionButton label="Annuler" />
          <ActionButton label="Enregistrer" tone="primary" />
        </>
      }
    >
      <div
        style={{
          opacity: panelIn,
          transform: `translateY(${(1 - panelIn) * 8}px)`,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        <Card title="Preferences interface">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: colors.inkSecondary,
              }}
            >
              <SlidersHorizontal size={14} color={colors.primary} />
              Densite, vues favorites et ordre de navigation
            </div>
            <Toggle
              label="Mode compact"
              description="Affiche davantage d'informations par ecran."
              enabled={true}
            />
            <Toggle
              label="Conserver les filtres"
              description="Restaure les filtres utilises a la session precedente."
              enabled={true}
            />
          </div>
        </Card>

        <Card title="Notifications">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: colors.inkSecondary,
              }}
            >
              <Bell size={14} color={colors.warning} />
              Alertes critiques, digest quotidien, escalation manager
            </div>
            <Toggle
              label="Alertes critiques immediates"
              description="Push instantane quand rupture probable < 24h."
              enabled={true}
            />
            <Toggle
              label="Digest fin de journee"
              description="Resume des decisions et impacts a 18h."
              enabled={false}
            />
          </div>
        </Card>

        <Card title="Regionalisation">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: colors.inkSecondary,
              }}
            >
              <Globe2 size={14} color={colors.info} />
              Fuseau: Europe/Paris · Langue: FR
            </div>
            <TinyBadge label="Production" tone="neutral" />
          </div>
        </Card>

        <Card title="Securite">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: colors.inkSecondary,
              }}
            >
              <Lock size={14} color={colors.success} />
              Session, roles et verification des actions sensibles
            </div>
            <Toggle
              label="Double confirmation des validations"
              description="Demande une confirmation avant validation finale."
              enabled={true}
            />
            <div
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Save size={14} color={colors.primary} />
              <span style={{ fontSize: 12, color: colors.inkSecondary }}>
                Sauvegarde auto des preferences toutes les 30 secondes.
              </span>
            </div>
          </div>
        </Card>
      </div>
    </PageFrame>
  );
};
