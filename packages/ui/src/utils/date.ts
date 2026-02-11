/**
 * Date formatting utilities shared across apps.
 */

/**
 * Formats a date string as a French relative time (e.g., "il y a 5min").
 *
 * @param dateStr - ISO date string, or null
 * @returns Human-readable relative time in French, or empty string if null
 */
export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Il y a ${diffD}j`;
}
