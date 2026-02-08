"use client";

import { Shield, Download, Trash2, Eye, Clock } from "lucide-react";

interface RGPDAction {
  icon: typeof Shield;
  title: string;
  description: string;
  buttonLabel: string;
  variant: "default" | "danger";
}

const RGPD_ACTIONS: RGPDAction[] = [
  {
    icon: Eye,
    title: "Registre des traitements",
    description:
      "Consulter le registre des traitements de donnees personnelles conformement a l'article 30 du RGPD.",
    buttonLabel: "Consulter",
    variant: "default",
  },
  {
    icon: Download,
    title: "Export des donnees",
    description:
      "Generer un export complet des donnees personnelles d'une organisation (droit a la portabilite, article 20).",
    buttonLabel: "Exporter",
    variant: "default",
  },
  {
    icon: Trash2,
    title: "Suppression des donnees",
    description:
      "Supprimer definitivement toutes les donnees personnelles d'une organisation (droit a l'effacement, article 17).",
    buttonLabel: "Supprimer",
    variant: "danger",
  },
  {
    icon: Clock,
    title: "Politique de retention",
    description:
      "Configurer les delais de conservation des donnees par type (logs, audit, donnees metier).",
    buttonLabel: "Configurer",
    variant: "default",
  },
];

export default function RGPDPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">RGPD</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Conformite RGPD et gestion des donnees personnelles
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {RGPD_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <div
              key={action.title}
              className="rounded-card border border-gray-200 bg-card p-6 shadow-card"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                <Icon className="h-5 w-5 text-gray-500" />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-charcoal">
                {action.title}
              </h3>
              <p className="mb-4 text-sm text-gray-500">
                {action.description}
              </p>
              <button
                className={`inline-flex min-h-[44px] items-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  action.variant === "danger"
                    ? "border border-danger-500 text-danger-700 hover:bg-danger-50"
                    : "border border-gray-200 text-charcoal hover:bg-gray-50"
                }`}
              >
                {action.buttonLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
