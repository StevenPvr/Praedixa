import type { DecisionType } from "@praedixa/shared-types";

/* ────────────────────────────────────────────── */
/*  DecisionType → French label mapping            */
/* ────────────────────────────────────────────── */

const typeLabel: Record<DecisionType, string> = {
  replacement: "Remplacement",
  redistribution: "Redistribution",
  postponement: "Report",
  overtime: "Heures sup",
  external: "Externe",
  training: "Formation",
  no_action: "Sans action",
};

/* ────────────────────────────────────────────── */
/*  Component                                      */
/* ────────────────────────────────────────────── */

interface DecisionTypeLabelProps {
  type: DecisionType;
}

export function DecisionTypeLabel({ type }: DecisionTypeLabelProps) {
  return <span className="text-sm text-gray-600">{typeLabel[type]}</span>;
}

/** Expose mapping for direct use in DataTable columns */
export { typeLabel };
