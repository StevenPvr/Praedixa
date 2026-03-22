import { CheckCircle } from "lucide-react";
import { Card } from "@praedixa/ui";
import type { UnreadCount } from "@/lib/inbox-helpers";

type UnreadMessagesCardProps = Readonly<{
  unread: UnreadCount;
}>;

export function UnreadMessagesCard({ unread }: UnreadMessagesCardProps) {
  const byOrg = Array.isArray(unread.byOrg) ? unread.byOrg : [];
  const hasOrgBreakdown = byOrg.length > 0;
  const total = Number.isFinite(unread.total)
    ? unread.total
    : byOrg.reduce((acc, org) => {
        const count = Number.isFinite(org.count) ? org.count : 0;
        return acc + count;
      }, 0);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-ink">
          Messages non lus
        </h2>
        <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-sm font-medium text-primary-700">
          {total}
        </span>
      </div>
      {hasOrgBreakdown ? (
        <div className="space-y-2">
          {byOrg.map((org) => (
            <a
              key={org.orgId}
              href={`/clients/${encodeURIComponent(org.orgId)}/messages`}
              className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-surface-sunken"
            >
              <span className="text-sm text-charcoal">{org.orgName}</span>
              <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink-secondary">
                {org.count}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-ink-placeholder">
          <CheckCircle className="h-4 w-4 text-success-500" />
          Aucun message en attente
        </div>
      )}
    </Card>
  );
}
