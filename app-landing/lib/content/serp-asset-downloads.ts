import {
  getSerpResourceBySlug,
  type SerpResourceEntry,
} from "./serp-resources-fr";
import { getSerpBriefBySlug } from "./serp-briefs-fr";

const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";
const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

export interface SerpAssetDownload {
  fileName: string;
  contentType: typeof CSV_CONTENT_TYPE | typeof MARKDOWN_CONTENT_TYPE;
  body: string;
}

function sanitizeFilePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function csvEscapeCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => csvEscapeCell(cell)).join(","))
    .join("\n");
}

function buildMarkdownAsset(entry: SerpResourceEntry): string {
  const brief = getSerpBriefBySlug(entry.slug);
  const outline = brief?.outlineH2 ?? [];
  const paa = brief?.paa ?? [];

  return [
    `# ${entry.asset.title}`,
    "",
    `Requete cible: ${entry.query}`,
    `Page source: /fr/ressources/${entry.slug}`,
    "",
    "## Objectif",
    entry.asset.description,
    "",
    "## Usage recommande",
    "1. Copier ce template dans votre rituel hebdomadaire Ops/DAF.",
    "2. Renseigner uniquement les champs a forte variabilite d'une semaine a l'autre.",
    "3. Tracer chaque arbitrage dans le decision log pour mesurer le resultat.",
    "",
    "## Checklist execution",
    "- Hypotheses explicites et datees",
    "- Criticite service qualifiee avant action",
    "- Cout attendu calcule avant arbitrage",
    "- Responsable et horizon de revue identifies",
    "",
    "## Sections recommandees",
    ...(outline.length > 0
      ? outline.map((item, index) => `${index + 1}. ${item}`)
      : ["1. Contexte", "2. Hypotheses", "3. Actions", "4. Mesure d'impact"]),
    "",
    "## Questions a couvrir (PAA)",
    ...(paa.length > 0 ? paa.map((item) => `- ${item}`) : ["- A completer"]),
    "",
    "## Tableau de suivi",
    "| Site | Risque | Option retenue | Cout estime | Impact service | Date revue | Owner |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    "| Site A |  |  |  |  |  |  |",
    "| Site B |  |  |  |  |  |  |",
    "",
    "## Decision log (copier-coller)",
    "| Date | Contexte | Options evaluees | Decision | Hypothese | Resultat observe |",
    "| --- | --- | --- | --- | --- | --- |",
    "|  |  |  |  |  |  |",
    "",
  ].join("\n");
}

function buildCalculatorCsv(entry: SerpResourceEntry): string {
  const rows: string[][] = [
    [
      "metric",
      "input_value",
      "unit",
      "impact_eur",
      "horizon_days",
      "owner",
      "notes",
    ],
    [
      "charge_prevue",
      "",
      "unites_jour",
      "",
      "14",
      "Ops",
      "Charge prevue a horizon court",
    ],
    [
      "capacite_reelle",
      "",
      "heures_utiles",
      "",
      "14",
      "Ops",
      "Capacite mobilisable avec contraintes",
    ],
    [
      "cout_hs",
      "",
      "eur_heure",
      "",
      "14",
      "Finance",
      "Cout total heure supplementaire",
    ],
    [
      "cout_interim",
      "",
      "eur_heure",
      "",
      "14",
      "Finance",
      "Cout total interim selon delai",
    ],
    [
      "penalites_sla",
      "",
      "eur",
      "",
      "14",
      "Ops",
      "Impact attendu si rupture de service",
    ],
    [
      "decision_retenue",
      "",
      "texte",
      "",
      "14",
      "Comite_Ops_DAF",
      entry.asset.title,
    ],
  ];

  return toCsv(rows);
}

function buildComparatifCsv(entry: SerpResourceEntry): string {
  const brief = getSerpBriefBySlug(entry.slug);
  const rows: string[][] = [
    [
      "categorie",
      "critere",
      "importance_1_5",
      "solution_a",
      "solution_b",
      "solution_c",
      "notes",
    ],
    [
      "Couverture_fonctionnelle",
      "Contraintes_competences",
      "5",
      "",
      "",
      "",
      "",
    ],
    ["Pilotage", "Arbitrage_cout_service", "5", "", "", "", ""],
    ["Gouvernance", "Traceabilite_decisions", "4", "", "", "", ""],
    ["Adoption", "Simplicite_rituel", "4", "", "", "", ""],
    ["Integration", "Qualite_export_data", "3", "", "", "", ""],
  ];

  if (brief?.paa[0]) {
    rows.push(["Question_achat", brief.paa[0], "3", "", "", "", ""]);
  }

  return toCsv(rows);
}

function buildAssetBody(entry: SerpResourceEntry): {
  extension: "md" | "csv";
  contentType: SerpAssetDownload["contentType"];
  body: string;
} {
  if (entry.asset.type === "calculateur") {
    return {
      extension: "csv",
      contentType: CSV_CONTENT_TYPE,
      body: buildCalculatorCsv(entry),
    };
  }

  if (entry.asset.type === "comparatif") {
    return {
      extension: "csv",
      contentType: CSV_CONTENT_TYPE,
      body: buildComparatifCsv(entry),
    };
  }

  return {
    extension: "md",
    contentType: MARKDOWN_CONTENT_TYPE,
    body: buildMarkdownAsset(entry),
  };
}

export function getSerpAssetDownloadBySlug(
  slug: string,
): SerpAssetDownload | undefined {
  const entry = getSerpResourceBySlug(slug);
  if (!entry) return undefined;

  const assetBody = buildAssetBody(entry);
  const fileName = [
    "praedixa",
    sanitizeFilePart(entry.slug),
    sanitizeFilePart(entry.asset.type),
  ]
    .filter(Boolean)
    .join("-");

  return {
    fileName: `${fileName}.${assetBody.extension}`,
    contentType: assetBody.contentType,
    body: assetBody.body,
  };
}

export function getSerpAssetDownloadHref(locale: string, slug: string): string {
  return `/${locale}/ressources/${slug}/asset`;
}
