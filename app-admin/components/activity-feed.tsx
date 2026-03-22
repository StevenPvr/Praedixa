import { Card } from "@praedixa/ui";
import { SeverityBadge } from "@/components/severity-badge";
import { ACTION_LABELS } from "@/lib/inbox-helpers";

interface AuditLogEntry {
  id: string;
  adminUserId: string;
  action: string;
  resourceType: string | null;
  severity: string;
  createdAt: string;
  targetOrgId: string | null;
}

export type { AuditLogEntry };

type ActivityFeedProps = Readonly<{
  entries: readonly AuditLogEntry[];
}>;

export function ActivityFeed({ entries }: ActivityFeedProps) {
  const recentEntries = entries.slice(0, 10);
  const content =
    recentEntries.length > 0 ? (
      <div className="space-y-1">
        {recentEntries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-sunken"
          >
            <SeverityBadge severity={entry.severity} />
            <span className="min-w-0 flex-1 truncate text-sm text-charcoal">
              {ACTION_LABELS[entry.action] ?? entry.action}
            </span>
            <span className="shrink-0 text-xs text-ink-placeholder">
              {new Date(entry.createdAt).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-ink-placeholder">Aucune activite recente</p>
    );

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-serif text-lg font-semibold text-ink">
        Activite recente
      </h2>
      {content}
    </Card>
  );
}
