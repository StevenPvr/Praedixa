/** Centralised French date formatters — eliminates 4 duplicated helpers. */

/** Format as "10 fevr." (day + short month). */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Format as "10 fevr. 2026" (day + short month + year). */
export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format as "10 fevr. 2026", or "-" if null. */
export function formatDateOrDash(value: string | null): string {
  if (!value) return "-";
  return formatDateFull(value);
}
